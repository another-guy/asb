import { describe, it, expect } from 'vitest';
import type { SubscriptionProperties, SubscriptionRuntimeProperties } from '@azure/service-bus';

import { toSubscriptionRows, toSubscriptionStatsRows } from './list.js';

describe('subscription list', () => {
  const baseSub: SubscriptionProperties = {
    subscriptionName: 'my-sub',
    topicName: 'my-topic',
    lockDuration: 'PT1M',
    requiresSession: false,
    defaultMessageTimeToLive: 'P14D',
    deadLetteringOnMessageExpiration: false,
    deadLetteringOnFilterEvaluationExceptions: true,
    maxDeliveryCount: 10,
    enableBatchedOperations: true,
    status: 'Active',
    autoDeleteOnIdle: 'P10675199DT2H48M5.4775807S',
  };

  const baseStats: SubscriptionRuntimeProperties = {
    subscriptionName: 'my-sub',
    topicName: 'my-topic',
    totalMessageCount: 50,
    activeMessageCount: 45,
    deadLetterMessageCount: 5,
    transferMessageCount: 0,
    transferDeadLetterMessageCount: 0,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    modifiedAt: new Date('2024-06-01T00:00:00.000Z'),
    accessedAt: new Date('2024-06-01T00:00:00.000Z'),
  };

  describe('toSubscriptionRows', () => {
    it('maps subscriptionName, status, lockDuration, maxDeliveryCount, sessions', () => {
      const rows = toSubscriptionRows([baseSub]);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual(['my-sub', 'Active', 'PT1M', '10', 'no']);
    });

    it('shows "yes" for requiresSession', () => {
      const rows = toSubscriptionRows([{ ...baseSub, requiresSession: true }]);
      expect(rows[0][4]).toBe('yes');
    });

    it('returns empty array for empty input', () => {
      expect(toSubscriptionRows([])).toEqual([]);
    });

    it('handles multiple subscriptions', () => {
      const second = { ...baseSub, subscriptionName: 'other-sub', status: 'Disabled' as const };
      const rows = toSubscriptionRows([baseSub, second]);
      expect(rows).toHaveLength(2);
      expect(rows[1][0]).toBe('other-sub');
      expect(rows[1][1]).toBe('Disabled');
    });
  });

  describe('toSubscriptionStatsRows', () => {
    it('maps subscriptionName, active, deadLetter, total', () => {
      const rows = toSubscriptionStatsRows([baseStats]);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual(['my-sub', '45', '5', '50']);
    });

    it('returns empty array for empty input', () => {
      expect(toSubscriptionStatsRows([])).toEqual([]);
    });

    it('handles multiple subscriptions', () => {
      const second = { ...baseStats, subscriptionName: 'other-sub', activeMessageCount: 0, deadLetterMessageCount: 0, totalMessageCount: 0 };
      const rows = toSubscriptionStatsRows([baseStats, second]);
      expect(rows).toHaveLength(2);
      expect(rows[1][0]).toBe('other-sub');
      expect(rows[1][1]).toBe('0');
    });
  });
});
