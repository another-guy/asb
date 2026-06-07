import { Command } from 'commander';
import pc from 'picocolors';

import { loadConfig, saveConfig } from '../../auth/config-file.js';

export function registerUse(context: Command): void {
  context
    .command('use')
    .description('Set the active context')
    .argument('<name>', 'Context name to activate')
    .addHelpText('after', `
Examples:
  $ asb context use prod
  $ asb context use staging`)
    .action(async (name: string) => {
      try {
        await contextUse(name);
        console.log(`Switched to context '${name}'.`);
      } catch (err: unknown) {
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}

export async function contextUse(name: string): Promise<void> {
  const config = await loadConfig();
  if (!config.contexts[name]) {
    throw new Error(`context '${name}' not found`);
  }
  config.currentContext = name;
  await saveConfig(config);
}
