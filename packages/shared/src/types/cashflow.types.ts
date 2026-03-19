// REQUIREMENT: Core cashflow and treasury types

export type CashflowType =
  | 'operating_income'
  | 'operating_expense'
  | 'investing_income'
  | 'investing_expense'
  | 'financing_income'
  | 'financing_expense'
  | 'tax'
  | 'other';

export type PeriodType = 'daily' | 'weekly' | 'monthly';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type TransactionSource = 'pennylane' | 'manual' | 'import';

export interface Transaction {
  id: string;
  companyId: string;
  pennylaneId: string | null;
  date: string;
  label: string;
  amount: number;
  currency: string;
  category: string | null;
  subcategory: string | null;
  cashflowType: CashflowType;
  bankAccount: string | null;
  isReconciled: boolean;
  pennylaneMetadata: Record<string, unknown>;
  source: TransactionSource;
  createdAt: string;
  updatedAt: string;
}

export interface CashflowBreakdown {
  operating: number;
  investing: number;
  financing: number;
  tax: number;
  other: number;
  total: number;
}

export interface CashflowPeriod {
  periodStart: string;
  periodEnd: string;
  periodType: PeriodType;
  openingBalance: number;
  closingBalance: number;
  inflows: CashflowBreakdown;
  outflows: CashflowBreakdown;
  netCashflow: number;
}

export interface CashflowSnapshot {
  id: string;
  companyId: string;
  periodStart: string;
  periodEnd: string;
  periodType: PeriodType;
  openingBalance: number;
  closingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  netCashflow: number;
  operatingInflows: number;
  operatingOutflows: number;
  investingInflows: number;
  investingOutflows: number;
  financingInflows: number;
  financingOutflows: number;
  taxOutflows: number;
  projectedBalance30d: number | null;
  projectedBalance90d: number | null;
  projectedBalance180d: number | null;
  burnRateMonthly: number | null;
  runwayMonths: number | null;
  computedAt: string;
}

export interface ProjectedCashflowPeriod extends CashflowPeriod {
  confidence: number;
  scenario: 'optimistic' | 'realistic' | 'pessimistic';
}

export interface PendingInvoice {
  id: string;
  amount: number;
  dueDate: string;
  probability: number;
  type: 'receivable' | 'payable';
}

export interface RecurringItem {
  label: string;
  amount: number;
  cashflowType: CashflowType;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  nextDate: string;
}

export interface BfrResult {
  creancesClients: number;
  dettesFournisseurs: number;
  stocks: number;
  bfr: number;
  variationBFR: number;
}

export interface BurnRateResult {
  burnRateMonthly: number;
  runwayMonths: number;
  trend: 'improving' | 'stable' | 'degrading';
}

export interface CashflowAlert {
  severity: AlertSeverity;
  code: string;
  message: string;
  value: number;
  threshold: number;
}

export interface AlertSettings {
  runwayCriticalMonths: number;
  runwayWarningMonths: number;
  negativeBalanceHorizonDays: number;
  highBurnRateThreshold: number;
  lateReceivablesDays: number;
  concentrationRiskPercent: number;
  seasonalDropPercent: number;
}

// REQUIREMENT: User override for automatic PCG→cashflow type mapping
export interface PcgMappingOverride {
  id: string;
  companyId: string;
  accountPrefix: string;
  originalType: CashflowType;
  overrideType: CashflowType;
  overrideLabel: string | null;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  runwayCriticalMonths: 2,
  runwayWarningMonths: 4,
  negativeBalanceHorizonDays: 90,
  highBurnRateThreshold: 1.2,
  lateReceivablesDays: 60,
  concentrationRiskPercent: 30,
  seasonalDropPercent: 25,
};
