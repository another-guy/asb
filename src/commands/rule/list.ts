import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import Table from 'cli-table3';
import type { RuleProperties, SqlRuleFilter, CorrelationRuleFilter } from '@azure/service-bus';

import { resolveContext } from '../../auth/resolve-context.js';
import { createAdminClient } from '../../sdk/admin-client.js';

export async function listRules(
  topicName: string,
  subscriptionName: string,
  contextName?: string,
): Promise<RuleProperties[]> {
  const { ctx } = await resolveContext(contextName);
  const client = createAdminClient(ctx);
  const results: RuleProperties[] = [];
  for await (const r of client.listRules(topicName, subscriptionName)) {
    results.push(r);
  }
  return results;
}

export type RuleRow = [string, string, string, string];

function filterType(filter: SqlRuleFilter | CorrelationRuleFilter): string {
  return 'sqlExpression' in filter ? 'sql' : 'correlation';
}

function filterExpr(filter: SqlRuleFilter | CorrelationRuleFilter): string {
  if ('sqlExpression' in filter) {
    return (filter as SqlRuleFilter).sqlExpression;
  }
  const cf = filter as CorrelationRuleFilter;
  const parts: string[] = [];
  if (cf.correlationId) parts.push(`correlationId=${cf.correlationId}`);
  if (cf.messageId) parts.push(`messageId=${cf.messageId}`);
  if (cf.to) parts.push(`to=${cf.to}`);
  if (cf.replyTo) parts.push(`replyTo=${cf.replyTo}`);
  if (cf.subject) parts.push(`subject=${cf.subject}`);
  if (cf.sessionId) parts.push(`sessionId=${cf.sessionId}`);
  if (cf.replyToSessionId) parts.push(`replyToSessionId=${cf.replyToSessionId}`);
  if (cf.contentType) parts.push(`contentType=${cf.contentType}`);
  if (cf.applicationProperties && Object.keys(cf.applicationProperties).length > 0) {
    parts.push(`appProps=${Object.keys(cf.applicationProperties).join(',')}`);
  }
  return parts.length > 0 ? parts.join(', ') : '(any)';
}

export function toRuleRows(rules: RuleProperties[]): RuleRow[] {
  return rules.map(r => [
    r.name,
    filterType(r.filter),
    filterExpr(r.filter),
    r.action.sqlExpression ?? '-',
  ]);
}

function printRules(rules: RuleProperties[]): void {
  if (rules.length === 0) {
    console.log('No rules found.');
    return;
  }
  const table = new Table({
    head: ['Name', 'Filter Type', 'Filter', 'Action'],
  });
  for (const row of toRuleRows(rules)) {
    table.push(row);
  }
  console.log(table.toString());
}

export function registerList(rule: Command): void {
  rule
    .command('list')
    .description('Enumerate all filter rules for a subscription')
    .argument('<topic>', 'Topic name')
    .argument('<subscription>', 'Subscription name')
    .addHelpText('after', `
Examples:
  $ asb rule list my-topic my-sub`)
    .action(async (topic: string, subscription: string) => {
      const spinner = ora('Loading rules…').start();
      try {
        const rules = await listRules(topic, subscription);
        spinner.stop();
        printRules(rules);
      } catch (err: unknown) {
        spinner.stop();
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}
