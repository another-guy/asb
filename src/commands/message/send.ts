import { readFile } from 'node:fs/promises';

import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import type { ServiceBusMessage } from '@azure/service-bus';

import { resolveContext } from '../../auth/resolve-context.js';
import { createDataClient } from '../../sdk/data-client.js';

export type SendOptions = {
  body?: string;
  bodyFile?: string;
  contentType?: string;
  messageId?: string;
  correlationId?: string;
  sessionId?: string;
  subject?: string;
  replyTo?: string;
  ttl?: string;
  appProp: string[];
  count: string;
};

export function registerSend(message: Command): void {
  message
    .command('send')
    .description('Send one or more messages to a queue or topic')
    .argument('<target>', 'Queue name or topic name')
    .option('--body <str>', 'Message body (or pipe via stdin)')
    .option('--body-file <path>', 'Read body from file')
    .option('--content-type <type>', 'Content type (e.g. application/json)')
    .option('--message-id <id>', 'Message identifier')
    .option('--correlation-id <id>', 'Correlation identifier')
    .option('--session-id <id>', 'Session identifier')
    .option('--subject <label>', 'Application-defined subject label')
    .option('--reply-to <address>', 'Reply-to address')
    .option('--ttl <ms>', 'Time-to-live in milliseconds')
    .option(
      '--app-prop <key=value>',
      'Application property (repeatable)',
      (val: string, acc: string[]) => [...acc, val],
      [] as string[],
    )
    .option('--count <n>', 'Number of identical messages to send', '1')
    .addHelpText(
      'after',
      `
Examples:
  $ asb message send my-queue --body '{"event":"test"}' --content-type application/json
  $ asb message send my-topic --body hello --subject greeting --count 5
  $ asb message send my-queue --body-file ./payload.json --content-type application/json
  $ echo "hello" | asb message send my-queue
  $ asb message send my-queue --body ping --app-prop env=prod --app-prop region=eu`,
    )
    .action(async (target: string, opts: SendOptions) => {
      const count = parseInt(opts.count, 10);
      if (isNaN(count) || count < 1) {
        console.error(pc.red('error: --count must be a positive integer'));
        process.exitCode = 1;
        return;
      }
      const spinner = ora('Sending…').start();
      try {
        const body = await resolveBody(opts);
        const msg = buildMessage(body, opts);
        await sendMessages(target, msg, count);
        spinner.stop();
        console.log(`Sent ${count} message${count === 1 ? '' : 's'} to "${target}".`);
      } catch (err: unknown) {
        spinner.stop();
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}

async function resolveBody(opts: SendOptions): Promise<string> {
  if (opts.body !== undefined) return opts.body;
  if (opts.bodyFile !== undefined) return readFile(opts.bodyFile, 'utf-8');
  if (process.stdin.isTTY) {
    throw new Error('no body provided — use --body, --body-file, or pipe via stdin');
  }
  return readStdin();
}

export function buildMessage(body: string, opts: Pick<SendOptions, 'contentType' | 'messageId' | 'correlationId' | 'sessionId' | 'subject' | 'replyTo' | 'ttl' | 'appProp'>): ServiceBusMessage {
  const msg: ServiceBusMessage = { body };
  if (opts.contentType) msg.contentType = opts.contentType;
  if (opts.messageId) msg.messageId = opts.messageId;
  if (opts.correlationId) msg.correlationId = opts.correlationId;
  if (opts.sessionId) msg.sessionId = opts.sessionId;
  if (opts.subject) msg.subject = opts.subject;
  if (opts.replyTo) msg.replyTo = opts.replyTo;
  if (opts.ttl) msg.timeToLive = parseInt(opts.ttl, 10);
  if (opts.appProp.length > 0) msg.applicationProperties = parseAppProps(opts.appProp);
  return msg;
}

export function parseAppProps(props: string[]): Record<string, string> {
  return Object.fromEntries(
    props.map(p => {
      const eq = p.indexOf('=');
      if (eq === -1) throw new Error(`invalid --app-prop "${p}": expected key=value`);
      return [p.slice(0, eq), p.slice(eq + 1)];
    }),
  );
}

export async function sendMessages(
  target: string,
  message: ServiceBusMessage,
  count: number,
  contextName?: string,
): Promise<void> {
  const { ctx } = await resolveContext(contextName);
  const client = createDataClient(ctx);
  const sender = client.createSender(target);
  try {
    const payload =
      count === 1 ? message : Array.from({ length: count }, () => ({ ...message }));
    await sender.sendMessages(payload);
  } finally {
    await sender.close();
    await client.close();
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  return Buffer.concat(chunks).toString('utf-8');
}
