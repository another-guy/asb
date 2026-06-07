import { describe, it, expect } from 'vitest';
import type { SubscriptionProperties, SubscriptionRuntimeProperties } from '@azure/service-bus';

import { toGetRows } from './get.js';
import { toStatsRows } from './stats.js';

describe('subscription get', () => {
  const base: SubscriptionProperties = {
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

  it('includes core config fields', () => {
    const rows = toGetRows(base);
    expect(rows).toContainEqual({ label: 'Name', value: 'my-sub' });
    expect(rows).toContainEqual({ label: 'Topic', value: 'my-topic' });
    expect(rows).toContainEqual({ label: 'Status', value: 'Active' });
    expect(rows).toContainEqual({ label: 'Lock Duration', value: 'PT1M' });
    expect(rows).toContainEqual({ label: 'Max Delivery Count', value: '10' });
    expect(rows).toContainEqual({ label: 'TTL', value: 'P14D' });
    expect(rows).toContainEqual({ label: 'Sessions', value: 'no' });
    expect(rows).toContainEqual({ label: 'Dead Letter on Expiry', value: 'no' });
    expect(rows).toContainEqual({ label: 'Dead Letter on Filter Error', value: 'yes' });
  });

  it('shows "yes" for requiresSession', () => {
    const rows = toGetRows({ ...base, requiresSession: true });
    expect(rows).toContainEqual({ label: 'Sessions', value: 'yes' });
  });

  it('omits Forward To when not set', () => {
    const rows = toGetRows(base);
    expect(rows.find(r => r.label === 'Forward To')).toBeUndefined();
  });

  it('includes Forward To when set', () => {
    const rows = toGetRows({ ...base, forwardTo: 'other-topic' });
    expect(rows).toContainEqual({ label: 'Forward To', value: 'other-topic' });
  });

  it('includes Forward DLQ To when set', () => {
    const rows = toGetRows({ ...base, forwardDeadLetteredMessagesTo: 'dlq-topic' });
    expect(rows).toContainEqual({ label: 'Forward DLQ To', value: 'dlq-topic' });
  });
});

describe('subscription stats', () => {
  const base: SubscriptionRuntimeProperties = {
    subscriptionName: 'my-sub',
    topicName: 'my-topic',
    totalMessageCount: 50,
    activeMessageCount: 45,
    deadLetterMessageCount: 5,
    transferMessageCount: 0,
    transferDeadLetterMessageCount: 0,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    modifiedAt: new Date('2024-06-01T00:00:00.000Z'),
    accessedAt: new Date('2024-06-15T00:00:00.000Z'),
  };

  it('includes all fields', () => {
    const rows = toStatsRows(base);
    expect(rows).toContainEqual({ label: 'Name', value: 'my-sub' });
    expect(rows).toContainEqual({ label: 'Topic', value: 'my-topic' });
    expect(rows).toContainEqual({ label: 'Active', value: '45' });
    expect(rows).toContainEqual({ label: 'Dead Letter', value: '5' });
    expect(rows).toContainEqual({ label: 'Transfer', value: '0' });
    expect(rows).toContainEqual({ label: 'Transfer DL', value: '0' });
    expect(rows).toContainEqual({ label: 'Total', value: '50' });
    expect(rows).toContainEqual({ label: 'Created', value: '2024-01-01T00:00:00.000Z' });
    expect(rows).toContainEqual({ label: 'Modified', value: '2024-06-01T00:00:00.000Z' });
    expect(rows).toContainEqual({ label: 'Accessed', value: '2024-06-15T00:00:00.000Z' });
  });
});
