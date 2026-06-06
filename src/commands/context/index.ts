import { Command } from 'commander';

import { registerAdd } from './add.js';
import { registerList } from './list.js';

export function registerContextCommand(parent: Command): void {
  const context = parent.command('context').description('Manage named auth profiles');
  registerAdd(context);
  registerList(context);
}
