import { Command } from 'commander';
import { registerList } from './list.js';
import { registerGet } from './get.js';
import { registerStats } from './stats.js';

export function registerQueueCommand(parent: Command): void {
  const queue = parent.command('queue').description('Queue operations');
  registerList(queue);
  registerGet(queue);
  registerStats(queue);
}
