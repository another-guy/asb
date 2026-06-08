import { Command } from 'commander';

import { registerFind } from './find.js';
import { registerPeek } from './peek.js';
import { registerSend } from './send.js';

export function registerMessageCommand(parent: Command): void {
  const message = parent.command('message').description('Message operations');
  registerPeek(message);
  registerSend(message);
  registerFind(message);
}
