import { describe, it, expect } from 'vitest';
import type { RuleProperties } from '@azure/service-bus';

import { toGetRows } from './get.js';

const sqlRule: RuleProperties = {
  name: '$Default',
  filter: { sqlExpression: '1=1' },
  action: {},
};

const sqlRuleWithParams: RuleProperties = {
  name: 'parameterized',
  filter: { sqlExpression: 'Priority = @p', sqlParameters: { '@p': 'high' } },
  action: { sqlExpression: 'SET x = 1', sqlParameters: { x: 1 } },
};

const correlationRule: RuleProperties = {
  name: 'corr-filter',
  filter: {
    correlationId: 'abc',
    messageId: 'msg1',
    subject: 'order',
  },
  action: {},
};

const fullCorrelationRule: RuleProperties = {
  name: 'full-corr',
  filter: {
    correlationId: 'c1',
    messageId: 'm1',
    to: 'dest',
    replyTo: 'src',
    subject: 'subj',
    sessionId: 'sess',
    replyToSessionId: 'rsess',
    contentType: 'application/json',
    applicationProperties: { env: 'prod' },
  },
  action: {},
};

describe('rule get — SQL filter', () => {
  it('includes name and filter type', () => {
    const rows = toGetRows(sqlRule);
    expect(rows).toContainEqual({ label: 'Name', value: '$Default' });
    expect(rows).toContainEqual({ label: 'Filter Type', value: 'sql' });
  });

  it('includes filter SQL expression', () => {
    const rows = toGetRows(sqlRule);
    expect(rows).toContainEqual({ label: 'Filter SQL', value: '1=1' });
  });

  it('omits Filter Params when not set', () => {
    const rows = toGetRows(sqlRule);
    expect(rows.find(r => r.label === 'Filter Params')).toBeUndefined();
  });

  it('includes Filter Params when set', () => {
    const rows = toGetRows(sqlRuleWithParams);
    expect(rows).toContainEqual({ label: 'Filter Params', value: '{"@p":"high"}' });
  });

  it('omits Action SQL when not set', () => {
    const rows = toGetRows(sqlRule);
    expect(rows.find(r => r.label === 'Action SQL')).toBeUndefined();
  });

  it('includes Action SQL when set', () => {
    const rows = toGetRows(sqlRuleWithParams);
    expect(rows).toContainEqual({ label: 'Action SQL', value: 'SET x = 1' });
  });

  it('includes Action Params when set', () => {
    const rows = toGetRows(sqlRuleWithParams);
    expect(rows).toContainEqual({ label: 'Action Params', value: '{"x":1}' });
  });
});

describe('rule get — correlation filter', () => {
  it('shows filter type as correlation', () => {
    const rows = toGetRows(correlationRule);
    expect(rows).toContainEqual({ label: 'Filter Type', value: 'correlation' });
  });

  it('includes set correlation fields', () => {
    const rows = toGetRows(correlationRule);
    expect(rows).toContainEqual({ label: 'Correlation ID', value: 'abc' });
    expect(rows).toContainEqual({ label: 'Message ID', value: 'msg1' });
    expect(rows).toContainEqual({ label: 'Subject', value: 'order' });
  });

  it('omits unset correlation fields', () => {
    const rows = toGetRows(correlationRule);
    expect(rows.find(r => r.label === 'To')).toBeUndefined();
    expect(rows.find(r => r.label === 'Reply To')).toBeUndefined();
    expect(rows.find(r => r.label === 'Session ID')).toBeUndefined();
  });

  it('includes all correlation fields when fully set', () => {
    const rows = toGetRows(fullCorrelationRule);
    expect(rows).toContainEqual({ label: 'Correlation ID', value: 'c1' });
    expect(rows).toContainEqual({ label: 'To', value: 'dest' });
    expect(rows).toContainEqual({ label: 'Reply To', value: 'src' });
    expect(rows).toContainEqual({ label: 'Session ID', value: 'sess' });
    expect(rows).toContainEqual({ label: 'Reply-To Session ID', value: 'rsess' });
    expect(rows).toContainEqual({ label: 'Content Type', value: 'application/json' });
    expect(rows).toContainEqual({ label: 'App Properties', value: '{"env":"prod"}' });
  });
});
