#!/usr/bin/env node
import { Command } from 'commander';

export const program = new Command();

program
  .name('asb')
  .description('Azure Service Bus CLI')
  .version('0.1.0');

if (process.argv[1] === import.meta.filename) {
  program.parse();
}
