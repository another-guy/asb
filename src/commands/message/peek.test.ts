import { describe, it, expect } from 'vitest';
import Long from 'long';
import type { ServiceBusReceivedMessage } from '@azure/service-bus';

import { toPeekRows, buildTarget } from './peek.js';

function makeMessage(overrides: Partial<ServiceBusReceivedMessage> = {}): ServiceBusReceivedMessage {
  return {
    body: 'hello',
    sequenceNumber: Long.fromNumber(1),
    messageId: 'msg-1',
    subject: 'test-subject',
    enqueuedTimeUtc: new Date('2024-06-01T12:00:00.000Z'),
    deliveryCount: 0,
    lockToken: 'lock-1',
    ...overrides,
  } as ServiceBusReceivedMessage;
}

describe('toPeekRows', () => {
  it('maps sequence number, messageId, subject, enqueuedTime, body', () => {
    const [row] = toPeekRows([makeMessage()]);
    expect(row[0]).toBe('1');
    expect(row[1]).toBe('msg-1');
    expect(row[2]).toBe('test-subject');
    expect(row[3]).toBe('2024-06-01T12:00:00.000Z');
    expect(row[4]).toBe('hello');
  });

  it('uses "-" when sequenceNumber is absent', () => {
    const [row] = toPeekRows([makeMessage({ sequenceNumber: undefined })]);
    expect(row[0]).toBe('-');
  });

  it('shows empty string for missing messageId', () => {
    const [row] = toPeekRows([makeMessage({ messageId: undefined })]);
    expect(row[1]).toBe('');
  });

  it('shows empty string for missing subject', () => {
    const [row] = toPeekRows([makeMessage({ subject: undefined })]);
    expect(row[2]).toBe('');
  });

  it('shows empty string for missing enqueuedTimeUtc', () => {
    const [row] = toPeekRows([makeMessage({ enqueuedTimeUtc: undefined })]);
    expect(row[3]).toBe('');
  });

  it('JSON-stringifies object body', () => {
    const [row] = toPeekRows([makeMessage({ body: { key: 'val' } })]);
    expect(row[4]).toBe('{"key":"val"}');
  });

  it('truncates long body to 80 chars with ellipsis', () => {
    const long = 'x'.repeat(100);
    const [row] = toPeekRows([makeMessage({ body: long })]);
    expect(row[4]).toHaveLength(80);
    expect(row[4].endsWith('…')).toBe(true);
  });

  it('shows binary size for Buffer body', () => {
    const [row] = toPeekRows([makeMessage({ body: Buffer.from('abc') })]);
    expect(row[4]).toBe('<binary 3B>');
  });

  it('shows binary size for Uint8Array body', () => {
    const [row] = toPeekRows([makeMessage({ body: new Uint8Array(5) })]);
    expect(row[4]).toBe('<binary 5B>');
  });

  it('maps multiple messages to multiple rows', () => {
    const rows = toPeekRows([
      makeMessage({ sequenceNumber: Long.fromNumber(1) }),
      makeMessage({ sequenceNumber: Long.fromNumber(2) }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toBe('1');
    expect(rows[1][0]).toBe('2');
  });

  it('returns empty array for empty input', () => {
    expect(toPeekRows([])).toEqual([]);
  });
});

describe('buildTarget', () => {
  it('returns queue type when --queue is given', () => {
    expect(buildTarget({ queue: 'my-queue' })).toEqual({ type: 'queue', name: 'my-queue' });
  });

  it('returns subscription type when --topic and --subscription are given', () => {
    expect(buildTarget({ topic: 'my-topic', subscription: 'my-sub' })).toEqual({
      type: 'subscription',
      topicName: 'my-topic',
      subscriptionName: 'my-sub',
    });
  });

  it('accepts topic names containing slashes', () => {
    expect(buildTarget({ topic: 'org/team/topic', subscription: 'my-sub' })).toEqual({
      type: 'subscription',
      topicName: 'org/team/topic',
      subscriptionName: 'my-sub',
    });
  });

  it('throws when neither --queue nor --topic/--subscription are given', () => {
    expect(() => buildTarget({})).toThrow('specify --queue');
  });

  it('throws when --topic is given without --subscription', () => {
    expect(() => buildTarget({ topic: 'my-topic' })).toThrow('--topic and --subscription must both be provided together');
  });

  it('throws when --subscription is given without --topic', () => {
    expect(() => buildTarget({ subscription: 'my-sub' })).toThrow('--topic and --subscription must both be provided together');
  });

  it('throws when --queue is combined with --topic', () => {
    expect(() => buildTarget({ queue: 'my-queue', topic: 'my-topic' })).toThrow('--queue cannot be combined');
  });

  it('throws when --queue is combined with --subscription', () => {
    expect(() => buildTarget({ queue: 'my-queue', subscription: 'my-sub' })).toThrow('--queue cannot be combined');
  });
});
