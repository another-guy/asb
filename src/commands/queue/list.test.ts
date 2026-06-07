import { describe, it, expect } from 'vitest';
import type { QueueProperties, QueueRuntimeProperties } from '@azure/service-bus';

import { toQueueRows, toStatsRows } from './list.js';

describe('queue list', () => {
  const baseQueue: QueueProperties = {
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

  const baseStats: QueueRuntimeProperties = {
    name: 'my-queue',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    modifiedAt: new Date('2024-06-01T00:00:00.000Z'),
    accessedAt: new Date('2024-06-01T00:00:00.000Z'),
    activeMessageCount: 42,
    deadLetterMessageCount: 3,
    scheduledMessageCount: 1,
    transferMessageCount: 0,
    transferDeadLetterMessageCount: 0,
    sizeInBytes: 204800,
  };

  describe('toQueueRows', () => {
    it('maps name, status, lockDuration, maxSize, maxDeliveryCount', () => {
      const rows = toQueueRows([baseQueue]);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual(['my-queue', 'Active', 'PT1M', '1024', '10']);
    });

    it('returns empty array for empty input', () => {
      expect(toQueueRows([])).toEqual([]);
    });

    it('handles multiple queues', () => {
      const second = { ...baseQueue, name: 'other-queue', status: 'Disabled' as const };
      const rows = toQueueRows([baseQueue, second]);
      expect(rows).toHaveLength(2);
      expect(rows[1][0]).toBe('other-queue');
      expect(rows[1][1]).toBe('Disabled');
    });
  });

  describe('toStatsRows', () => {
    it('maps name, active, deadLetter, scheduled, sizeInBytes', () => {
      const rows = toStatsRows([baseStats]);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual(['my-queue', '42', '3', '1', '204800']);
    });

    it('uses dash when sizeInBytes is undefined', () => {
      const rows = toStatsRows([{ ...baseStats, sizeInBytes: undefined }]);
      expect(rows[0][4]).toBe('-');
    });

    it('returns empty array for empty input', () => {
      expect(toStatsRows([])).toEqual([]);
    });
  });
});
