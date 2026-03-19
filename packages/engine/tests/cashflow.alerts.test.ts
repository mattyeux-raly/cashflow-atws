import { describe, it, expect } from 'vitest';
import { generateAlerts } from '../src/cashflow/cashflow.alerts';
import type { BurnRateResult, ProjectedCashflowPeriod, AlertSettings } from '@cashflow/shared';

const defaultSettings: AlertSettings = {
  runwayCriticalMonths: 2,
  runwayWarningMonths: 4,
  negativeBalanceHorizonDays: 90,
  highBurnRateThreshold: 1.2,
  lateReceivablesDays: 60,
  concentrationRiskPercent: 30,
  seasonalDropPercent: 25,
};

function makeProjection(month: number, scenario: 'realistic' | 'optimistic' | 'pessimistic', closingBalance: number, inflowsTotal: number = 10000): ProjectedCashflowPeriod {
  return {
    periodStart: `2026-${String(month).padStart(2, '0')}-01`,
    periodEnd: `2026-${String(month).padStart(2, '0')}-28`,
    periodType: 'monthly',
    openingBalance: closingBalance - 1000,
    closingBalance,
    inflows: { operating: inflowsTotal, investing: 0, financing: 0, tax: 0, other: 0, total: inflowsTotal },
    outflows: { operating: 9000, investing: 0, financing: 0, tax: 0, other: 0, total: 9000 },
    netCashflow: 1000,
    confidence: 0.9,
    scenario,
  };
}

describe('generateAlerts', () => {
  it('generates RUNWAY_CRITICAL when runway < 2 months', () => {
    const burnRate: BurnRateResult = { burnRateMonthly: 10000, runwayMonths: 1.5, trend: 'degrading' };
    const alerts = generateAlerts(15000, burnRate, [], defaultSettings);
    expect(alerts.some((a) => a.code === 'RUNWAY_CRITICAL')).toBe(true);
    expect(alerts.find((a) => a.code === 'RUNWAY_CRITICAL')?.severity).toBe('critical');
  });

  it('generates RUNWAY_WARNING when runway between 2 and 4 months', () => {
    const burnRate: BurnRateResult = { burnRateMonthly: 10000, runwayMonths: 3, trend: 'stable' };
    const alerts = generateAlerts(30000, burnRate, [], defaultSettings);
    expect(alerts.some((a) => a.code === 'RUNWAY_WARNING')).toBe(true);
    expect(alerts.find((a) => a.code === 'RUNWAY_WARNING')?.severity).toBe('warning');
  });

  it('does not generate runway alerts when runway is sufficient', () => {
    const burnRate: BurnRateResult = { burnRateMonthly: 10000, runwayMonths: 12, trend: 'stable' };
    const alerts = generateAlerts(120000, burnRate, [], defaultSettings);
    expect(alerts.some((a) => a.code === 'RUNWAY_CRITICAL')).toBe(false);
    expect(alerts.some((a) => a.code === 'RUNWAY_WARNING')).toBe(false);
  });

  it('generates NEGATIVE_BALANCE_PROJECTED when balance goes negative', () => {
    const projections = [
      makeProjection(7, 'realistic', 5000),
      makeProjection(8, 'realistic', -2000),
      makeProjection(7, 'optimistic', 8000),
      makeProjection(8, 'optimistic', 3000),
      makeProjection(7, 'pessimistic', 2000),
      makeProjection(8, 'pessimistic', -5000),
    ];
    const burnRate: BurnRateResult = { burnRateMonthly: 10000, runwayMonths: 6, trend: 'stable' };
    const alerts = generateAlerts(10000, burnRate, projections, defaultSettings);
    expect(alerts.some((a) => a.code === 'NEGATIVE_BALANCE_PROJECTED')).toBe(true);
  });

  it('does not generate NEGATIVE_BALANCE_PROJECTED when all projections are positive', () => {
    const projections = [
      makeProjection(7, 'realistic', 50000),
      makeProjection(8, 'realistic', 52000),
      makeProjection(7, 'optimistic', 55000),
      makeProjection(8, 'optimistic', 60000),
      makeProjection(7, 'pessimistic', 45000),
      makeProjection(8, 'pessimistic', 43000),
    ];
    const burnRate: BurnRateResult = { burnRateMonthly: 5000, runwayMonths: 12, trend: 'stable' };
    const alerts = generateAlerts(50000, burnRate, projections, defaultSettings);
    expect(alerts.some((a) => a.code === 'NEGATIVE_BALANCE_PROJECTED')).toBe(false);
  });

  it('generates HIGH_BURN_RATE when expenses exceed threshold', () => {
    const projections = [
      makeProjection(7, 'realistic', 50000, 8000),
      makeProjection(8, 'realistic', 40000, 8000),
    ];
    // Burn rate is 15000 which is > 1.2 * avg inflows (8000)
    const burnRate: BurnRateResult = { burnRateMonthly: 15000, runwayMonths: 5, trend: 'degrading' };
    const alerts = generateAlerts(50000, burnRate, projections, defaultSettings);
    expect(alerts.some((a) => a.code === 'HIGH_BURN_RATE')).toBe(true);
  });

  it('generates SEASONAL_DROP alert', () => {
    const projections = [
      makeProjection(7, 'realistic', 50000, 10000),
      makeProjection(8, 'realistic', 45000, 6000), // 40% drop
      makeProjection(7, 'optimistic', 55000, 12000),
      makeProjection(8, 'optimistic', 50000, 7000),
      makeProjection(7, 'pessimistic', 45000, 8000),
      makeProjection(8, 'pessimistic', 38000, 5000),
    ];
    const burnRate: BurnRateResult = { burnRateMonthly: 5000, runwayMonths: 12, trend: 'stable' };
    const alerts = generateAlerts(50000, burnRate, projections, defaultSettings);
    expect(alerts.some((a) => a.code === 'SEASONAL_DROP')).toBe(true);
  });

  it('returns no alerts for healthy financials', () => {
    const projections = [
      makeProjection(7, 'realistic', 100000, 20000),
      makeProjection(8, 'realistic', 105000, 21000),
      makeProjection(7, 'optimistic', 110000, 22000),
      makeProjection(8, 'optimistic', 120000, 24000),
      makeProjection(7, 'pessimistic', 95000, 18000),
      makeProjection(8, 'pessimistic', 92000, 17500),
    ];
    const burnRate: BurnRateResult = { burnRateMonthly: 8000, runwayMonths: 15, trend: 'improving' };
    const alerts = generateAlerts(100000, burnRate, projections, defaultSettings);
    expect(alerts).toHaveLength(0);
  });

  it('alert messages are in French', () => {
    const burnRate: BurnRateResult = { burnRateMonthly: 10000, runwayMonths: 1, trend: 'degrading' };
    const alerts = generateAlerts(10000, burnRate, [], defaultSettings);
    const critical = alerts.find((a) => a.code === 'RUNWAY_CRITICAL');
    expect(critical?.message).toContain('Trésorerie critique');
  });
});
