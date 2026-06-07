import { createInterface } from 'node:readline/promises';

import { Command } from 'commander';
import pc from 'picocolors';

import { loadConfig, saveConfig } from '../../auth/config-file.js';

export type DeleteResult = {
  deletedActive: boolean;
};

export async function contextDelete(name: string): Promise<DeleteResult> {
  const config = await loadConfig();
  if (!config.contexts[name]) {
    throw new Error(`context '${name}' not found`);
  }
  const deletedActive = config.currentContext === name;
  delete config.contexts[name];
  if (deletedActive) {
    delete config.currentContext;
  }
  await saveConfig(config);
  return { deletedActive };
}

async function confirm(name: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Delete context '${name}'? [y/N] `);
  rl.close();
  return answer.toLowerCase() === 'y';
}

export function registerDelete(context: Command): void {
  context
    .command('delete')
    .description('Remove a named context from ~/.asb/config')
    .argument('<name>', 'Context name to delete')
    .option('--yes', 'Skip confirmation prompt')
    .addHelpText('after', `
Examples:
  $ asb context delete staging --yes
  $ asb context delete prod`)
    .action(async (name: string, opts: { yes?: boolean }) => {
      try {
        if (!opts.yes) {
          const confirmed = await confirm(name);
          if (!confirmed) {
            console.log('Aborted.');
            return;
          }
        }
        const { deletedActive } = await contextDelete(name);
        console.log(`Context '${name}' deleted.`);
        if (deletedActive) {
          console.log(pc.yellow('No active context — run `asb context use <name>` to set one.'));
        }
      } catch (err: unknown) {
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}
