import { describe, it, expect } from 'vitest';
import type { QueueProperties, QueueRuntimeProperties } from '@azure/service-bus';

import { toGetRows } from './get.js';
import { toStatsRows } from './stats.js';

describe('queue get', () => {
  const base: QueueProperties = {
    name: 'my-queue',
    lockDuration: 'PT1M',
    maxSizeInMegabytes: 1024,
    requiresDuplicateDetection: false,
    requiresSession: false,
    defaultMessageTimeToLive: 'P14D',
    deadLetteringOnMessageExpiration: false,
    duplicateDetectionHistoryTimeWindow: 'PT10M',
    maxDeliveryCount: 10,
    enableBatchedOperations: true,
    status: 'Active',
    userMetadata: '',
    autoDeleteOnIdle: 'P10675199DT2H48M5.4775807S',
    enablePartitioning: false,
    enableExpress: false,
    availabilityStatus: 'Available',
  };

  it('includes core config fields', () => {
    const rows = toGetRows(base);
    expect(rows).toContainEqual({ label: 'Name', value: 'my-queue' });
    expect(rows).toContainEqual({ label: 'Status', value: 'Active' });
    expect(rows).toContainEqual({ label: 'Lock Duration', value: 'PT1M' });
    expect(rows).toContainEqual({ label: 'Max Size (MB)', value: '1024' });
    expect(rows).toContainEqual({ label: 'Max Delivery Count', value: '10' });
    expect(rows).toContainEqual({ label: 'Sessions', value: 'no' });
    expect(rows).toContainEqual({ label: 'Dedup', value: 'no' });
  });

  it('omits Dedup Window when dedup is disabled', () => {
    const rows = toGetRows(base);
    expect(rows.find(r => r.label === 'Dedup Window')).toBeUndefined();
  });

  it('includes Dedup Window when dedup is enabled', () => {
    const rows = toGetRows({ ...base, requiresDuplicateDetection: true });
    expect(rows).toContainEqual({ label: 'Dedup Window', value: 'PT10M' });
  });

  it('omits Forward To when not set', () => {
    const rows = toGetRows(base);
    expect(rows.find(r => r.label === 'Forward To')).toBeUndefined();
  });

  it('includes Forward To when set', () => {
    const rows = toGetRows({ ...base, forwardTo: 'other-queue' });
    expect(rows).toContainEqual({ label: 'Forward To', value: 'other-queue' });
  });

  it('includes Forward DLQ To when set', () => {
    const rows = toGetRows({ ...base, forwardDeadLetteredMessagesTo: 'dlq-queue' });
    expect(rows).toContainEqual({ label: 'Forward DLQ To', value: 'dlq-queue' });
  });
});

describe('queue stats', () => {
  const base: QueueRuntimeProperties = {
    name: 'my-queue',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    modifiedAt: new Date('2024-06-01T00:00:00.000Z'),
    accessedAt: new Date('2024-06-15T00:00:00.000Z'),
    activeMessageCount: 42,
    deadLetterMessageCount: 3,
    scheduledMessageCount: 1,
    transferMessageCount: 0,
    transferDeadLetterMessageCount: 0,
    sizeInBytes: 204800,
  };

  it('includes all count fields and timestamps', () => {
    const rows = toStatsRows(base);
    expect(rows).toContainEqual({ label: 'Name', value: 'my-queue' });
    expect(rows).toContainEqual({ label: 'Active', value: '42' });
    expect(rows).toContainEqual({ label: 'Dead Letter', value: '3' });
    expect(rows).toContainEqual({ label: 'Scheduled', value: '1' });
    expect(rows).toContainEqual({ label: 'Transfer', value: '0' });
    expect(rows).toContainEqual({ label: 'Transfer DL', value: '0' });
    expect(rows).toContainEqual({ label: 'Created', value: '2024-01-01T00:00:00.000Z' });
    expect(rows).toContainEqual({ label: 'Modified', value: '2024-06-01T00:00:00.000Z' });
    expect(rows).toContainEqual({ label: 'Accessed', value: '2024-06-15T00:00:00.000Z' });
  });

  it('includes Size when sizeInBytes is defined', () => {
    const rows = toStatsRows(base);
    expect(rows).toContainEqual({ label: 'Size (bytes)', value: '204800' });
  });

  it('omits Size when sizeInBytes is undefined', () => {
    const rows = toStatsRows({ ...base, sizeInBytes: undefined });
    expect(rows.find(r => r.label === 'Size (bytes)')).toBeUndefined();
  });
});
