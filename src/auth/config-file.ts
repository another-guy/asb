import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { getConfigPath } from './config-path.js';
import type { AsbConfig } from './types.js';

export async function loadConfig(): Promise<AsbConfig> {
  const path = getConfigPath();
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw) as AsbConfig;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { contexts: {} };
    }
    throw err;
  }
}

export async function saveConfig(config: AsbConfig): Promise<void> {
  const path = getConfigPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}
