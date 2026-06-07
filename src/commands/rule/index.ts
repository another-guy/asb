import { Command } from 'commander';
import { registerList } from './list.js';
import { registerGet } from './get.js';

export function registerRuleCommand(parent: Command): void {
  const rule = parent.command('rule').description('Filter rule operations');
  registerList(rule);
  registerGet(rule);
}
