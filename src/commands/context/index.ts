import { Command } from 'commander';

import { registerAdd } from './add.js';

export function registerContextCommand(parent: Command): void {
  const context = parent.command('context').description('Manage named auth profiles');
  registerAdd(context);
}
