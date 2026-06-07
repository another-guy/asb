import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import Table from 'cli-table3';
import type { QueueProperties, QueueRuntimeProperties } from '@azure/service-bus';

import { resolveContext } from '../../auth/resolve-context.js';
import { createAdminClient } from '../../sdk/admin-client.js';

export type QueueRow = [string, string, string, string, string];
export type StatsRow = [string, string, string, string, string];

export function registerList(queue: Command): void {
  queue
    .command('list')
    .description('Enumerate all queues in the namespace')
    .option('--stats', 'Include live message counts')
    .addHelpText('after', `
Examples:
  $ asb queue list
  $ asb queue list --stats`)
    .action(async (opts: { stats?: boolean }) => {
      const spinner = ora('Loading queues…').start();
      try {
        if (opts.stats) {
          const queues = await listQueuesStats();
          spinner.stop();
          printStats(queues);
        } else {
          const queues = await listQueues();
          spinner.stop();
          printQueues(queues);
        }
      } catch (err: unknown) {
        spinner.stop();
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}

export async function listQueues(contextName?: string): Promise<QueueProperties[]> {
  const { ctx } = await resolveContext(contextName);
  const client = createAdminClient(ctx);
  const results: QueueProperties[] = [];
  for await (const q of client.listQueues()) {
    results.push(q);
  }
  return results;
}

export async function listQueuesStats(contextName?: string): Promise<QueueRuntimeProperties[]> {
  const { ctx } = await resolveContext(contextName);
  const client = createAdminClient(ctx);
  const results: QueueRuntimeProperties[] = [];
  for await (const q of client.listQueuesRuntimeProperties()) {
    results.push(q);
  }
  return results;
}

function printQueues(queues: QueueProperties[]): void {
  if (queues.length === 0) {
    console.log('No queues found.');
    return;
  }
  const table = new Table({
    head: ['Name', 'Status', 'Lock Duration', 'Max Size (MB)', 'Max Delivery Count'],
  });
  for (const row of toQueueRows(queues)) {
    table.push(row);
  }
  console.log(table.toString());
}

function printStats(queues: QueueRuntimeProperties[]): void {
  if (queues.length === 0) {
    console.log('No queues found.');
    return;
  }
  const table = new Table({
    head: ['Name', 'Active', 'Dead Letter', 'Scheduled', 'Size (bytes)'],
  });
  for (const row of toStatsRows(queues)) {
    table.push(row);
  }
  console.log(table.toString());
}

export function toQueueRows(queues: QueueProperties[]): QueueRow[] {
  return queues.map(q => [
    q.name,
    q.status,
    q.lockDuration,
    String(q.maxSizeInMegabytes),
    String(q.maxDeliveryCount),
  ]);
}

export function toStatsRows(queues: QueueRuntimeProperties[]): StatsRow[] {
  return queues.map(q => [
    q.name,
    String(q.activeMessageCount),
    String(q.deadLetterMessageCount),
    String(q.scheduledMessageCount),
    q.sizeInBytes !== undefined ? String(q.sizeInBytes) : '-',
  ]);
}
