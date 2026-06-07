import { Command } from 'commander';

import { registerInfo } from './info.js';

export function registerNamespaceCommand(parent: Command): void {
  const namespace = parent.command('namespace').description('Namespace operations');
  registerInfo(namespace);
}
