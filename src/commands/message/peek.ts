import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import Table from 'cli-table3';
import Long from 'long';
import type { ServiceBusReceivedMessage } from '@azure/service-bus';

import { resolveContext } from '../../auth/resolve-context.js';
import { createDataClient } from '../../sdk/data-client.js';

export interface PeekOptions {
  count?: number;
  fromSequence?: number;
}

export type PeekTarget =
  | { type: 'queue'; name: string }
  | { type: 'subscription'; topicName: string; subscriptionName: string };

export function parseTarget(target: string): PeekTarget {
  const slash = target.indexOf('/');
  if (slash === -1) return { type: 'queue', name: target };
  return {
    type: 'subscription',
    topicName: target.slice(0, slash),
    subscriptionName: target.slice(slash + 1),
  };
}

export async function peekQueue(
  queueName: string,
  opts: PeekOptions,
  contextName?: string,
): Promise<ServiceBusReceivedMessage[]> {
  const { ctx } = await resolveContext(contextName);
  const client = createDataClient(ctx);
  const receiver = client.createReceiver(queueName);
  try {
    return await receiver.peekMessages(opts.count ?? 10, {
      fromSequenceNumber: opts.fromSequence !== undefined
        ? Long.fromNumber(opts.fromSequence)
        : undefined,
    });
  } finally {
    await receiver.close();
    await client.close();
  }
}

export async function peekSubscription(
  topicName: string,
  subscriptionName: string,
  opts: PeekOptions,
  contextName?: string,
): Promise<ServiceBusReceivedMessage[]> {
  const { ctx } = await resolveContext(contextName);
  const client = createDataClient(ctx);
  const receiver = client.createReceiver(topicName, subscriptionName);
  try {
    return await receiver.peekMessages(opts.count ?? 10, {
      fromSequenceNumber: opts.fromSequence !== undefined
        ? Long.fromNumber(opts.fromSequence)
        : undefined,
    });
  } finally {
    await receiver.close();
    await client.close();
  }
}

export type PeekRow = [string, string, string, string, string];

function bodyPreview(body: unknown): string {
  if (body === null || body === undefined) return '';
  if (body instanceof Uint8Array) return `<binary ${body.byteLength}B>`;
  if (Buffer.isBuffer(body)) return `<binary ${body.length}B>`;
  const s = typeof body === 'string' ? body : JSON.stringify(body);
  return s.length > 80 ? s.slice(0, 79) + '…' : s;
}

export function toPeekRows(messages: ServiceBusReceivedMessage[]): PeekRow[] {
  return messages.map(m => [
    m.sequenceNumber?.toString() ?? '-',
    String(m.messageId ?? ''),
    m.subject ?? '',
    m.enqueuedTimeUtc?.toISOString() ?? '',
    bodyPreview(m.body),
  ]);
}

function printPeek(messages: ServiceBusReceivedMessage[]): void {
  if (messages.length === 0) {
    console.log('No messages found.');
    return;
  }
  const table = new Table({
    head: ['Seq#', 'Message ID', 'Subject', 'Enqueued At', 'Body'],
  });
  for (const row of toPeekRows(messages)) {
    table.push(row);
  }
  console.log(table.toString());
}

export function registerPeek(message: Command): void {
  message
    .command('peek')
    .description('Non-destructively inspect messages in a queue or subscription')
    .argument('<target>', 'Queue name, or topic/subscription (e.g. my-topic/my-sub)')
    .option('--count <n>', 'Number of messages to peek', '10')
    .option('--from-sequence <n>', 'Start peeking from this sequence number (inclusive)')
    .addHelpText('after', `
Examples:
  $ asb message peek my-queue
  $ asb message peek my-topic/my-sub
  $ asb message peek my-queue --count 25
  $ asb message peek my-queue --from-sequence 100`)
    .action(async (target: string, opts: { count?: string; fromSequence?: string }) => {
      const spinner = ora('Peeking messages…').start();
      try {
        const peekOpts: PeekOptions = {
          count: opts.count !== undefined ? parseInt(opts.count, 10) : undefined,
          fromSequence: opts.fromSequence !== undefined ? parseInt(opts.fromSequence, 10) : undefined,
        };
        const parsed = parseTarget(target);
        const messages = parsed.type === 'queue'
          ? await peekQueue(parsed.name, peekOpts)
          : await peekSubscription(parsed.topicName, parsed.subscriptionName, peekOpts);
        spinner.stop();
        printPeek(messages);
      } catch (err: unknown) {
        spinner.stop();
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}
