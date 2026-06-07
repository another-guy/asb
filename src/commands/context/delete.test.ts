import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { contextDelete } from './delete.js';
import type { AsbConfig } from '../../auth/types.js';

describe('context delete', () => {
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

  async function readConfig(): Promise<AsbConfig> {
    const raw = await readFile(process.env['ASB_CONFIG_PATH']!, 'utf-8');
    return JSON.parse(raw) as AsbConfig;
  }

  it('removes the named context', async () => {
    await writeConfig({
      currentContext: 'staging',
      contexts: {
        prod: { connectionString: 'Endpoint=sb://prod.servicebus.windows.net/;SharedAccessKeyName=k;SharedAccessKey=v' },
        staging: { namespace: 'staging.servicebus.windows.net' },
      },
    });
    await contextDelete('prod');
    const config = await readConfig();
    expect(config.contexts['prod']).toBeUndefined();
    expect(config.contexts['staging']).toBeDefined();
  });

  it('returns deletedActive false when deleting a non-active context', async () => {
    await writeConfig({
      currentContext: 'staging',
      contexts: {
        prod: { connectionString: 'Endpoint=sb://prod.servicebus.windows.net/;SharedAccessKeyName=k;SharedAccessKey=v' },
        staging: { namespace: 'staging.servicebus.windows.net' },
      },
    });
    const result = await contextDelete('prod');
    expect(result.deletedActive).toBe(false);
    const config = await readConfig();
    expect(config.currentContext).toBe('staging');
  });

  it('clears currentContext and returns deletedActive true when deleting the active context', async () => {
    await writeConfig({
      currentContext: 'prod',
      contexts: {
        prod: { connectionString: 'Endpoint=sb://prod.servicebus.windows.net/;SharedAccessKeyName=k;SharedAccessKey=v' },
        staging: { namespace: 'staging.servicebus.windows.net' },
      },
    });
    const result = await contextDelete('prod');
    expect(result.deletedActive).toBe(true);
    const config = await readConfig();
    expect(config.currentContext).toBeUndefined();
  });

  it('throws when the named context does not exist', async () => {
    await writeConfig({ contexts: { prod: { namespace: 'prod.servicebus.windows.net' } } });
    await expect(contextDelete('nonexistent')).rejects.toThrow("context 'nonexistent' not found");
  });
});
