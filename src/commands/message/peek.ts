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
  dlq?: boolean;
}

export type PeekTarget =
  | { type: 'queue'; name: string }
  | { type: 'subscription'; topicName: string; subscriptionName: string };

export type PeekRow = [string, string, string, string, string];

type PeekActionOpts = {
  queue?: string;
  topic?: string;
  subscription?: string;
  count?: string;
  fromSequence?: string;
  dlq?: boolean;
};

export function buildTarget(opts: { queue?: string; topic?: string; subscription?: string }): PeekTarget {
  if (opts.queue !== undefined) {
    if (opts.topic !== undefined || opts.subscription !== undefined) {
      throw new Error('--queue cannot be combined with --topic or --subscription');
    }
    return { type: 'queue', name: opts.queue };
  }
  if (opts.topic !== undefined && opts.subscription !== undefined) {
    return { type: 'subscription', topicName: opts.topic, subscriptionName: opts.subscription };
  }
  if (opts.topic !== undefined || opts.subscription !== undefined) {
    throw new Error('--topic and --subscription must both be provided together');
  }
  throw new Error('specify --queue <name> or --topic <name> --subscription <name>');
}

export function registerPeek(message: Command): void {
  message
    .command('peek')
    .description('Non-destructively inspect messages in a queue or subscription')
    .option('--queue <name>', 'Queue name')
    .option('--topic <name>', 'Topic name (requires --subscription)')
    .option('--subscription <name>', 'Subscription name (requires --topic)')
    .option('--count <n>', 'Number of messages to peek', '10')
    .option('--from-sequence <n>', 'Start peeking from this sequence number (inclusive)')
    .option('--dlq', 'Inspect the dead-letter sub-queue')
    .addHelpText('after', `
Examples:
  $ asb message peek --queue my-queue
  $ asb message peek --topic my-topic --subscription my-sub
  $ asb message peek --queue my-queue --count 25
  $ asb message peek --queue my-queue --from-sequence 100
  $ asb message peek --queue my-queue --dlq
  $ asb message peek --topic my-topic --subscription my-sub --dlq --count 5`)
    .action(async (opts: PeekActionOpts) => {
      let target: PeekTarget;
      try {
        target = buildTarget(opts);
      } catch (err: unknown) {
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
        return;
      }
      const spinner = ora('Peeking messages…').start();
      try {
        const peekOpts: PeekOptions = {
          count: opts.count !== undefined ? parseInt(opts.count, 10) : undefined,
          fromSequence: opts.fromSequence !== undefined ? parseInt(opts.fromSequence, 10) : undefined,
          dlq: opts.dlq,
        };
        const messages = target.type === 'queue'
          ? await peekQueue(target.name, peekOpts)
          : await peekSubscription(target.topicName, target.subscriptionName, peekOpts);
        spinner.stop();
        printPeek(messages);
      } catch (err: unknown) {
        spinner.stop();
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}

export async function peekQueue(
  queueName: string,
  opts: PeekOptions,
  contextName?: string,
): Promise<ServiceBusReceivedMessage[]> {
  const { ctx } = await resolveContext(contextName);
  const client = createDataClient(ctx);
  const receiver = client.createReceiver(queueName, opts.dlq ? { subQueueType: 'deadLetter' } : {});
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
  const receiver = client.createReceiver(topicName, subscriptionName, opts.dlq ? { subQueueType: 'deadLetter' } : {});
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

export function toPeekRows(messages: ServiceBusReceivedMessage[]): PeekRow[] {
  return messages.map(m => [
    m.sequenceNumber?.toString() ?? '-',
    String(m.messageId ?? ''),
    m.subject ?? '',
    m.enqueuedTimeUtc?.toISOString() ?? '',
    bodyPreview(m.body),
  ]);
}

function bodyPreview(body: unknown): string {
  if (body === null || body === undefined) return '';
  if (body instanceof Uint8Array) return `<binary ${body.byteLength}B>`;
  if (Buffer.isBuffer(body)) return `<binary ${body.length}B>`;
  const s = typeof body === 'string' ? body : JSON.stringify(body);
  return s.length > 80 ? s.slice(0, 79) + '…' : s;
}
