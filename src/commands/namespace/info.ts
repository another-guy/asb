import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import type { NamespaceProperties } from '@azure/service-bus';

import { resolveContext } from '../../auth/resolve-context.js';
import { createAdminClient } from '../../sdk/admin-client.js';

export function registerInfo(namespace: Command): void {
  namespace
    .command('info')
    .description('Verify connection and show namespace properties')
    .addHelpText('after', `
Examples:
  $ asb namespace info`)
    .action(async () => {
      const spinner = ora('Connecting…').start();
      try {
        const props = await namespaceInfo();
        spinner.stop();
        printInfo(props);
      } catch (err: unknown) {
        spinner.stop();
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}

export async function namespaceInfo(contextName?: string): Promise<NamespaceProperties> {
  const { ctx } = await resolveContext(contextName);
  const client = createAdminClient(ctx);
  return client.getNamespaceProperties();
}

function printInfo(props: NamespaceProperties): void {
  const rows = toInfoRows(props);
  const labelWidth = Math.max(...rows.map(r => r.label.length));
  for (const { label, value } of rows) {
    console.log(`${label.padEnd(labelWidth)}  ${value}`);
  }
}

type InfoRow = { label: string; value: string };

export function toInfoRows(props: NamespaceProperties): InfoRow[] {
  const rows: InfoRow[] = [
    { label: 'Name', value: props.name },
    { label: 'SKU', value: props.messagingSku },
  ];
  if (props.messagingUnits !== undefined) {
    rows.push({ label: 'Messaging Units', value: String(props.messagingUnits) });
  }
  rows.push(
    { label: 'Created', value: props.createdAt.toISOString() },
    { label: 'Modified', value: props.modifiedAt.toISOString() },
  );
  return rows;
}
