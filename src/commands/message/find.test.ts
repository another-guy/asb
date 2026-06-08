import { describe, it, expect } from 'vitest';
import Long from 'long';

import {
  parseMaxScan,
  evaluatePredicate,
  getField,
  csvEscape,
  serializeMessage,
} from './find.js';
import type { ServiceBusReceivedMessage } from '@azure/service-bus';

describe('parseMaxScan', () => {
  it('returns Infinity for "all"', () => {
    expect(parseMaxScan('all')).toBe(Infinity);
  });

  it('parses a positive integer', () => {
    expect(parseMaxScan('500')).toBe(500);
    expect(parseMaxScan('1')).toBe(1);
  });

  it('returns null for zero', () => {
    expect(parseMaxScan('0')).toBeNull();
  });

  it('returns null for negative', () => {
    expect(parseMaxScan('-1')).toBeNull();
  });

  it('returns null for non-numeric', () => {
    expect(parseMaxScan('abc')).toBeNull();
    expect(parseMaxScan('')).toBeNull();
  });
});

describe('evaluatePredicate', () => {
  it('returns true when the expression is truthy', () => {
    expect(evaluatePredicate('msg.x === 1', { x: 1 })).toBe(true);
  });

  it('returns false when the expression is falsy', () => {
    expect(evaluatePredicate('msg.x === 1', { x: 2 })).toBe(false);
  });

  it('returns false when a property is missing (TypeError)', () => {
    expect(evaluatePredicate('msg.body.type === "error"', { body: undefined })).toBe(false);
  });

  it('handles nested access on a parsed JSON body', () => {
    expect(evaluatePredicate('msg.body.type === "error"', { body: { type: 'error' } })).toBe(true);
  });

  it('returns false for a falsy result', () => {
    expect(evaluatePredicate('msg.x', { x: 0 })).toBe(false);
    expect(evaluatePredicate('msg.x', { x: '' })).toBe(false);
  });

  it('returns false on runtime error in expression', () => {
    expect(evaluatePredicate('msg.body.deeply.nested.missing', {})).toBe(false);
  });

  it('supports applicationProperties access', () => {
    const msg = { applicationProperties: { env: 'prod' } };
    expect(evaluatePredicate('msg.applicationProperties.env === "prod"', msg)).toBe(true);
  });
});

describe('getField', () => {
  it('retrieves a top-level field', () => {
    expect(getField({ messageId: 'abc' }, 'messageId')).toBe('abc');
  });

  it('retrieves a nested field via dot notation', () => {
    expect(getField({ body: { type: 'error' } }, 'body.type')).toBe('error');
  });

  it('returns empty string for missing field', () => {
    expect(getField({}, 'subject')).toBe('');
  });

  it('returns empty string for null value', () => {
    expect(getField({ subject: null }, 'subject')).toBe('');
  });

  it('returns JSON string for object value', () => {
    expect(getField({ body: { a: 1 } }, 'body')).toBe('{"a":1}');
  });

  it('converts numbers to strings', () => {
    expect(getField({ timeToLive: 5000 }, 'timeToLive')).toBe('5000');
  });
});

describe('csvEscape', () => {
  it('returns plain value unchanged', () => {
    expect(csvEscape('hello')).toBe('hello');
  });

  it('wraps in quotes when value contains a comma', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
  });

  it('escapes internal double quotes', () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it('wraps in quotes when value contains a newline', () => {
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('serializeMessage', () => {
  const makeMsg = (overrides: Partial<ServiceBusReceivedMessage>): ServiceBusReceivedMessage =>
    overrides as ServiceBusReceivedMessage;

  it('converts Long sequenceNumber to string', () => {
    const msg = makeMsg({ sequenceNumber: Long.fromNumber(42) });
    expect(serializeMessage(msg).sequenceNumber).toBe('42');
  });

  it('converts enqueuedTimeUtc Date to ISO string', () => {
    const date = new Date('2024-06-01T12:00:00Z');
    const msg = makeMsg({ enqueuedTimeUtc: date });
    expect(serializeMessage(msg).enqueuedTimeUtc).toBe('2024-06-01T12:00:00.000Z');
  });

  it('passes body through when already an object', () => {
    const msg = makeMsg({ body: { event: 'test' } });
    expect(serializeMessage(msg).body).toEqual({ event: 'test' });
  });

  it('parses JSON string body', () => {
    const msg = makeMsg({ body: '{"event":"test"}' });
    expect(serializeMessage(msg).body).toEqual({ event: 'test' });
  });

  it('leaves non-JSON string body as string', () => {
    const msg = makeMsg({ body: 'plain text' });
    expect(serializeMessage(msg).body).toBe('plain text');
  });
});
