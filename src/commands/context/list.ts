import { Command } from 'commander';
import pc from 'picocolors';

import { loadConfig } from '../../auth/config-file.js';
import type { AsbContext } from '../../auth/types.js';

export type ContextListEntry = {
  name: string;
  active: boolean;
  type: 'connection-string' | 'namespace';
  endpoint: string;
};

export function registerList(context: Command): void {
  context
    .command('list')
    .description('Print all saved contexts, marking the active one')
    .addHelpText('after', `
Examples:
  $ asb context list`)
    .action(async () => {
      try {
        const entries = await listContexts();
        printTable(entries);
      } catch (err: unknown) {
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}

export async function listContexts(): Promise<ContextListEntry[]> {
  const config = await loadConfig();
  return Object.entries(config.contexts).map(([name, ctx]) => toEntry(name, ctx, config.currentContext));
}

function printTable(entries: ContextListEntry[]): void {
  if (entries.length === 0) {
    console.log('No contexts configured.');
    return;
  }

  const nameWidth = Math.max(4, ...entries.map(e => e.name.length));
  const typeWidth = Math.max(17, ...entries.map(e => e.type.length));

  console.log(`  ${'NAME'.padEnd(nameWidth)}  ${'TYPE'.padEnd(typeWidth)}  ENDPOINT`);
  for (const e of entries) {
    const marker = e.active ? pc.green('*') : ' ';
    console.log(`${marker} ${e.name.padEnd(nameWidth)}  ${e.type.padEnd(typeWidth)}  ${e.endpoint}`);
  }
}

function toEntry(name: string, ctx: AsbContext, currentContext: string | undefined): ContextListEntry {
  if ('connectionString' in ctx) {
    return { name, active: name === currentContext, type: 'connection-string', endpoint: extractEndpoint(ctx.connectionString) };
  }
  return { name, active: name === currentContext, type: 'namespace', endpoint: ctx.namespace };
}

function extractEndpoint(connectionString: string): string {
  const match = /Endpoint=(sb:\/\/[^;]+)/.exec(connectionString);
  return match?.[1] ?? '(unknown)';
}
