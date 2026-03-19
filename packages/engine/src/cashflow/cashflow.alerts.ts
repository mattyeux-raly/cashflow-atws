import type {
  CashflowAlert, AlertSettings, CashflowPeriod,
  ProjectedCashflowPeriod, BurnRateResult,
  DEFAULT_ALERT_SETTINGS,
} from '@cashflow/shared';

// REQUIREMENT: Generate treasury alerts in French
export function generateAlerts(
  currentBalance: number,
  burnRate: BurnRateResult,
  projections: ProjectedCashflowPeriod[],
  settings: AlertSettings,
): CashflowAlert[] {
  const alerts: CashflowAlert[] = [];

  // RUNWAY_CRITICAL
  if (burnRate.runwayMonths !== Infinity && burnRate.runwayMonths < settings.runwayCriticalMonths) {
    alerts.push({
      severity: 'critical',
      code: 'RUNWAY_CRITICAL',
      message: `Trésorerie critique : seulement ${burnRate.runwayMonths.toFixed(1)} mois de trésorerie restants`,
      value: burnRate.runwayMonths,
      threshold: settings.runwayCriticalMonths,
    });
  }
  // RUNWAY_WARNING
  else if (burnRate.runwayMonths !== Infinity && burnRate.runwayMonths < settings.runwayWarningMonths) {
    alerts.push({
      severity: 'warning',
      code: 'RUNWAY_WARNING',
      message: `Attention : ${burnRate.runwayMonths.toFixed(1)} mois de trésorerie restants`,
      value: burnRate.runwayMonths,
      threshold: settings.runwayWarningMonths,
    });
  }

  // NEGATIVE_BALANCE_PROJECTED
  const realisticProjections = projections.filter(
    (p) => p.scenario === 'realistic',
  );
  const negativeProjection = realisticProjections.find(
    (p) => p.closingBalance < 0,
  );
  if (negativeProjection) {
    alerts.push({
      severity: 'critical',
      code: 'NEGATIVE_BALANCE_PROJECTED',
      message: `Solde négatif prévu le ${negativeProjection.periodStart} : ${negativeProjection.closingBalance.toFixed(2)} €`,
      value: negativeProjection.closingBalance,
      threshold: 0,
    });
  }

  // HIGH_BURN_RATE
  const avgInflows = realisticProjections.length > 0
    ? realisticProjections.reduce((s, p) => s + p.inflows.total, 0) / realisticProjections.length
    : 0;
  if (avgInflows > 0 && burnRate.burnRateMonthly > avgInflows * settings.highBurnRateThreshold) {
    alerts.push({
      severity: 'warning',
      code: 'HIGH_BURN_RATE',
      message: `Taux de dépenses élevé : ${burnRate.burnRateMonthly.toFixed(0)} €/mois (>${(settings.highBurnRateThreshold * 100).toFixed(0)}% du CA moyen)`,
      value: burnRate.burnRateMonthly,
      threshold: avgInflows * settings.highBurnRateThreshold,
    });
  }

  // SEASONAL_DROP
  if (realisticProjections.length >= 2) {
    for (let i = 1; i < realisticProjections.length; i++) {
      const prev = realisticProjections[i - 1]!;
      const curr = realisticProjections[i]!;
      if (prev.inflows.total > 0) {
        const drop = (prev.inflows.total - curr.inflows.total) / prev.inflows.total;
        if (drop > settings.seasonalDropPercent / 100) {
          alerts.push({
            severity: 'info',
            code: 'SEASONAL_DROP',
            message: `Baisse saisonnière de ${(drop * 100).toFixed(0)}% prévue en ${curr.periodStart.slice(0, 7)}`,
            value: drop * 100,
            threshold: settings.seasonalDropPercent,
          });
          break; // Only report the first seasonal drop
        }
      }
    }
  }

  return alerts;
}
