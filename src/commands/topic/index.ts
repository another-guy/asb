import { Command } from 'commander';
import { registerList } from './list.js';

export function registerTopicCommand(parent: Command): void {
  const topic = parent.command('topic').description('Topic operations');
  registerList(topic);
}
