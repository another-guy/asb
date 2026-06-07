import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import type { TopicProperties } from '@azure/service-bus';

import { resolveContext } from '../../auth/resolve-context.js';
import { createAdminClient } from '../../sdk/admin-client.js';

export function registerGet(topic: Command): void {
  topic
    .command('get')
    .description('Show full configuration of a topic')
    .argument('<name>', 'Topic name')
    .addHelpText('after', `
Examples:
  $ asb topic get my-topic`)
    .action(async (name: string) => {
      const spinner = ora('Loading topic…').start();
      try {
        const props = await topicGet(name);
        spinner.stop();
        printGet(props);
      } catch (err: unknown) {
        spinner.stop();
        console.error(pc.red(`error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}

export async function topicGet(name: string, contextName?: string): Promise<TopicProperties> {
  const { ctx } = await resolveContext(contextName);
  const client = createAdminClient(ctx);
  return client.getTopic(name);
}

function printGet(props: TopicProperties): void {
  const rows = toGetRows(props);
  const labelWidth = Math.max(...rows.map(r => r.label.length));
  for (const { label, value } of rows) {
    console.log(`${label.padEnd(labelWidth)}  ${value}`);
  }
}

type Row = { label: string; value: string };

export function toGetRows(props: TopicProperties): Row[] {
  const rows: Row[] = [
    { label: 'Name', value: props.name },
    { label: 'Status', value: props.status },
    { label: 'Max Size (MB)', value: String(props.maxSizeInMegabytes) },
    { label: 'TTL', value: props.defaultMessageTimeToLive },
    { label: 'Ordering', value: props.supportOrdering ? 'yes' : 'no' },
    { label: 'Partitioned', value: props.enablePartitioning ? 'yes' : 'no' },
    { label: 'Dedup', value: props.requiresDuplicateDetection ? 'yes' : 'no' },
  ];
  if (props.requiresDuplicateDetection) {
    rows.push({ label: 'Dedup Window', value: props.duplicateDetectionHistoryTimeWindow });
  }
  rows.push({ label: 'Auto Delete Idle', value: props.autoDeleteOnIdle });
  return rows;
}
