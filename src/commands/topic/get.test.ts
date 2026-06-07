import { describe, it, expect } from 'vitest';
import type { TopicProperties, TopicRuntimeProperties } from '@azure/service-bus';

import { toGetRows } from './get.js';
import { toStatsRows } from './stats.js';

describe('topic get', () => {
  const base: TopicProperties = {
    name: 'my-topic',
    defaultMessageTimeToLive: 'P14D',
    maxSizeInMegabytes: 1024,
    requiresDuplicateDetection: false,
    duplicateDetectionHistoryTimeWindow: 'PT10M',
    enableBatchedOperations: true,
    status: 'Active',
    userMetadata: '',
    supportOrdering: false,
    autoDeleteOnIdle: 'P10675199DT2H48M5.4775807S',
    enablePartitioning: false,
    enableExpress: false,
    availabilityStatus: 'Available',
  };

  it('includes core config fields', () => {
    const rows = toGetRows(base);
    expect(rows).toContainEqual({ label: 'Name', value: 'my-topic' });
    expect(rows).toContainEqual({ label: 'Status', value: 'Active' });
    expect(rows).toContainEqual({ label: 'Max Size (MB)', value: '1024' });
    expect(rows).toContainEqual({ label: 'TTL', value: 'P14D' });
    expect(rows).toContainEqual({ label: 'Ordering', value: 'no' });
    expect(rows).toContainEqual({ label: 'Dedup', value: 'no' });
  });

  it('shows "yes" for supportOrdering', () => {
    const rows = toGetRows({ ...base, supportOrdering: true });
    expect(rows).toContainEqual({ label: 'Ordering', value: 'yes' });
  });

  it('omits Dedup Window when dedup is disabled', () => {
    const rows = toGetRows(base);
    expect(rows.find(r => r.label === 'Dedup Window')).toBeUndefined();
  });

  it('includes Dedup Window when dedup is enabled', () => {
    const rows = toGetRows({ ...base, requiresDuplicateDetection: true });
    expect(rows).toContainEqual({ label: 'Dedup Window', value: 'PT10M' });
  });
});

describe('topic stats', () => {
  const base: TopicRuntimeProperties = {
    name: 'my-topic',
    subscriptionCount: 3,
    scheduledMessageCount: 2,
    sizeInBytes: 102400,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    modifiedAt: new Date('2024-06-01T00:00:00.000Z'),
    accessedAt: new Date('2024-06-15T00:00:00.000Z'),
  };

  it('includes all fields when defined', () => {
    const rows = toStatsRows(base);
    expect(rows).toContainEqual({ label: 'Name', value: 'my-topic' });
    expect(rows).toContainEqual({ label: 'Subscriptions', value: '3' });
    expect(rows).toContainEqual({ label: 'Scheduled', value: '2' });
    expect(rows).toContainEqual({ label: 'Size (bytes)', value: '102400' });
    expect(rows).toContainEqual({ label: 'Created', value: '2024-01-01T00:00:00.000Z' });
    expect(rows).toContainEqual({ label: 'Modified', value: '2024-06-01T00:00:00.000Z' });
    expect(rows).toContainEqual({ label: 'Accessed', value: '2024-06-15T00:00:00.000Z' });
  });

  it('omits Subscriptions when subscriptionCount is undefined', () => {
    const rows = toStatsRows({ ...base, subscriptionCount: undefined });
    expect(rows.find(r => r.label === 'Subscriptions')).toBeUndefined();
  });

  it('omits Size when sizeInBytes is undefined', () => {
    const rows = toStatsRows({ ...base, sizeInBytes: undefined });
    expect(rows.find(r => r.label === 'Size (bytes)')).toBeUndefined();
  });
});
