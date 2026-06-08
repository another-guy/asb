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

type MessageCounts = {
  activeMessageCount: number;
  deadLetterMessageCount: number;
  scheduledMessageCount?: number;
};

export function registerTreeCommand(parent: Command): void {
  parent
    .command('tree')
    .description('Render namespace entity hierarchy as a tree')
    .option('--topic <name>', 'Scope to a single topic')
    .option(
      '--depth <n>',
      'How deep to render: 1=queues+topics, 2=+subscriptions, 3=+rules',
      '1',
    )
    .option(
      '--stats',
      'Show live message counts (active, dlq, scheduled) next to each queue and subscription',
    )
    .addHelpText(
      'after',
      `
Examples:
  $ asb tree
  $ asb tree --depth 2
  $ asb tree --depth 2 --stats
  $ asb tree --topic orders
  $ asb tree --topic orders --depth 3
  $ asb tree --topic orders --depth 2 --stats`,
    )
    .action(async (opts: { topic?: string; depth: string; stats?: boolean }) => {
      const depth = parseInt(opts.depth, 10);
      if (isNaN(depth) || depth < 1 || depth > 3) {
        console.error(pc.red('error: --depth must be 1, 2, or 3'));
        process.exitCode = 1;
        return;
      }
      if (opts.stats) {
        try {
          await renderWithStats(opts.topic, depth);
        } catch (err: unknown) {
          console.error(pc.red(`error: ${(err as Error).message}`));
          process.exitCode = 1;
        }
      } else {
        const spinner = ora('Loading…').start();
        try {
          const root = await buildTree(opts.topic, depth);
          spinner.stop();
          printNode(root);
        } catch (err: unknown) {
          spinner.stop();
          console.error(pc.red(`error: ${(err as Error).message}`));
          process.exitCode = 1;
        }
      }
    });
}

export async function buildTree(topic: string | undefined, depth: number): Promise<TreeNode> {
  const { name, ctx } = await resolveContext();
  const client = createAdminClient(ctx);
  if (topic !== undefined) {
    return buildTopicNode(client, topic, depth);
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

async function renderWithStats(target: string | undefined, depth: number): Promise<void> {
  const { name, ctx } = await resolveContext();
  const client = createAdminClient(ctx);

  if (target !== undefined) {
    const topicName = target;
    console.log(pc.bold(topicName));
    if (depth >= 2) {
      await renderSubsWithStats(client, topicName, depth, '');
    }
    return;
  }

  const spinner = ora('Loading…').start();
  const [queues, queueRtProps, topics] = await Promise.all([
    collect(client.listQueues()),
    collect(client.listQueuesRuntimeProperties()),
    collect(client.listTopics()),
  ]);
  spinner.stop();

  const hasQueues = queues.length > 0;
  const hasTopics = topics.length > 0;

  console.log(pc.bold(name));

  if (hasQueues) {
    const isLast = !hasTopics;
    const branch = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : '│   ';
    console.log(pc.dim(branch) + 'queues');
    const statsMap = new Map(queueRtProps.map(s => [s.name, s]));
    for (let i = 0; i < queues.length; i++) {
      const qIsLast = i === queues.length - 1;
      const qBranch = qIsLast ? '└── ' : '├── ';
      console.log(pc.dim(childPrefix + qBranch) + queues[i].name + formatStats(statsMap.get(queues[i].name)));
    }
  }

  if (hasTopics) {
    console.log(pc.dim('└── ') + 'topics');
    for (let i = 0; i < topics.length; i++) {
      const tIsLast = i === topics.length - 1;
      const tBranch = tIsLast ? '└── ' : '├── ';
      const tChildPrefix = '    ' + (tIsLast ? '    ' : '│   ');
      console.log(pc.dim('    ' + tBranch) + topics[i].name);
      if (depth >= 2) {
        await renderSubsWithStats(client, topics[i].name, depth, tChildPrefix);
      }
    }
  }
}

async function renderSubsWithStats(
  client: ServiceBusAdministrationClient,
  topicName: string,
  depth: number,
  prefix: string,
): Promise<void> {
  const [subs, subRtProps] = await Promise.all([
    collect(client.listSubscriptions(topicName)),
    collect(client.listSubscriptionsRuntimeProperties(topicName)),
  ]);
  const statsMap = new Map(subRtProps.map(s => [s.subscriptionName, s]));

  let rulesMap: Map<string, string[]> | null = null;
  if (depth >= 3 && subs.length > 0) {
    const allRules = await Promise.all(
      subs.map(s => collect(client.listRules(topicName, s.subscriptionName))),
    );
    rulesMap = new Map(subs.map((s, idx) => [s.subscriptionName, allRules[idx].map(r => r.name)]));
  }

  for (let i = 0; i < subs.length; i++) {
    const isLast = i === subs.length - 1;
    const branch = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    console.log(pc.dim(prefix + branch) + subs[i].subscriptionName + formatStats(statsMap.get(subs[i].subscriptionName)));

    if (rulesMap !== null) {
      const rules = rulesMap.get(subs[i].subscriptionName) ?? [];
      for (let j = 0; j < rules.length; j++) {
        const rIsLast = j === rules.length - 1;
        const rBranch = rIsLast ? '└── ' : '├── ';
        console.log(pc.dim(childPrefix + rBranch) + rules[j]);
      }
    }
  }
}

export function formatStats(counts: MessageCounts | undefined): string {
  if (counts === undefined) return '';
  const { activeMessageCount: active, deadLetterMessageCount: dlq, scheduledMessageCount: sched } = counts;
  const activeStr = active > 0 ? pc.green(String(active)) : pc.dim('0');
  const parts: string[] = [activeStr];
  if (dlq > 0) parts.push(pc.red(`${dlq}dlq`));
  if (sched !== undefined && sched > 0) parts.push(pc.yellow(`${sched}sched`));
  return '  ' + parts.join('  ');
}
