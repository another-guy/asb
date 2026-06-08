import { describe, it, expect, vi, afterEach } from 'vitest';

import { parseTarget, printNode, formatStats } from './index.js';
import type { TreeNode } from './index.js';

const strip = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, '');

describe('tree', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseTarget', () => {
    it('extracts the topic name', () => {
      expect(parseTarget('topics/orders')).toBe('orders');
    });

    it('handles topic names with hyphens', () => {
      expect(parseTarget('topics/my-topic-name')).toBe('my-topic-name');
    });

    it('throws on missing topics/ prefix', () => {
      expect(() => parseTarget('orders')).toThrow('invalid target');
    });

    it('throws on wrong prefix', () => {
      expect(() => parseTarget('queues/my-queue')).toThrow('invalid target');
    });
  });

  describe('printNode', () => {
    function capture(): string[] {
      const lines: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
        lines.push(String(args[0]));
      });
      return lines;
    }

    it('prints root label on first line', () => {
      const lines = capture();
      const node: TreeNode = { label: 'my-ns', children: [] };
      printNode(node);
      expect(strip(lines[0])).toBe('my-ns');
    });

    it('renders a flat list of children', () => {
      const lines = capture();
      const node: TreeNode = {
        label: 'root',
        children: [
          { label: 'alpha', children: [] },
          { label: 'beta', children: [] },
        ],
      };
      printNode(node);
      expect(strip(lines[1])).toBe('├── alpha');
      expect(strip(lines[2])).toBe('└── beta');
    });

    it('uses └── for the last child at each level', () => {
      const lines = capture();
      const node: TreeNode = {
        label: 'root',
        children: [{ label: 'only', children: [] }],
      };
      printNode(node);
      expect(strip(lines[1])).toBe('└── only');
    });

    it('indents grandchildren correctly under a non-last parent', () => {
      const lines = capture();
      const node: TreeNode = {
        label: 'ns',
        children: [
          {
            label: 'queues',
            children: [
              { label: 'q1', children: [] },
              { label: 'q2', children: [] },
            ],
          },
          { label: 'topics', children: [] },
        ],
      };
      printNode(node);
      // queues is not last, so continuation is │
      expect(strip(lines[2])).toBe('│   ├── q1');
      expect(strip(lines[3])).toBe('│   └── q2');
    });

    it('indents grandchildren correctly under a last parent', () => {
      const lines = capture();
      const node: TreeNode = {
        label: 'ns',
        children: [
          {
            label: 'topics',
            children: [
              { label: 't1', children: [] },
              { label: 't2', children: [] },
            ],
          },
        ],
      };
      printNode(node);
      // topics is last, so continuation is spaces
      expect(strip(lines[2])).toBe('    ├── t1');
      expect(strip(lines[3])).toBe('    └── t2');
    });
  });

  describe('formatStats', () => {
    it('returns empty string for undefined', () => {
      expect(formatStats(undefined)).toBe('');
    });

    it('shows dim 0 when active is zero', () => {
      const result = strip(formatStats({ activeMessageCount: 0, deadLetterMessageCount: 0, scheduledMessageCount: 0 }));
      expect(result).toBe('  0');
    });

    it('shows active count when greater than zero', () => {
      const result = strip(formatStats({ activeMessageCount: 5, deadLetterMessageCount: 0, scheduledMessageCount: 0 }));
      expect(result).toBe('  5');
    });

    it('appends dlq count when greater than zero', () => {
      const result = strip(formatStats({ activeMessageCount: 0, deadLetterMessageCount: 3, scheduledMessageCount: 0 }));
      expect(result).toContain('3dlq');
    });

    it('omits dlq when zero', () => {
      const result = strip(formatStats({ activeMessageCount: 5, deadLetterMessageCount: 0, scheduledMessageCount: 0 }));
      expect(result).not.toContain('dlq');
    });

    it('appends sched count when greater than zero', () => {
      const result = strip(formatStats({ activeMessageCount: 0, deadLetterMessageCount: 0, scheduledMessageCount: 2 }));
      expect(result).toContain('2sched');
    });

    it('omits sched when zero', () => {
      const result = strip(formatStats({ activeMessageCount: 5, deadLetterMessageCount: 0, scheduledMessageCount: 0 }));
      expect(result).not.toContain('sched');
    });

    it('shows all three when all non-zero', () => {
      const result = strip(formatStats({ activeMessageCount: 5, deadLetterMessageCount: 2, scheduledMessageCount: 1 }));
      expect(result).toContain('5');
      expect(result).toContain('2dlq');
      expect(result).toContain('1sched');
    });
  });
});
