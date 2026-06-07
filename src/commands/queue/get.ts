import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import type { QueueProperties } from '@azure/service-bus';

import { resolveContext } from '../../auth/resolve-context.js';
import { createAdminClient } from '../../sdk/admin-client.js';

export function registerGet(queue: Command): void {
  queue
    .command('get')
    .description('Show full configuration of a queue')
    .argument('<name>', 'Queue name')
    .addHelpText('after', `
Examples:
  $ asb queue get my-queue`)
    .action(async (name: string) => {
      const spinner = ora('Loading queue…').start();
      try {
        const props = await queueGet(name);
        spinner.stop();
        printGet(props);
      } catch (err: unknown) {
        spinner.stop();
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}

export async function queueGet(name: string, contextName?: string): Promise<QueueProperties> {
  const { ctx } = await resolveContext(contextName);
  const client = createAdminClient(ctx);
  return client.getQueue(name);
}

function printGet(props: QueueProperties): void {
  const rows = toGetRows(props);
  const labelWidth = Math.max(...rows.map(r => r.label.length));
  for (const { label, value } of rows) {
    console.log(`${label.padEnd(labelWidth)}  ${value}`);
  }
}

type Row = { label: string; value: string };

export function toGetRows(props: QueueProperties): Row[] {
  const rows: Row[] = [
    { label: 'Name', value: props.name },
    { label: 'Status', value: props.status },
    { label: 'Lock Duration', value: props.lockDuration },
    { label: 'Max Size (MB)', value: String(props.maxSizeInMegabytes) },
    { label: 'Max Delivery Count', value: String(props.maxDeliveryCount) },
    { label: 'TTL', value: props.defaultMessageTimeToLive },
    { label: 'Sessions', value: props.requiresSession ? 'yes' : 'no' },
    { label: 'Partitioned', value: props.enablePartitioning ? 'yes' : 'no' },
    { label: 'Dedup', value: props.requiresDuplicateDetection ? 'yes' : 'no' },
  ];
  if (props.requiresDuplicateDetection) {
    rows.push({ label: 'Dedup Window', value: props.duplicateDetectionHistoryTimeWindow });
  }
  rows.push({ label: 'Dead Letter on Expiry', value: props.deadLetteringOnMessageExpiration ? 'yes' : 'no' });
  rows.push({ label: 'Auto Delete Idle', value: props.autoDeleteOnIdle });
  if (props.forwardTo) {
    rows.push({ label: 'Forward To', value: props.forwardTo });
  }
  if (props.forwardDeadLetteredMessagesTo) {
    rows.push({ label: 'Forward DLQ To', value: props.forwardDeadLetteredMessagesTo });
  }
  return rows;
}
