import { describe, it, expect } from 'vitest';

import { buildMessage, parseAppProps } from './send.js';

describe('parseAppProps', () => {
  it('parses a single key=value pair', () => {
    expect(parseAppProps(['env=prod'])).toEqual({ env: 'prod' });
  });

  it('parses multiple pairs', () => {
    expect(parseAppProps(['env=prod', 'region=eu'])).toEqual({ env: 'prod', region: 'eu' });
  });

  it('preserves values containing =', () => {
    expect(parseAppProps(['token=abc=def'])).toEqual({ token: 'abc=def' });
  });

  it('allows empty value', () => {
    expect(parseAppProps(['flag='])).toEqual({ flag: '' });
  });

  it('throws when = is missing', () => {
    expect(() => parseAppProps(['noequals'])).toThrow('invalid --app-prop');
  });

  it('returns empty object for empty input', () => {
    expect(parseAppProps([])).toEqual({});
  });
});

describe('buildMessage', () => {
  const baseOpts = { appProp: [] as string[] };

  it('sets body', () => {
    const msg = buildMessage('hello', baseOpts);
    expect(msg.body).toBe('hello');
  });

  it('omits optional fields when not provided', () => {
    const msg = buildMessage('x', baseOpts);
    expect(msg.contentType).toBeUndefined();
    expect(msg.messageId).toBeUndefined();
    expect(msg.correlationId).toBeUndefined();
    expect(msg.sessionId).toBeUndefined();
    expect(msg.subject).toBeUndefined();
    expect(msg.replyTo).toBeUndefined();
    expect(msg.timeToLive).toBeUndefined();
    expect(msg.applicationProperties).toBeUndefined();
  });

  it('sets contentType', () => {
    const msg = buildMessage('{}', { ...baseOpts, contentType: 'application/json' });
    expect(msg.contentType).toBe('application/json');
  });

  it('sets messageId', () => {
    const msg = buildMessage('x', { ...baseOpts, messageId: 'msg-42' });
    expect(msg.messageId).toBe('msg-42');
  });

  it('sets correlationId', () => {
    const msg = buildMessage('x', { ...baseOpts, correlationId: 'corr-1' });
    expect(msg.correlationId).toBe('corr-1');
  });

  it('sets sessionId', () => {
    const msg = buildMessage('x', { ...baseOpts, sessionId: 'sess-a' });
    expect(msg.sessionId).toBe('sess-a');
  });

  it('sets subject', () => {
    const msg = buildMessage('x', { ...baseOpts, subject: 'greeting' });
    expect(msg.subject).toBe('greeting');
  });

  it('sets replyTo', () => {
    const msg = buildMessage('x', { ...baseOpts, replyTo: 'reply-queue' });
    expect(msg.replyTo).toBe('reply-queue');
  });

  it('parses ttl as integer milliseconds', () => {
    const msg = buildMessage('x', { ...baseOpts, ttl: '5000' });
    expect(msg.timeToLive).toBe(5000);
  });

  it('sets applicationProperties from appProp', () => {
    const msg = buildMessage('x', { ...baseOpts, appProp: ['env=prod', 'region=eu'] });
    expect(msg.applicationProperties).toEqual({ env: 'prod', region: 'eu' });
  });
});
