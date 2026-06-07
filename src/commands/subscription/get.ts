import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import type { SubscriptionProperties } from '@azure/service-bus';

import { resolveContext } from '../../auth/resolve-context.js';
import { createAdminClient } from '../../sdk/admin-client.js';

export async function subscriptionGet(
  topicName: string,
  subscriptionName: string,
  contextName?: string,
): Promise<SubscriptionProperties> {
  const { ctx } = await resolveContext(contextName);
  const client = createAdminClient(ctx);
  return client.getSubscription(topicName, subscriptionName);
}

type Row = { label: string; value: string };

export function toGetRows(props: SubscriptionProperties): Row[] {
  const rows: Row[] = [
    { label: 'Name', value: props.subscriptionName },
    { label: 'Topic', value: props.topicName },
    { label: 'Status', value: props.status },
    { label: 'Lock Duration', value: props.lockDuration },
    { label: 'Max Delivery Count', value: String(props.maxDeliveryCount) },
    { label: 'TTL', value: props.defaultMessageTimeToLive },
    { label: 'Sessions', value: props.requiresSession ? 'yes' : 'no' },
    { label: 'Dead Letter on Expiry', value: props.deadLetteringOnMessageExpiration ? 'yes' : 'no' },
    { label: 'Dead Letter on Filter Error', value: props.deadLetteringOnFilterEvaluationExceptions ? 'yes' : 'no' },
    { label: 'Auto Delete Idle', value: props.autoDeleteOnIdle },
  ];
  if (props.forwardTo) {
    rows.push({ label: 'Forward To', value: props.forwardTo });
  }
  if (props.forwardDeadLetteredMessagesTo) {
    rows.push({ label: 'Forward DLQ To', value: props.forwardDeadLetteredMessagesTo });
  }
  return rows;
}

function printGet(props: SubscriptionProperties): void {
  const rows = toGetRows(props);
  const labelWidth = Math.max(...rows.map(r => r.label.length));
  for (const { label, value } of rows) {
    console.log(`${label.padEnd(labelWidth)}  ${value}`);
  }
}

export function registerGet(subscription: Command): void {
  subscription
    .command('get')
    .description('Show full configuration of a subscription')
    .argument('<topic>', 'Topic name')
    .argument('<name>', 'Subscription name')
    .addHelpText('after', `
Examples:
  $ asb subscription get my-topic my-sub`)
    .action(async (topic: string, name: string) => {
      const spinner = ora('Loading subscription…').start();
      try {
        const props = await subscriptionGet(topic, name);
        spinner.stop();
        printGet(props);
      } catch (err: unknown) {
        spinner.stop();
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}
