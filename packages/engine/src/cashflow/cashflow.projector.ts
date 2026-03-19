import { addMonths, format, parseISO, differenceInMonths } from 'date-fns';
import type {
  CashflowPeriod, ProjectedCashflowPeriod,
  PendingInvoice, RecurringItem, CashflowBreakdown,
} from '@cashflow/shared';

function createEmptyBreakdown(): CashflowBreakdown {
  return { operating: 0, investing: 0, financing: 0, tax: 0, other: 0, total: 0 };
}

// REQUIREMENT: Weighted moving average of last N periods
function weightedAverage(values: number[], weights?: number[]): number {
  if (values.length === 0) return 0;
  const w = weights ?? values.map((_, i) => i + 1);
  const totalWeight = w.reduce((sum, v) => sum + v, 0);
  return values.reduce((sum, v, i) => sum + v * (w[i] ?? 1), 0) / totalWeight;
}

// REQUIREMENT: Detect seasonality by comparing month M vs M-12
function detectSeasonalFactor(
  historicalPeriods: CashflowPeriod[],
  targetMonth: number,
): number {
  const sameMonthPeriods = historicalPeriods.filter(
    (p) => parseISO(p.periodStart).getMonth() + 1 === targetMonth,
  );
  if (sameMonthPeriods.length === 0) return 1;

  const overallAvg = historicalPeriods.reduce((s, p) => s + p.inflows.total, 0) / historicalPeriods.length;
  const monthAvg = sameMonthPeriods.reduce((s, p) => s + p.inflows.total, 0) / sameMonthPeriods.length;

  return overallAvg > 0 ? monthAvg / overallAvg : 1;
}

// REQUIREMENT: Project cashflow for 3/6/12 months
export function projectCashflow(
  historicalPeriods: CashflowPeriod[],
  pendingReceivables: PendingInvoice[],
  pendingPayables: PendingInvoice[],
  recurringItems: RecurringItem[],
  horizonMonths: 3 | 6 | 12,
): ProjectedCashflowPeriod[] {
  if (historicalPeriods.length === 0) return [];

  const lastPeriod = historicalPeriods[historicalPeriods.length - 1]!;
  const recentPeriods = historicalPeriods.slice(-6);

  const avgInflows = weightedAverage(recentPeriods.map((p) => p.inflows.total));
  const avgOutflows = weightedAverage(recentPeriods.map((p) => p.outflows.total));

  const lastDate = parseISO(lastPeriod.periodEnd);
  let currentBalance = lastPeriod.closingBalance;

  const scenarios: Array<{ factor: number; scenario: ProjectedCashflowPeriod['scenario'] }> = [
    { factor: 1.1, scenario: 'optimistic' },
    { factor: 1.0, scenario: 'realistic' },
    { factor: 0.85, scenario: 'pessimistic' },
  ];

  const projections: ProjectedCashflowPeriod[] = [];

  for (const { factor, scenario } of scenarios) {
    let balance = currentBalance;

    for (let m = 1; m <= horizonMonths; m++) {
      const periodStart = addMonths(lastDate, m - 1);
      const periodEnd = addMonths(lastDate, m);
      const targetMonth = periodStart.getMonth() + 1;
      const seasonalFactor = detectSeasonalFactor(historicalPeriods, targetMonth);

      const inflows = createEmptyBreakdown();
      const outflows = createEmptyBreakdown();

      // Base projection from historical averages with seasonal adjustment
      inflows.operating = avgInflows * factor * seasonalFactor;
      outflows.operating = avgOutflows * (2 - factor); // Pessimistic = higher expenses

      // Add pending receivables due this month
      for (const recv of pendingReceivables) {
        const due = parseISO(recv.dueDate);
        if (differenceInMonths(due, periodStart) === 0) {
          inflows.operating += recv.amount * recv.probability;
        }
      }

      // Add pending payables due this month
      for (const pay of pendingPayables) {
        const due = parseISO(pay.dueDate);
        if (differenceInMonths(due, periodStart) === 0) {
          outflows.operating += pay.amount * pay.probability;
        }
      }

      // Add recurring items
      for (const item of recurringItems) {
        const shouldInclude =
          item.frequency === 'monthly' ||
          (item.frequency === 'quarterly' && m % 3 === 0) ||
          (item.frequency === 'yearly' && m % 12 === 0);

        if (shouldInclude) {
          if (item.amount >= 0) {
            inflows.operating += item.amount;
          } else {
            outflows.operating += Math.abs(item.amount);
          }
        }
      }

      inflows.total = inflows.operating + inflows.investing + inflows.financing + inflows.tax + inflows.other;
      outflows.total = outflows.operating + outflows.investing + outflows.financing + outflows.tax + outflows.other;

      const netCashflow = inflows.total - outflows.total;
      const closingBalance = balance + netCashflow;

      // Confidence decreases with time horizon
      const confidence = Math.max(0.3, 1 - m * 0.05);

      projections.push({
        periodStart: format(periodStart, 'yyyy-MM-dd'),
        periodEnd: format(periodEnd, 'yyyy-MM-dd'),
        periodType: 'monthly',
        openingBalance: Math.round(balance * 100) / 100,
        closingBalance: Math.round(closingBalance * 100) / 100,
        inflows: roundBreakdown(inflows),
        outflows: roundBreakdown(outflows),
        netCashflow: Math.round(netCashflow * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
        scenario,
      });

      balance = closingBalance;
    }
  }

  return projections;
}

function roundBreakdown(b: CashflowBreakdown): CashflowBreakdown {
  return {
    operating: Math.round(b.operating * 100) / 100,
    investing: Math.round(b.investing * 100) / 100,
    financing: Math.round(b.financing * 100) / 100,
    tax: Math.round(b.tax * 100) / 100,
    other: Math.round(b.other * 100) / 100,
    total: Math.round(b.total * 100) / 100,
  };
}
