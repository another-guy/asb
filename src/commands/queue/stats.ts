import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import type { QueueRuntimeProperties } from '@azure/service-bus';

import { resolveContext } from '../../auth/resolve-context.js';
import { createAdminClient } from '../../sdk/admin-client.js';

export function registerStats(queue: Command): void {
  queue
    .command('stats')
    .description('Show live message counts for a queue')
    .argument('<name>', 'Queue name')
    .addHelpText('after', `
Examples:
  $ asb queue stats my-queue`)
    .action(async (name: string) => {
      const spinner = ora('Loading queue stats…').start();
      try {
        const props = await queueStats(name);
        spinner.stop();
        printStats(props);
      } catch (err: unknown) {
        spinner.stop();
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}

export async function queueStats(name: string, contextName?: string): Promise<QueueRuntimeProperties> {
  const { ctx } = await resolveContext(contextName);
  const client = createAdminClient(ctx);
  return client.getQueueRuntimeProperties(name);
}

function printStats(props: QueueRuntimeProperties): void {
  const rows = toStatsRows(props);
  const labelWidth = Math.max(...rows.map(r => r.label.length));
  for (const { label, value } of rows) {
    console.log(`${label.padEnd(labelWidth)}  ${value}`);
  }
}

type Row = { label: string; value: string };

export function toStatsRows(props: QueueRuntimeProperties): Row[] {
  const rows: Row[] = [
    { label: 'Name', value: props.name },
    { label: 'Active', value: String(props.activeMessageCount) },
    { label: 'Dead Letter', value: String(props.deadLetterMessageCount) },
    { label: 'Scheduled', value: String(props.scheduledMessageCount) },
    { label: 'Transfer', value: String(props.transferMessageCount) },
    { label: 'Transfer DL', value: String(props.transferDeadLetterMessageCount) },
  ];
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
