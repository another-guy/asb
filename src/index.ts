import { Command } from 'commander';

import { registerContextCommand } from './commands/context/index.js';
import { registerNamespaceCommand } from './commands/namespace/index.js';
import { registerQueueCommand } from './commands/queue/index.js';
import { registerTopicCommand } from './commands/topic/index.js';

export const program = new Command();

program
  .name('asb')
  .description('Azure Service Bus CLI')
  .version('0.1.0');

registerContextCommand(program);
registerNamespaceCommand(program);
registerQueueCommand(program);
registerTopicCommand(program);
