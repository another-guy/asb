import { describe, it, expect } from 'vitest';
import type { TopicProperties, TopicRuntimeProperties } from '@azure/service-bus';

import { toTopicRows, toTopicStatsRows } from './list.js';

describe('topic list', () => {
  const baseTopic: TopicProperties = {
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

  const baseStats: TopicRuntimeProperties = {
    name: 'my-topic',
    subscriptionCount: 3,
    scheduledMessageCount: 2,
    sizeInBytes: 102400,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    modifiedAt: new Date('2024-06-01T00:00:00.000Z'),
    accessedAt: new Date('2024-06-01T00:00:00.000Z'),
  };

  describe('toTopicRows', () => {
    it('maps name, status, maxSize, ordering', () => {
      const rows = toTopicRows([baseTopic]);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual(['my-topic', 'Active', '1024', 'no']);
    });

    it('shows "yes" for supportOrdering', () => {
      const rows = toTopicRows([{ ...baseTopic, supportOrdering: true }]);
      expect(rows[0][3]).toBe('yes');
    });

    it('returns empty array for empty input', () => {
      expect(toTopicRows([])).toEqual([]);
    });

    it('handles multiple topics', () => {
      const second = { ...baseTopic, name: 'other-topic', status: 'Disabled' as const };
      const rows = toTopicRows([baseTopic, second]);
      expect(rows).toHaveLength(2);
      expect(rows[1][0]).toBe('other-topic');
      expect(rows[1][1]).toBe('Disabled');
    });
  });

  describe('toTopicStatsRows', () => {
    it('maps name, subscriptions, scheduled, sizeInBytes', () => {
      const rows = toTopicStatsRows([baseStats]);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual(['my-topic', '3', '2', '102400']);
    });

    it('uses dash when subscriptionCount is undefined', () => {
      const rows = toTopicStatsRows([{ ...baseStats, subscriptionCount: undefined }]);
      expect(rows[0][1]).toBe('-');
    });

    it('uses dash when sizeInBytes is undefined', () => {
      const rows = toTopicStatsRows([{ ...baseStats, sizeInBytes: undefined }]);
      expect(rows[0][3]).toBe('-');
    });

    it('returns empty array for empty input', () => {
      expect(toTopicStatsRows([])).toEqual([]);
    });
  });
});
