import { Command } from 'commander';

import { registerFind } from './find.js';
import { registerSend } from './send.js';

export function registerMessageCommand(parent: Command): void {
  const message = parent.command('message').description('Message operations');
  registerSend(message);
  registerFind(message);
}
