import { Command } from 'commander';
import { registerList } from './list.js';
import { registerGet } from './get.js';
import { registerStats } from './stats.js';

export function registerSubscriptionCommand(parent: Command): void {
  const subscription = parent.command('subscription').description('Subscription operations');
  registerList(subscription);
  registerGet(subscription);
  registerStats(subscription);
}
