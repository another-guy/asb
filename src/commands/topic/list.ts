import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import Table from 'cli-table3';
import type { TopicProperties, TopicRuntimeProperties } from '@azure/service-bus';

import { resolveContext } from '../../auth/resolve-context.js';
import { createAdminClient } from '../../sdk/admin-client.js';

export type TopicRow = [string, string, string, string];
export type TopicStatsRow = [string, string, string, string];

export function registerList(topic: Command): void {
  topic
    .command('list')
    .description('Enumerate all topics in the namespace')
    .option('--stats', 'Include live subscription count and size')
    .addHelpText('after', `
Examples:
  $ asb topic list
  $ asb topic list --stats`)
    .action(async (opts: { stats?: boolean }) => {
      const spinner = ora('Loading topics…').start();
      try {
        if (opts.stats) {
          const topics = await listTopicsStats();
          spinner.stop();
          printStats(topics);
        } else {
          const topics = await listTopics();
          spinner.stop();
          printTopics(topics);
        }
      } catch (err: unknown) {
        spinner.stop();
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}

export async function listTopics(contextName?: string): Promise<TopicProperties[]> {
  const { ctx } = await resolveContext(contextName);
  const client = createAdminClient(ctx);
  const results: TopicProperties[] = [];
  for await (const t of client.listTopics()) {
    results.push(t);
  }
  return results;
}

export async function listTopicsStats(contextName?: string): Promise<TopicRuntimeProperties[]> {
  const { ctx } = await resolveContext(contextName);
  const client = createAdminClient(ctx);
  const results: TopicRuntimeProperties[] = [];
  for await (const t of client.listTopicsRuntimeProperties()) {
    results.push(t);
  }
  return results;
}

function printTopics(topics: TopicProperties[]): void {
  if (topics.length === 0) {
    console.log('No topics found.');
    return;
  }
  const table = new Table({
    head: ['Name', 'Status', 'Max Size (MB)', 'Ordering'],
  });
  for (const row of toTopicRows(topics)) {
    table.push(row);
  }
  console.log(table.toString());
}

function printStats(topics: TopicRuntimeProperties[]): void {
  if (topics.length === 0) {
    console.log('No topics found.');
    return;
  }
  const table = new Table({
    head: ['Name', 'Subscriptions', 'Scheduled', 'Size (bytes)'],
  });
  for (const row of toTopicStatsRows(topics)) {
    table.push(row);
  }
  console.log(table.toString());
}

export function toTopicRows(topics: TopicProperties[]): TopicRow[] {
  return topics.map(t => [
    t.name,
    t.status,
    String(t.maxSizeInMegabytes),
    t.supportOrdering ? 'yes' : 'no',
  ]);
}

export function toTopicStatsRows(topics: TopicRuntimeProperties[]): TopicStatsRow[] {
  return topics.map(t => [
    t.name,
    t.subscriptionCount !== undefined ? String(t.subscriptionCount) : '-',
    String(t.scheduledMessageCount),
    t.sizeInBytes !== undefined ? String(t.sizeInBytes) : '-',
  ]);
}
