import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import Table from 'cli-table3';
import type { SubscriptionProperties, SubscriptionRuntimeProperties } from '@azure/service-bus';

import { resolveContext } from '../../auth/resolve-context.js';
import { createAdminClient } from '../../sdk/admin-client.js';

export async function listSubscriptions(
  topicName: string,
  contextName?: string,
): Promise<SubscriptionProperties[]> {
  const { ctx } = await resolveContext(contextName);
  const client = createAdminClient(ctx);
  const results: SubscriptionProperties[] = [];
  for await (const s of client.listSubscriptions(topicName)) {
    results.push(s);
  }
  return results;
}

export async function listSubscriptionsStats(
  topicName: string,
  contextName?: string,
): Promise<SubscriptionRuntimeProperties[]> {
  const { ctx } = await resolveContext(contextName);
  const client = createAdminClient(ctx);
  const results: SubscriptionRuntimeProperties[] = [];
  for await (const s of client.listSubscriptionsRuntimeProperties(topicName)) {
    results.push(s);
  }
  return results;
}

export type SubscriptionRow = [string, string, string, string, string];
export type SubscriptionStatsRow = [string, string, string, string];

export function toSubscriptionRows(subs: SubscriptionProperties[]): SubscriptionRow[] {
  return subs.map(s => [
    s.subscriptionName,
    s.status,
    s.lockDuration,
    String(s.maxDeliveryCount),
    s.requiresSession ? 'yes' : 'no',
  ]);
}

export function toSubscriptionStatsRows(subs: SubscriptionRuntimeProperties[]): SubscriptionStatsRow[] {
  return subs.map(s => [
    s.subscriptionName,
    String(s.activeMessageCount),
    String(s.deadLetterMessageCount),
    String(s.totalMessageCount),
  ]);
}

function printSubscriptions(subs: SubscriptionProperties[]): void {
  if (subs.length === 0) {
    console.log('No subscriptions found.');
    return;
  }
  const table = new Table({
    head: ['Name', 'Status', 'Lock Duration', 'Max Delivery Count', 'Sessions'],
  });
  for (const row of toSubscriptionRows(subs)) {
    table.push(row);
  }
  console.log(table.toString());
}

function printStats(subs: SubscriptionRuntimeProperties[]): void {
  if (subs.length === 0) {
    console.log('No subscriptions found.');
    return;
  }
  const table = new Table({
    head: ['Name', 'Active', 'Dead Letter', 'Total'],
  });
  for (const row of toSubscriptionStatsRows(subs)) {
    table.push(row);
  }
  console.log(table.toString());
}

export function registerList(subscription: Command): void {
  subscription
    .command('list')
    .description('Enumerate all subscriptions for a topic')
    .argument('<topic>', 'Topic name')
    .option('--stats', 'Include live message counts')
    .addHelpText('after', `
Examples:
  $ asb subscription list my-topic
  $ asb subscription list my-topic --stats`)
    .action(async (topic: string, opts: { stats?: boolean }) => {
      const spinner = ora('Loading subscriptions…').start();
      try {
        if (opts.stats) {
          const subs = await listSubscriptionsStats(topic);
          spinner.stop();
          printStats(subs);
        } else {
          const subs = await listSubscriptions(topic);
          spinner.stop();
          printSubscriptions(subs);
        }
      } catch (err: unknown) {
        spinner.stop();
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}
