import { Command } from 'commander';
import pc from 'picocolors';

import { loadConfig, saveConfig } from '../../auth/config-file.js';

type AddOptions = {
  connectionString?: string;
  namespace?: string;
};

export async function contextAdd(name: string, opts: AddOptions): Promise<void> {
  if (!opts.connectionString && !opts.namespace) {
    throw new Error('provide --connection-string or --namespace');
  }
  if (opts.connectionString && opts.namespace) {
    throw new Error('--connection-string and --namespace are mutually exclusive');
  }

  const config = await loadConfig();
  config.contexts[name] = opts.connectionString
    ? { connectionString: opts.connectionString }
    : { namespace: opts.namespace! };

  if (!config.currentContext) {
    config.currentContext = name;
  }

  await saveConfig(config);
}

export function registerAdd(context: Command): void {
  context
    .command('add')
    .description('Save a named auth profile to ~/.asb/config')
    .argument('<name>', 'Context name')
    .option('--connection-string <cs>', 'Azure Service Bus connection string')
    .option('--namespace <fqdn>', 'Namespace FQDN (uses DefaultAzureCredential)')
    .action(async (name: string, opts: AddOptions) => {
      try {
        await contextAdd(name, opts);
        console.log(`Context '${name}' saved.`);
      } catch (err: unknown) {
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}
