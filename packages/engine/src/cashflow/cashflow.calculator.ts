import {
  startOfDay, startOfWeek, startOfMonth,
  endOfDay, endOfWeek, endOfMonth,
  parseISO, format, isWithinInterval, isBefore, isAfter,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  addDays, addMonths,
} from 'date-fns';
import type {
  Transaction, CashflowPeriod, CashflowBreakdown,
  PeriodType, BfrResult, BurnRateResult,
} from '@cashflow/shared';

function createEmptyBreakdown(): CashflowBreakdown {
  return { operating: 0, investing: 0, financing: 0, tax: 0, other: 0, total: 0 };
}

function addToBreakdown(breakdown: CashflowBreakdown, type: Transaction['cashflowType'], amount: number): void {
  switch (type) {
    case 'operating_income':
    case 'operating_expense':
      breakdown.operating += amount;
      break;
    case 'investing_income':
    case 'investing_expense':
      breakdown.investing += amount;
      break;
    case 'financing_income':
    case 'financing_expense':
      breakdown.financing += amount;
      break;
    case 'tax':
      breakdown.tax += amount;
      break;
    default:
      breakdown.other += amount;
  }
  breakdown.total += amount;
}

function getPeriodBoundaries(date: Date, periodType: PeriodType): { start: Date; end: Date } {
  switch (periodType) {
    case 'daily':
      return { start: startOfDay(date), end: endOfDay(date) };
    case 'weekly':
      return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
    case 'monthly':
      return { start: startOfMonth(date), end: endOfMonth(date) };
  }
}

function getPeriodStarts(start: Date, end: Date, periodType: PeriodType): Date[] {
  switch (periodType) {
    case 'daily':
      return eachDayOfInterval({ start, end });
    case 'weekly':
      return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    case 'monthly':
      return eachMonthOfInterval({ start, end });
  }
}

// REQUIREMENT: Compute realized cashflow by period
export function computeCashflow(
  transactions: Transaction[],
  periodType: PeriodType,
  openingBalance: number,
): CashflowPeriod[] {
  if (transactions.length === 0) return [];

  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = parseISO(sorted[0]!.date);
  const lastDate = parseISO(sorted[sorted.length - 1]!.date);

  const periodStarts = getPeriodStarts(firstDate, lastDate, periodType);
  const periods: CashflowPeriod[] = [];
  let currentBalance = openingBalance;

  for (const periodStart of periodStarts) {
    const { start, end } = getPeriodBoundaries(periodStart, periodType);
    const inflows = createEmptyBreakdown();
    const outflows = createEmptyBreakdown();

    for (const tx of sorted) {
      const txDate = parseISO(tx.date);
      if (isWithinInterval(txDate, { start, end })) {
        if (tx.amount >= 0) {
          addToBreakdown(inflows, tx.cashflowType, tx.amount);
        } else {
          addToBreakdown(outflows, tx.cashflowType, Math.abs(tx.amount));
        }
      }
    }

    const netCashflow = inflows.total - outflows.total;
    const closingBalance = currentBalance + netCashflow;

    periods.push({
      periodStart: format(start, 'yyyy-MM-dd'),
      periodEnd: format(end, 'yyyy-MM-dd'),
      periodType,
      openingBalance: Math.round(currentBalance * 100) / 100,
      closingBalance: Math.round(closingBalance * 100) / 100,
      inflows: roundBreakdown(inflows),
      outflows: roundBreakdown(outflows),
      netCashflow: Math.round(netCashflow * 100) / 100,
    });

    currentBalance = closingBalance;
  }

  return periods;
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

// REQUIREMENT: Compute BFR (Working Capital Requirement) from transactions
export function computeBFR(
  receivables: number,
  payables: number,
  inventory: number,
  previousBfr?: number,
): BfrResult {
  const bfr = receivables - payables + inventory;
  return {
    creancesClients: receivables,
    dettesFournisseurs: payables,
    stocks: inventory,
    bfr,
    variationBFR: previousBfr !== undefined ? bfr - previousBfr : 0,
  };
}

// REQUIREMENT: Compute burn rate and runway from cashflow periods
export function computeBurnRate(periods: CashflowPeriod[]): BurnRateResult {
  if (periods.length === 0) {
    return { burnRateMonthly: 0, runwayMonths: Infinity, trend: 'stable' };
  }

  // PERF: Use only the last 6 periods (or less) with weighted average
  const recentPeriods = periods.slice(-6);
  const weights = recentPeriods.map((_, i) => i + 1);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let weightedOutflow = 0;
  for (let i = 0; i < recentPeriods.length; i++) {
    weightedOutflow += recentPeriods[i]!.outflows.total * weights[i]!;
  }
  const burnRateMonthly = Math.round((weightedOutflow / totalWeight) * 100) / 100;

  const lastBalance = recentPeriods[recentPeriods.length - 1]!.closingBalance;
  const netBurn = burnRateMonthly - (recentPeriods.reduce((sum, p) => sum + p.inflows.total, 0) / recentPeriods.length);
  const runwayMonths = netBurn > 0
    ? Math.round((lastBalance / netBurn) * 10) / 10
    : Infinity;

  // Trend detection: compare first half vs second half of periods
  let trend: BurnRateResult['trend'] = 'stable';
  if (recentPeriods.length >= 4) {
    const mid = Math.floor(recentPeriods.length / 2);
    const firstHalfAvg = recentPeriods.slice(0, mid).reduce((s, p) => s + p.netCashflow, 0) / mid;
    const secondHalfAvg = recentPeriods.slice(mid).reduce((s, p) => s + p.netCashflow, 0) / (recentPeriods.length - mid);
    const changePercent = firstHalfAvg !== 0 ? (secondHalfAvg - firstHalfAvg) / Math.abs(firstHalfAvg) : 0;

    if (changePercent > 0.1) trend = 'improving';
    else if (changePercent < -0.1) trend = 'degrading';
  }

  return { burnRateMonthly, runwayMonths, trend };
}
