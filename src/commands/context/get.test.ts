import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { contextGet } from './get.js';
import type { AsbConfig } from '../../auth/types.js';

describe('context get', () => {
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

  it('returns the named connection-string context', async () => {
    await writeConfig({
      currentContext: 'staging',
      contexts: {
        prod: { connectionString: 'Endpoint=sb://prod.servicebus.windows.net/;SharedAccessKeyName=k;SharedAccessKey=v' },
        staging: { namespace: 'staging.servicebus.windows.net' },
      },
    });
    const detail = await contextGet('prod');
    expect(detail).toEqual({
      name: 'prod',
      active: false,
      type: 'connection-string',
      value: 'Endpoint=sb://prod.servicebus.windows.net/;SharedAccessKeyName=k;SharedAccessKey=v',
    });
  });

  it('returns the named namespace context', async () => {
    await writeConfig({
      currentContext: 'staging',
      contexts: {
        staging: { namespace: 'staging.servicebus.windows.net' },
      },
    });
    const detail = await contextGet('staging');
    expect(detail).toEqual({
      name: 'staging',
      active: true,
      type: 'namespace',
      value: 'staging.servicebus.windows.net',
    });
  });

  it('defaults to the active context when name is omitted', async () => {
    await writeConfig({
      currentContext: 'prod',
      contexts: {
        prod: { connectionString: 'Endpoint=sb://prod.servicebus.windows.net/;SharedAccessKeyName=k;SharedAccessKey=v' },
        staging: { namespace: 'staging.servicebus.windows.net' },
      },
    });
    const detail = await contextGet();
    expect(detail.name).toBe('prod');
    expect(detail.active).toBe(true);
  });

  it('throws when the named context does not exist', async () => {
    await writeConfig({ contexts: { prod: { namespace: 'prod.servicebus.windows.net' } } });
    await expect(contextGet('nonexistent')).rejects.toThrow("context 'nonexistent' not found");
  });

  it('throws when no name given and no active context', async () => {
    await writeConfig({ contexts: {} });
    await expect(contextGet()).rejects.toThrow('no active context');
  });
});
