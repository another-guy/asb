import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import type { ServiceBusAdministrationClient } from '@azure/service-bus';

import { resolveContext } from '../../auth/resolve-context.js';
import { createAdminClient } from '../../sdk/admin-client.js';

export type TreeNode = {
  label: string;
  children: TreeNode[];
};

export function registerTreeCommand(parent: Command): void {
  parent
    .command('tree')
    .description('Render namespace entity hierarchy as a tree')
    .argument('[target]', 'Scope to a single topic: topics/<name>')
    .option(
      '--depth <n>',
      'How deep to render: 1=queues+topics, 2=+subscriptions, 3=+rules',
      '1',
    )
    .addHelpText(
      'after',
      `
Examples:
  $ asb tree
  $ asb tree --depth 2
  $ asb tree topics/orders
  $ asb tree topics/orders --depth 3`,
    )
    .action(async (target: string | undefined, opts: { depth: string }) => {
      const depth = parseInt(opts.depth, 10);
      if (isNaN(depth) || depth < 1 || depth > 3) {
        console.error(pc.red('error: --depth must be 1, 2, or 3'));
        process.exitCode = 1;
        return;
      }
      const spinner = ora('Loading…').start();
      try {
        const root = await buildTree(target, depth);
        spinner.stop();
        printNode(root);
      } catch (err: unknown) {
        spinner.stop();
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}

export function parseTarget(target: string): string {
  const match = /^topics\/(.+)$/.exec(target);
  if (!match) {
    throw new Error(`invalid target "${target}": expected topics/<name>`);
  }
  return match[1];
}

export async function buildTree(target: string | undefined, depth: number): Promise<TreeNode> {
  const { name, ctx } = await resolveContext();
  const client = createAdminClient(ctx);
  if (target !== undefined) {
    return buildTopicNode(client, parseTarget(target), depth);
  }
  return buildNamespaceNode(client, name, depth);
}

async function buildNamespaceNode(
  client: ServiceBusAdministrationClient,
  label: string,
  depth: number,
): Promise<TreeNode> {
  const [queues, topics] = await Promise.all([
    collect(client.listQueues()),
    collect(client.listTopics()),
  ]);

  const sections: TreeNode[] = [];

  if (queues.length > 0) {
    sections.push({
      label: 'queues',
      children: queues.map(q => ({ label: q.name, children: [] })),
    });
  }

  if (topics.length > 0) {
    const topicChildren =
      depth >= 2
        ? await Promise.all(topics.map(t => buildTopicNode(client, t.name, depth)))
        : topics.map(t => ({ label: t.name, children: [] }));

    sections.push({ label: 'topics', children: topicChildren });
  }

  return { label, children: sections };
}

async function buildTopicNode(
  client: ServiceBusAdministrationClient,
  topicName: string,
  depth: number,
): Promise<TreeNode> {
  if (depth < 2) {
    return { label: topicName, children: [] };
  }
  const subs = await collect(client.listSubscriptions(topicName));
  const subChildren =
    depth >= 3
      ? await Promise.all(
          subs.map(s => buildSubscriptionNode(client, topicName, s.subscriptionName)),
        )
      : subs.map(s => ({ label: s.subscriptionName, children: [] }));

  return { label: topicName, children: subChildren };
}

async function buildSubscriptionNode(
  client: ServiceBusAdministrationClient,
  topicName: string,
  subName: string,
): Promise<TreeNode> {
  const rules = await collect(client.listRules(topicName, subName));
  return {
    label: subName,
    children: rules.map(r => ({ label: r.name, children: [] })),
  };
}

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const item of iter) {
    results.push(item);
  }
  return results;
}

export function printNode(node: TreeNode): void {
  console.log(pc.bold(node.label));
  printChildren(node.children, '');
}

function printChildren(children: TreeNode[], prefix: string): void {
  for (let i = 0; i < children.length; i++) {
    const isLast = i === children.length - 1;
    const branch = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    console.log(pc.dim(prefix + branch) + children[i].label);
    printChildren(children[i].children, childPrefix);
  }
}
