import { Command } from 'commander';
import { registerList } from './list.js';

export function registerQueueCommand(parent: Command): void {
  const queue = parent.command('queue').description('Queue operations');
  registerList(queue);
}
