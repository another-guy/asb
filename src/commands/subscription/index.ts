import { Command } from 'commander';
import { registerList } from './list.js';

export function registerSubscriptionCommand(parent: Command): void {
  const subscription = parent.command('subscription').description('Subscription operations');
  registerList(subscription);
}
