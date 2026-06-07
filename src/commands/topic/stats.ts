import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import type { TopicRuntimeProperties } from '@azure/service-bus';

import { resolveContext } from '../../auth/resolve-context.js';
import { createAdminClient } from '../../sdk/admin-client.js';

export async function topicStats(name: string, contextName?: string): Promise<TopicRuntimeProperties> {
  const { ctx } = await resolveContext(contextName);
  const client = createAdminClient(ctx);
  return client.getTopicRuntimeProperties(name);
}

type Row = { label: string; value: string };

export function toStatsRows(props: TopicRuntimeProperties): Row[] {
  const rows: Row[] = [
    { label: 'Name', value: props.name },
  ];
  if (props.subscriptionCount !== undefined) {
    rows.push({ label: 'Subscriptions', value: String(props.subscriptionCount) });
  }
  rows.push({ label: 'Scheduled', value: String(props.scheduledMessageCount) });
  if (props.sizeInBytes !== undefined) {
    rows.push({ label: 'Size (bytes)', value: String(props.sizeInBytes) });
  }
  rows.push(
    { label: 'Created', value: props.createdAt.toISOString() },
    { label: 'Modified', value: props.modifiedAt.toISOString() },
    { label: 'Accessed', value: props.accessedAt.toISOString() },
  );
  return rows;
}

function printStats(props: TopicRuntimeProperties): void {
  const rows = toStatsRows(props);
  const labelWidth = Math.max(...rows.map(r => r.label.length));
  for (const { label, value } of rows) {
    console.log(`${label.padEnd(labelWidth)}  ${value}`);
  }
}

export function registerStats(topic: Command): void {
  topic
    .command('stats')
    .description('Show live subscription count and size for a topic')
    .argument('<name>', 'Topic name')
    .addHelpText('after', `
Examples:
  $ asb topic stats my-topic`)
    .action(async (name: string) => {
      const spinner = ora('Loading topic stats…').start();
      try {
        const props = await topicStats(name);
        spinner.stop();
        printStats(props);
      } catch (err: unknown) {
        spinner.stop();
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}
