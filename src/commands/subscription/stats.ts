import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import type { SubscriptionRuntimeProperties } from '@azure/service-bus';

import { resolveContext } from '../../auth/resolve-context.js';
import { createAdminClient } from '../../sdk/admin-client.js';

export async function subscriptionStats(
  topicName: string,
  subscriptionName: string,
  contextName?: string,
): Promise<SubscriptionRuntimeProperties> {
  const { ctx } = await resolveContext(contextName);
  const client = createAdminClient(ctx);
  return client.getSubscriptionRuntimeProperties(topicName, subscriptionName);
}

type Row = { label: string; value: string };

export function toStatsRows(props: SubscriptionRuntimeProperties): Row[] {
  return [
    { label: 'Name', value: props.subscriptionName },
    { label: 'Topic', value: props.topicName },
    { label: 'Active', value: String(props.activeMessageCount) },
    { label: 'Dead Letter', value: String(props.deadLetterMessageCount) },
    { label: 'Transfer', value: String(props.transferMessageCount) },
    { label: 'Transfer DL', value: String(props.transferDeadLetterMessageCount) },
    { label: 'Total', value: String(props.totalMessageCount) },
    { label: 'Created', value: props.createdAt.toISOString() },
    { label: 'Modified', value: props.modifiedAt.toISOString() },
    { label: 'Accessed', value: props.accessedAt.toISOString() },
  ];
}

function printStats(props: SubscriptionRuntimeProperties): void {
  const rows = toStatsRows(props);
  const labelWidth = Math.max(...rows.map(r => r.label.length));
  for (const { label, value } of rows) {
    console.log(`${label.padEnd(labelWidth)}  ${value}`);
  }
}

export function registerStats(subscription: Command): void {
  subscription
    .command('stats')
    .description('Show live message counts for a subscription')
    .argument('<topic>', 'Topic name')
    .argument('<name>', 'Subscription name')
    .addHelpText('after', `
Examples:
  $ asb subscription stats my-topic my-sub`)
    .action(async (topic: string, name: string) => {
      const spinner = ora('Loading subscription stats…').start();
      try {
        const props = await subscriptionStats(topic, name);
        spinner.stop();
        printStats(props);
      } catch (err: unknown) {
        spinner.stop();
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}
