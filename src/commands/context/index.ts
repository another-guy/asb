import { Command } from 'commander';

import { registerAdd } from './add.js';
import { registerDelete } from './delete.js';
import { registerGet } from './get.js';
import { registerList } from './list.js';
import { registerUse } from './use.js';

export function registerContextCommand(parent: Command): void {
  const context = parent.command('context').description('Manage named auth profiles');
  registerAdd(context);
  registerList(context);
  registerUse(context);
  registerGet(context);
  registerDelete(context);
}
