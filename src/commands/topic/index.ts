import { Command } from 'commander';
import { registerList } from './list.js';
import { registerGet } from './get.js';
import { registerStats } from './stats.js';

export function registerTopicCommand(parent: Command): void {
  const topic = parent.command('topic').description('Topic operations');
  registerList(topic);
  registerGet(topic);
  registerStats(topic);
}
