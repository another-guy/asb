import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { listContexts } from './list.js';
import type { AsbConfig } from '../../auth/types.js';

describe('context list', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'asb-test-'));
    process.env['ASB_CONFIG_PATH'] = join(tmpDir, 'config');
  });

  afterEach(async () => {
    delete process.env['ASB_CONFIG_PATH'];
    await rm(tmpDir, { recursive: true });
  });

  async function writeConfig(config: AsbConfig): Promise<void> {
    await writeFile(process.env['ASB_CONFIG_PATH']!, JSON.stringify(config, null, 2), 'utf-8');
  }

  it('returns an empty array when no config file exists', async () => {
    const entries = await listContexts();
    expect(entries).toEqual([]);
  });

  it('marks the active context', async () => {
    await writeConfig({
      currentContext: 'prod',
      contexts: {
        prod: { connectionString: 'Endpoint=sb://prod.servicebus.windows.net/;SharedAccessKeyName=k;SharedAccessKey=v' },
        staging: { namespace: 'staging.servicebus.windows.net' },
      },
    });
    const entries = await listContexts();
    expect(entries.find(e => e.name === 'prod')?.active).toBe(true);
    expect(entries.find(e => e.name === 'staging')?.active).toBe(false);
  });

  it('identifies connection-string type and extracts the endpoint', async () => {
    await writeConfig({
      currentContext: 'prod',
      contexts: {
        prod: { connectionString: 'Endpoint=sb://prod.servicebus.windows.net/;SharedAccessKeyName=k;SharedAccessKey=v' },
      },
    });
    const [entry] = await listContexts();
    expect(entry.type).toBe('connection-string');
    expect(entry.endpoint).toBe('sb://prod.servicebus.windows.net/');
  });

  it('identifies namespace type', async () => {
    await writeConfig({
      currentContext: 'staging',
      contexts: {
        staging: { namespace: 'staging.servicebus.windows.net' },
      },
    });
    const [entry] = await listContexts();
    expect(entry.type).toBe('namespace');
    expect(entry.endpoint).toBe('staging.servicebus.windows.net');
  });
});
