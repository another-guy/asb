import { Command } from 'commander';
import { registerPeek } from './peek.js';

export function registerMessageCommand(parent: Command): void {
  const message = parent.command('message').description('Message operations');
  registerPeek(message);
}
