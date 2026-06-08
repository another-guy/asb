import { Command } from 'commander';

import { registerPeek } from './peek.js';
import { registerSend } from './send.js';

export function registerMessageCommand(parent: Command): void {
  const message = parent.command('message').description('Message operations');
  registerPeek(message);
  registerSend(message);
}
