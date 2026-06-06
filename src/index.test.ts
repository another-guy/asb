import { describe, it, expect } from 'vitest';
import { program } from './index.js';

describe('entry point', () => {
  it('registers the root command with correct name', () => {
    expect(program.name()).toBe('asb');
  });

  it('registers the root command with correct description', () => {
    expect(program.description()).toBe('Azure Service Bus CLI');
  });
});
