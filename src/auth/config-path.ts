import { homedir } from 'node:os';
import { join } from 'node:path';

export function getConfigPath(): string {
  return process.env['ASB_CONFIG_PATH'] ?? join(homedir(), '.asb', 'config');
}
