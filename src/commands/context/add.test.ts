import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { contextAdd } from './add.js';

describe('context add', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'asb-test-'));
    process.env['ASB_CONFIG_PATH'] = join(tmpDir, 'config');
  });

  afterEach(async () => {
    delete process.env['ASB_CONFIG_PATH'];
    await rm(tmpDir, { recursive: true });
  });

  async function readConfig(): Promise<unknown> {
    const raw = await readFile(process.env['ASB_CONFIG_PATH']!, 'utf-8');
    return JSON.parse(raw);
  }

  it('saves a connection-string context', async () => {
    await contextAdd('prod', { connectionString: 'Endpoint=sb://prod.servicebus.windows.net/;SharedAccessKeyName=k;SharedAccessKey=v' });
    const config = await readConfig() as Record<string, unknown>;
    expect((config['contexts'] as Record<string, unknown>)['prod']).toEqual({
      connectionString: 'Endpoint=sb://prod.servicebus.windows.net/;SharedAccessKeyName=k;SharedAccessKey=v',
    });
  });

  it('saves a namespace context', async () => {
    await contextAdd('staging', { namespace: 'ns.servicebus.windows.net' });
    const config = await readConfig() as Record<string, unknown>;
    expect((config['contexts'] as Record<string, unknown>)['staging']).toEqual({
      namespace: 'ns.servicebus.windows.net',
    });
  });

  it('sets the first context as currentContext', async () => {
    await contextAdd('prod', { connectionString: 'Endpoint=sb://prod.servicebus.windows.net/;SharedAccessKeyName=k;SharedAccessKey=v' });
    const config = await readConfig() as Record<string, unknown>;
    expect(config['currentContext']).toBe('prod');
  });

  it('does not change currentContext when a second context is added', async () => {
    await contextAdd('prod', { connectionString: 'Endpoint=sb://prod.servicebus.windows.net/;SharedAccessKeyName=k;SharedAccessKey=v' });
    await contextAdd('staging', { namespace: 'ns.servicebus.windows.net' });
    const config = await readConfig() as Record<string, unknown>;
    expect(config['currentContext']).toBe('prod');
  });

  it('throws when neither --connection-string nor --namespace is given', async () => {
    await expect(contextAdd('bad', {})).rejects.toThrow('provide --connection-string or --namespace');
  });

  it('throws when both --connection-string and --namespace are given', async () => {
    await expect(
      contextAdd('bad', { connectionString: 'Endpoint=sb://x', namespace: 'x.servicebus.windows.net' }),
    ).rejects.toThrow('mutually exclusive');
  });
});
