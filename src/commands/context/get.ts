import { Command } from 'commander';
import pc from 'picocolors';

import { loadConfig } from '../../auth/config-file.js';
import type { AsbContext } from '../../auth/types.js';

export type ContextDetail = {
  name: string;
  active: boolean;
  type: 'connection-string' | 'namespace';
  value: string;
};

function toDetail(name: string, ctx: AsbContext, currentContext: string | undefined): ContextDetail {
  if ('connectionString' in ctx) {
    return { name, active: name === currentContext, type: 'connection-string', value: ctx.connectionString };
  }
  return { name, active: name === currentContext, type: 'namespace', value: ctx.namespace };
}

export async function contextGet(name?: string): Promise<ContextDetail> {
  const config = await loadConfig();
  const resolved = name ?? config.currentContext;
  if (!resolved) {
    throw new Error('no active context — run `asb context add` first');
  }
  const ctx = config.contexts[resolved];
  if (!ctx) {
    throw new Error(`context '${resolved}' not found`);
  }
  return toDetail(resolved, ctx, config.currentContext);
}

function printDetail(detail: ContextDetail): void {
  console.log(`Name:   ${detail.name}`);
  console.log(`Type:   ${detail.type}`);
  console.log(`Active: ${detail.active ? pc.green('yes') : 'no'}`);
  console.log(`Value:  ${detail.value}`);
}

export function registerGet(context: Command): void {
  context
    .command('get')
    .description('Print full details of a context (defaults to the active one)')
    .argument('[name]', 'Context name (defaults to active context)')
    .addHelpText('after', `
Examples:
  $ asb context get
  $ asb context get prod`)
    .action(async (name: string | undefined) => {
      try {
        const detail = await contextGet(name);
        printDetail(detail);
      } catch (err: unknown) {
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}
