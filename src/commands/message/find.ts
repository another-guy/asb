import { Script, runInNewContext } from 'node:vm';

import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import Table from 'cli-table3';
import Long from 'long';
import type { ServiceBusReceivedMessage } from '@azure/service-bus';

import { resolveContext } from '../../auth/resolve-context.js';
import { createDataClient } from '../../sdk/data-client.js';
import { buildTarget, type PeekTarget } from './peek.js';

const BATCH_SIZE = 100;
const DEFAULT_MAX_SCAN = 500;
const DEFAULT_LIMIT = 100;
const DEFAULT_COLUMNS = ['sequenceNumber', 'messageId', 'subject', 'enqueuedTimeUtc', 'body'];

export type FindOptions = {
  queue?: string;
  topic?: string;
  subscription?: string;
  filter?: string;
  limit: string;
  maxScan: string;
  fromSequence?: string;
  output: string;
  columns?: string;
  dlq?: boolean;
};

type ScanParams = {
  filter?: string;
  limit: number;
  maxScan: number;
  fromSequence?: number;
  dlq?: boolean;
};

type ScanResult = {
  matches: ServiceBusReceivedMessage[];
  scanned: number;
  ceilingReached: boolean;
};

export function registerFind(message: Command): void {
  message
    .command('find')
    .description('Scan a queue or subscription for messages matching a JS predicate')
    .option('--queue <name>', 'Queue name')
    .option('--topic <name>', 'Topic name (requires --subscription)')
    .option('--subscription <name>', 'Subscription name (requires --topic)')
    .option('--filter <js-expr>', 'JS predicate evaluated against msg (body pre-parsed when JSON)')
    .option('--limit <n>', 'Max matching messages to return (output ceiling)', String(DEFAULT_LIMIT))
    .option(
      '--max-scan <n|all>',
      `Max messages to peek in total regardless of matches (safety ceiling, default ${DEFAULT_MAX_SCAN}; use "all" to scan without limit)`,
      String(DEFAULT_MAX_SCAN),
    )
    .option('--from-sequence <n>', 'Start peeking from this sequence number')
    .option('--output <format>', 'Output format: table, json, ndjson, csv', 'table')
    .option(
      '--columns <fields>',
      `Comma-separated fields for table/csv output (default: ${DEFAULT_COLUMNS.join(',')})`,
    )
    .option('--dlq', 'Scan the dead-letter sub-queue')
    .addHelpText(
      'after',
      `
Examples:
  $ asb message find --queue my-queue
  $ asb message find --queue my-queue --filter 'msg.body.type === "error"' --limit 10 --max-scan 500
  $ asb message find --topic my-topic --subscription my-sub --filter 'msg.subject === "order"' --output json
  $ asb message find --queue my-queue --filter 'msg.applicationProperties.env === "prod"' --output csv --columns sequenceNumber,messageId,body
  $ asb message find --queue my-queue --filter 'msg.body.amount > 100' --max-scan all
  $ asb message find --queue my-queue --dlq --output ndjson`,
    )
    .action(async (opts: FindOptions) => {
      let target: PeekTarget;
      try {
        target = buildTarget(opts);
      } catch (err: unknown) {
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
        return;
      }
      const limit = parseInt(opts.limit, 10);
      if (isNaN(limit) || limit < 1) {
        console.error(pc.red('error: --limit must be a positive integer'));
        process.exitCode = 1;
        return;
      }
      const maxScan = parseMaxScan(opts.maxScan);
      if (maxScan === null) {
        console.error(pc.red('error: --max-scan must be a positive integer or "all"'));
        process.exitCode = 1;
        return;
      }
      if (opts.filter !== undefined) {
        try {
          new Script(opts.filter);
        } catch (err: unknown) {
          console.error(pc.red(`error: invalid --filter expression: ${(err as Error).message}`));
          process.exitCode = 1;
          return;
        }
      }
      const columns = opts.columns
        ? opts.columns.split(',').map(c => c.trim())
        : DEFAULT_COLUMNS;
      const spinner = ora('Scanning…').start();
      try {
        const { matches, scanned, ceilingReached } = await scanMessages(target, {
          filter: opts.filter,
          limit,
          maxScan,
          fromSequence: opts.fromSequence !== undefined
            ? parseInt(opts.fromSequence, 10)
            : undefined,
          dlq: opts.dlq,
        });
        spinner.stop();
        console.error(
          pc.dim(
            `Scanned ${scanned} message${scanned === 1 ? '' : 's'}, ` +
            `found ${matches.length} match${matches.length === 1 ? '' : 'es'}.`,
          ),
        );
        if (ceilingReached && matches.length < limit) {
          console.error(
            pc.yellow(
              `warning: scan ceiling reached (${maxScan}). Use --max-scan all to scan everything.`,
            ),
          );
        }
        printResults(matches, opts.output, columns);
      } catch (err: unknown) {
        spinner.stop();
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}

async function scanMessages(
  target: PeekTarget,
  params: ScanParams,
  contextName?: string,
): Promise<ScanResult> {
  const { ctx } = await resolveContext(contextName);
  const client = createDataClient(ctx);
  const receiver =
    target.type === 'queue'
      ? client.createReceiver(target.name, params.dlq ? { subQueueType: 'deadLetter' } : {})
      : client.createReceiver(
          target.topicName,
          target.subscriptionName,
          params.dlq ? { subQueueType: 'deadLetter' } : {},
        );
  const matches: ServiceBusReceivedMessage[] = [];
  let scanned = 0;
  let cursor: Long | undefined =
    params.fromSequence !== undefined ? Long.fromNumber(params.fromSequence) : undefined;
  try {
    while (matches.length < params.limit && scanned < params.maxScan) {
      const batchSize = Math.min(BATCH_SIZE, params.maxScan - scanned);
      const batch = await receiver.peekMessages(batchSize, { fromSequenceNumber: cursor });
      if (batch.length === 0) break;
      scanned += batch.length;
      for (const msg of batch) {
        const filterCtx = prepareMsgForFilter(msg);
        if (params.filter === undefined || evaluatePredicate(params.filter, filterCtx)) {
          matches.push(msg);
          if (matches.length >= params.limit) break;
        }
      }
      cursor = (batch[batch.length - 1].sequenceNumber as Long).add(1);
    }
  } finally {
    await receiver.close();
    await client.close();
  }
  return { matches, scanned, ceilingReached: scanned >= params.maxScan };
}

function printResults(
  messages: ServiceBusReceivedMessage[],
  format: string,
  columns: string[],
): void {
  if (format === 'table' && messages.length === 0) {
    console.log('No matching messages found.');
    return;
  }
  switch (format) {
    case 'table': {
      const table = new Table({ head: columns });
      for (const msg of messages) {
        const serialized = serializeMessage(msg);
        table.push(
          columns.map(col => {
            const val = getField(serialized, col);
            return col === 'body' ? truncate(val, 80) : val;
          }),
        );
      }
      console.log(table.toString());
      break;
    }
    case 'json':
      console.log(JSON.stringify(messages.map(serializeMessage), null, 2));
      break;
    case 'ndjson':
      for (const msg of messages) {
        console.log(JSON.stringify(serializeMessage(msg)));
      }
      break;
    case 'csv': {
      console.log(columns.join(','));
      for (const msg of messages) {
        const serialized = serializeMessage(msg);
        console.log(columns.map(col => csvEscape(getField(serialized, col))).join(','));
      }
      break;
    }
  }
}

export function prepareMsgForFilter(msg: ServiceBusReceivedMessage): Record<string, unknown> {
  let body: unknown = msg.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { /* leave as string */ }
  } else if (Buffer.isBuffer(body)) {
    const str = body.toString('utf-8');
    try { body = JSON.parse(str); } catch { body = str; }
  }
  return {
    sequenceNumber: msg.sequenceNumber?.toString(),
    enqueuedSequenceNumber: msg.enqueuedSequenceNumber?.toString(),
    messageId: msg.messageId,
    correlationId: msg.correlationId,
    sessionId: msg.sessionId,
    partitionKey: msg.partitionKey,
    subject: msg.subject,
    to: msg.to,
    replyTo: msg.replyTo,
    replyToSessionId: msg.replyToSessionId,
    contentType: msg.contentType,
    enqueuedTimeUtc: msg.enqueuedTimeUtc,
    scheduledEnqueueTimeUtc: msg.scheduledEnqueueTimeUtc,
    expiresAtUtc: msg.expiresAtUtc,
    lockedUntilUtc: msg.lockedUntilUtc,
    lockToken: msg.lockToken,
    timeToLive: msg.timeToLive,
    deliveryCount: msg.deliveryCount,
    state: msg.state,
    deadLetterSource: msg.deadLetterSource,
    deadLetterReason: msg.deadLetterReason,
    deadLetterErrorDescription: msg.deadLetterErrorDescription,
    applicationProperties: msg.applicationProperties ?? {},
    body,
  };
}

export function serializeMessage(msg: ServiceBusReceivedMessage): Record<string, unknown> {
  let body: unknown = msg.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { /* leave as string */ }
  } else if (Buffer.isBuffer(body)) {
    const str = body.toString('utf-8');
    try { body = JSON.parse(str); } catch { body = str; }
  }
  return {
    sequenceNumber: msg.sequenceNumber?.toString(),
    enqueuedSequenceNumber: msg.enqueuedSequenceNumber?.toString(),
    messageId: msg.messageId,
    correlationId: msg.correlationId,
    sessionId: msg.sessionId,
    partitionKey: msg.partitionKey,
    subject: msg.subject,
    to: msg.to,
    replyTo: msg.replyTo,
    replyToSessionId: msg.replyToSessionId,
    contentType: msg.contentType,
    enqueuedTimeUtc: msg.enqueuedTimeUtc?.toISOString(),
    scheduledEnqueueTimeUtc: msg.scheduledEnqueueTimeUtc?.toISOString(),
    expiresAtUtc: msg.expiresAtUtc?.toISOString(),
    lockedUntilUtc: msg.lockedUntilUtc?.toISOString(),
    lockToken: msg.lockToken,
    timeToLive: msg.timeToLive,
    deliveryCount: msg.deliveryCount,
    state: msg.state,
    deadLetterSource: msg.deadLetterSource,
    deadLetterReason: msg.deadLetterReason,
    deadLetterErrorDescription: msg.deadLetterErrorDescription,
    applicationProperties: msg.applicationProperties,
    body,
  };
}

export function evaluatePredicate(expr: string, msg: unknown): boolean {
  try {
    return Boolean(runInNewContext(expr, { msg }));
  } catch {
    return false;
  }
}

export function parseMaxScan(value: string): number | null {
  if (value === 'all') return Infinity;
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1) return null;
  return n;
}

export function getField(serialized: Record<string, unknown>, field: string): string {
  const parts = field.split('.');
  let current: unknown = serialized;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return '';
    current = (current as Record<string, unknown>)[part];
  }
  if (current === null || current === undefined) return '';
  if (typeof current === 'object') return JSON.stringify(current);
  return String(current);
}

export function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
