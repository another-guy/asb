import { loadConfig } from './config-file.js';
import type { AsbContext } from './types.js';

export async function resolveContext(name?: string): Promise<{ name: string; ctx: AsbContext }> {
  const config = await loadConfig();
  const resolved = name ?? config.currentContext;
  if (!resolved) {
    throw new Error('no active context — run `asb context add` first');
  }
  const ctx = config.contexts[resolved];
  if (!ctx) {
    throw new Error(`context '${resolved}' not found`);
  }
  return { name: resolved, ctx };
}
