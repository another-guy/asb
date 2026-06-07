import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import type { RuleProperties, SqlRuleFilter, CorrelationRuleFilter } from '@azure/service-bus';

import { resolveContext } from '../../auth/resolve-context.js';
import { createAdminClient } from '../../sdk/admin-client.js';

export function registerGet(rule: Command): void {
  rule
    .command('get')
    .description('Show full configuration of a filter rule')
    .argument('<topic>', 'Topic name')
    .argument('<subscription>', 'Subscription name')
    .argument('<name>', 'Rule name')
    .addHelpText('after', `
Examples:
  $ asb rule get my-topic my-sub my-rule`)
    .action(async (topic: string, subscription: string, name: string) => {
      const spinner = ora('Loading rule…').start();
      try {
        const props = await ruleGet(topic, subscription, name);
        spinner.stop();
        printGet(props);
      } catch (err: unknown) {
        spinner.stop();
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}

export async function ruleGet(
  topicName: string,
  subscriptionName: string,
  ruleName: string,
  contextName?: string,
): Promise<RuleProperties> {
  const { ctx } = await resolveContext(contextName);
  const client = createAdminClient(ctx);
  return client.getRule(topicName, subscriptionName, ruleName);
}

function printGet(props: RuleProperties): void {
  const rows = toGetRows(props);
  const labelWidth = Math.max(...rows.map(r => r.label.length));
  for (const { label, value } of rows) {
    console.log(`${label.padEnd(labelWidth)}  ${value}`);
  }
}

type Row = { label: string; value: string };

export function toGetRows(props: RuleProperties): Row[] {
  const rows: Row[] = [{ label: 'Name', value: props.name }];

  if ('sqlExpression' in props.filter) {
    const f = props.filter as SqlRuleFilter;
    rows.push({ label: 'Filter Type', value: 'sql' });
    rows.push({ label: 'Filter SQL', value: f.sqlExpression });
    if (f.sqlParameters && Object.keys(f.sqlParameters).length > 0) {
      rows.push({ label: 'Filter Params', value: JSON.stringify(f.sqlParameters) });
    }
  } else {
    const f = props.filter as CorrelationRuleFilter;
    rows.push({ label: 'Filter Type', value: 'correlation' });
    if (f.correlationId) rows.push({ label: 'Correlation ID', value: f.correlationId });
    if (f.messageId) rows.push({ label: 'Message ID', value: f.messageId });
    if (f.to) rows.push({ label: 'To', value: f.to });
    if (f.replyTo) rows.push({ label: 'Reply To', value: f.replyTo });
    if (f.subject) rows.push({ label: 'Subject', value: f.subject });
    if (f.sessionId) rows.push({ label: 'Session ID', value: f.sessionId });
    if (f.replyToSessionId) rows.push({ label: 'Reply-To Session ID', value: f.replyToSessionId });
    if (f.contentType) rows.push({ label: 'Content Type', value: f.contentType });
    if (f.applicationProperties && Object.keys(f.applicationProperties).length > 0) {
      rows.push({ label: 'App Properties', value: JSON.stringify(f.applicationProperties) });
    }
  }

  if (props.action.sqlExpression) {
    rows.push({ label: 'Action SQL', value: props.action.sqlExpression });
    if (props.action.sqlParameters && Object.keys(props.action.sqlParameters).length > 0) {
      rows.push({ label: 'Action Params', value: JSON.stringify(props.action.sqlParameters) });
    }
  }

  return rows;
}
