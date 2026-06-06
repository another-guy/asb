import { Command } from 'commander';

const program = new Command();

program
  .name('asb')
  .description('Azure Service Bus CLI')
  .version('0.1.0');

program.parse();
