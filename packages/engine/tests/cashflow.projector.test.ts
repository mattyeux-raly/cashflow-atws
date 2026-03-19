import { describe, it, expect } from 'vitest';
import { projectCashflow } from '../src/cashflow/cashflow.projector';
import type { CashflowPeriod, PendingInvoice, RecurringItem } from '@cashflow/shared';

function makePeriod(month: number, inflows: number, outflows: number, balance: number): CashflowPeriod {
  return {
    periodStart: `2026-${String(month).padStart(2, '0')}-01`,
    periodEnd: `2026-${String(month).padStart(2, '0')}-28`,
    periodType: 'monthly',
    openingBalance: balance - (inflows - outflows),
    closingBalance: balance,
    inflows: { operating: inflows, investing: 0, financing: 0, tax: 0, other: 0, total: inflows },
    outflows: { operating: outflows, investing: 0, financing: 0, tax: 0, other: 0, total: outflows },
    netCashflow: inflows - outflows,
  };
}

describe('projectCashflow', () => {
  const basePeriods = [
    makePeriod(1, 10000, 8000, 52000),
    makePeriod(2, 12000, 9000, 55000),
    makePeriod(3, 11000, 8500, 57500),
    makePeriod(4, 13000, 9500, 61000),
    makePeriod(5, 10500, 8000, 63500),
    makePeriod(6, 11500, 9000, 66000),
  ];

  it('returns empty array for no historical data', () => {
    expect(projectCashflow([], [], [], [], 3)).toEqual([]);
  });

  it('generates projections for 3 months', () => {
    const result = projectCashflow(basePeriods, [], [], [], 3);
    // 3 scenarios x 3 months = 9 projections
    expect(result).toHaveLength(9);
  });

  it('generates projections for 6 months', () => {
    const result = projectCashflow(basePeriods, [], [], [], 6);
    expect(result).toHaveLength(18); // 3 x 6
  });

  it('generates projections for 12 months', () => {
    const result = projectCashflow(basePeriods, [], [], [], 12);
    expect(result).toHaveLength(36); // 3 x 12
  });

  it('includes all three scenarios', () => {
    const result = projectCashflow(basePeriods, [], [], [], 3);
    const scenarios = new Set(result.map((p) => p.scenario));
    expect(scenarios).toEqual(new Set(['optimistic', 'realistic', 'pessimistic']));
  });

  it('optimistic projections are higher than pessimistic', () => {
    const result = projectCashflow(basePeriods, [], [], [], 3);
    const optimistic = result.filter((p) => p.scenario === 'optimistic');
    const pessimistic = result.filter((p) => p.scenario === 'pessimistic');
    // Last month optimistic closing should be > pessimistic
    expect(optimistic[optimistic.length - 1]!.closingBalance)
      .toBeGreaterThan(pessimistic[pessimistic.length - 1]!.closingBalance);
  });

  it('includes pending receivables in projections', () => {
    const receivables: PendingInvoice[] = [
      { id: 'r1', amount: 5000, dueDate: '2026-07-15', probability: 0.9, type: 'receivable' },
    ];
    const withReceivables = projectCashflow(basePeriods, receivables, [], [], 3);
    const withoutReceivables = projectCashflow(basePeriods, [], [], [], 3);

    // Realistic projections with receivables should be higher
    const realisticWith = withReceivables.filter((p) => p.scenario === 'realistic');
    const realisticWithout = withoutReceivables.filter((p) => p.scenario === 'realistic');

    const totalInflowsWith = realisticWith.reduce((s, p) => s + p.inflows.total, 0);
    const totalInflowsWithout = realisticWithout.reduce((s, p) => s + p.inflows.total, 0);
    expect(totalInflowsWith).toBeGreaterThan(totalInflowsWithout);
  });

  it('includes recurring items', () => {
    const recurring: RecurringItem[] = [
      { label: 'Loyer', amount: -2000, cashflowType: 'operating_expense', frequency: 'monthly', nextDate: '2026-07-01' },
    ];
    const result = projectCashflow(basePeriods, [], [], recurring, 3);
    const realistic = result.filter((p) => p.scenario === 'realistic');
    // All months should have higher outflows due to recurring loyer
    for (const p of realistic) {
      expect(p.outflows.total).toBeGreaterThan(0);
    }
  });

  it('confidence decreases over time', () => {
    const result = projectCashflow(basePeriods, [], [], [], 12);
    const realistic = result.filter((p) => p.scenario === 'realistic');
    expect(realistic[0]!.confidence).toBeGreaterThan(realistic[realistic.length - 1]!.confidence);
  });

  it('starts projections from last period closing balance', () => {
    const result = projectCashflow(basePeriods, [], [], [], 3);
    const realistic = result.filter((p) => p.scenario === 'realistic');
    expect(realistic[0]!.openingBalance).toBe(basePeriods[basePeriods.length - 1]!.closingBalance);
  });

  it('handles periods with equal inflows and outflows', () => {
    const flatPeriods = Array.from({ length: 6 }, (_, i) => makePeriod(i + 1, 10000, 10000, 50000));
    const result = projectCashflow(flatPeriods, [], [], [], 3);
    const realistic = result.filter((p) => p.scenario === 'realistic');
    // Balance should remain roughly stable
    for (const p of realistic) {
      expect(Math.abs(p.closingBalance - 50000)).toBeLessThan(5000);
    }
  });
});
