import { describe, it, expect } from 'vitest';
import type { RuleProperties } from '@azure/service-bus';

import { toRuleRows } from './list.js';

const sqlRule: RuleProperties = {
  name: '$Default',
  filter: { sqlExpression: '1=1' },
  action: {},
};

const sqlRuleWithAction: RuleProperties = {
  name: 'priority-filter',
  filter: { sqlExpression: "Priority = 'high'" },
  action: { sqlExpression: "SET sys.label = 'vip'" },
};

const correlationRule: RuleProperties = {
  name: 'corr-filter',
  filter: { correlationId: 'abc', subject: 'order' },
  action: {},
};

const emptyCorrelationRule: RuleProperties = {
  name: 'match-all',
  filter: {},
  action: {},
};

describe('toRuleRows', () => {
  it('returns sql filter type for SqlRuleFilter', () => {
    const [[, type]] = toRuleRows([sqlRule]);
    expect(type).toBe('sql');
  });

  it('returns the sql expression in the filter column', () => {
    const [[, , expr]] = toRuleRows([sqlRule]);
    expect(expr).toBe('1=1');
  });

  it('shows "-" action when no sqlExpression on action', () => {
    const [[, , , action]] = toRuleRows([sqlRule]);
    expect(action).toBe('-');
  });

  it('shows action sqlExpression when present', () => {
    const [[, , , action]] = toRuleRows([sqlRuleWithAction]);
    expect(action).toBe("SET sys.label = 'vip'");
  });

  it('returns correlation filter type for CorrelationRuleFilter', () => {
    const [[, type]] = toRuleRows([correlationRule]);
    expect(type).toBe('correlation');
  });

  it('includes set correlation fields in the filter column', () => {
    const [[, , expr]] = toRuleRows([correlationRule]);
    expect(expr).toContain('correlationId=abc');
    expect(expr).toContain('subject=order');
  });

  it('shows "(any)" for an empty correlation filter', () => {
    const [[, , expr]] = toRuleRows([emptyCorrelationRule]);
    expect(expr).toBe('(any)');
  });

  it('maps multiple rules to multiple rows', () => {
    const rows = toRuleRows([sqlRule, correlationRule]);
    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toBe('$Default');
    expect(rows[1][0]).toBe('corr-filter');
  });

  it('returns empty array for no rules', () => {
    expect(toRuleRows([])).toEqual([]);
  });
});
