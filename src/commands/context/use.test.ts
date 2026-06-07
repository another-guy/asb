import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { contextUse } from './use.js';
import type { AsbConfig } from '../../auth/types.js';

describe('context use', () => {
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

  it('sets currentContext to the named context', async () => {
    await writeConfig({
      currentContext: 'staging',
      contexts: {
        prod: { connectionString: 'Endpoint=sb://prod.servicebus.windows.net/;SharedAccessKeyName=k;SharedAccessKey=v' },
        staging: { namespace: 'staging.servicebus.windows.net' },
      },
    });
    await contextUse('prod');
    const config = await readConfig();
    expect(config.currentContext).toBe('prod');
  });

  it('does not modify the contexts themselves', async () => {
    const initial: AsbConfig = {
      currentContext: 'staging',
      contexts: {
        prod: { connectionString: 'Endpoint=sb://prod.servicebus.windows.net/;SharedAccessKeyName=k;SharedAccessKey=v' },
        staging: { namespace: 'staging.servicebus.windows.net' },
      },
    };
    await writeConfig(initial);
    await contextUse('prod');
    const config = await readConfig();
    expect(config.contexts).toEqual(initial.contexts);
  });

  it('throws when the named context does not exist', async () => {
    await writeConfig({ currentContext: 'prod', contexts: { prod: { namespace: 'prod.servicebus.windows.net' } } });
    await expect(contextUse('nonexistent')).rejects.toThrow("context 'nonexistent' not found");
  });
});
