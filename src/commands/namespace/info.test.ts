import { describe, it, expect } from 'vitest';
import type { NamespaceProperties } from '@azure/service-bus';

import { toInfoRows } from './info.js';

describe('namespace info', () => {
  const base: NamespaceProperties = {
    name: 'myns',
    messagingSku: 'Standard',
    messagingUnits: undefined,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    modifiedAt: new Date('2024-06-01T00:00:00.000Z'),
  };

  it('includes name, SKU, created, and modified', () => {
    const rows = toInfoRows(base);
    expect(rows).toContainEqual({ label: 'Name', value: 'myns' });
    expect(rows).toContainEqual({ label: 'SKU', value: 'Standard' });
    expect(rows).toContainEqual({ label: 'Created', value: '2024-01-01T00:00:00.000Z' });
    expect(rows).toContainEqual({ label: 'Modified', value: '2024-06-01T00:00:00.000Z' });
  });

  it('omits Messaging Units when undefined', () => {
    const rows = toInfoRows(base);
    expect(rows.find(r => r.label === 'Messaging Units')).toBeUndefined();
  });

  it('includes Messaging Units for Premium', () => {
    const rows = toInfoRows({ ...base, messagingSku: 'Premium', messagingUnits: 4 });
    expect(rows).toContainEqual({ label: 'Messaging Units', value: '4' });
  });
});
