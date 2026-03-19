import { describe, it, expect } from 'vitest';
import { computeCashflow, computeBFR, computeBurnRate } from '../src/cashflow/cashflow.calculator';
import { categorizeByLabel } from '../src/cashflow/cashflow.categorizer';
import type { Transaction, CashflowPeriod } from '@cashflow/shared';

function makeTx(overrides: Partial<Transaction> & { date: string; amount: number; cashflowType: Transaction['cashflowType'] }): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    companyId: 'company-1',
    pennylaneId: null,
    label: 'Test transaction',
    currency: 'EUR',
    category: null,
    subcategory: null,
    bankAccount: null,
    isReconciled: false,
    pennylaneMetadata: {},
    source: 'manual',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('computeCashflow', () => {
  it('returns empty array for no transactions', () => {
    expect(computeCashflow([], 'monthly', 0)).toEqual([]);
  });

  it('computes monthly cashflow with mixed transactions', () => {
    const transactions = [
      makeTx({ date: '2026-01-05', amount: 5000, cashflowType: 'operating_income' }),
      makeTx({ date: '2026-01-10', amount: -2000, cashflowType: 'operating_expense' }),
      makeTx({ date: '2026-01-15', amount: -500, cashflowType: 'tax' }),
    ];
    const result = computeCashflow(transactions, 'monthly', 10000);
    expect(result).toHaveLength(1);
    expect(result[0]!.openingBalance).toBe(10000);
    expect(result[0]!.inflows.total).toBe(5000);
    expect(result[0]!.outflows.total).toBe(2500);
    expect(result[0]!.netCashflow).toBe(2500);
    expect(result[0]!.closingBalance).toBe(12500);
  });

  it('propagates opening balance correctly across months', () => {
    const transactions = [
      makeTx({ date: '2026-01-15', amount: 3000, cashflowType: 'operating_income' }),
      makeTx({ date: '2026-02-15', amount: -1000, cashflowType: 'operating_expense' }),
    ];
    const result = computeCashflow(transactions, 'monthly', 5000);
    expect(result).toHaveLength(2);
    expect(result[0]!.openingBalance).toBe(5000);
    expect(result[0]!.closingBalance).toBe(8000);
    expect(result[1]!.openingBalance).toBe(8000);
    expect(result[1]!.closingBalance).toBe(7000);
  });

  it('handles period with zero transactions correctly', () => {
    const transactions = [
      makeTx({ date: '2026-01-15', amount: 1000, cashflowType: 'operating_income' }),
      makeTx({ date: '2026-03-15', amount: 2000, cashflowType: 'operating_income' }),
    ];
    const result = computeCashflow(transactions, 'monthly', 0);
    expect(result).toHaveLength(3);
    // February should have zero net cashflow
    expect(result[1]!.netCashflow).toBe(0);
    expect(result[1]!.openingBalance).toBe(result[1]!.closingBalance);
  });

  it('categorizes inflows and outflows correctly by type', () => {
    const transactions = [
      makeTx({ date: '2026-01-05', amount: 5000, cashflowType: 'operating_income' }),
      makeTx({ date: '2026-01-10', amount: -1000, cashflowType: 'investing_expense' }),
      makeTx({ date: '2026-01-15', amount: -500, cashflowType: 'financing_expense' }),
      makeTx({ date: '2026-01-20', amount: -300, cashflowType: 'tax' }),
    ];
    const result = computeCashflow(transactions, 'monthly', 0);
    expect(result[0]!.inflows.operating).toBe(5000);
    expect(result[0]!.outflows.investing).toBe(1000);
    expect(result[0]!.outflows.financing).toBe(500);
    expect(result[0]!.outflows.tax).toBe(300);
  });

  it('handles negative amounts as outflows', () => {
    const transactions = [
      makeTx({ date: '2026-01-05', amount: -1500, cashflowType: 'operating_expense' }),
    ];
    const result = computeCashflow(transactions, 'monthly', 10000);
    expect(result[0]!.outflows.total).toBe(1500);
    expect(result[0]!.closingBalance).toBe(8500);
  });

  it('handles daily period type', () => {
    const transactions = [
      makeTx({ date: '2026-01-01', amount: 100, cashflowType: 'operating_income' }),
      makeTx({ date: '2026-01-01', amount: -50, cashflowType: 'operating_expense' }),
      makeTx({ date: '2026-01-02', amount: 200, cashflowType: 'operating_income' }),
    ];
    const result = computeCashflow(transactions, 'daily', 0);
    expect(result).toHaveLength(2);
    expect(result[0]!.netCashflow).toBe(50);
    expect(result[1]!.netCashflow).toBe(200);
  });

  it('handles weekly period type', () => {
    const transactions = [
      makeTx({ date: '2026-01-05', amount: 1000, cashflowType: 'operating_income' }),
      makeTx({ date: '2026-01-12', amount: 2000, cashflowType: 'operating_income' }),
    ];
    const result = computeCashflow(transactions, 'weekly', 0);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('rounds amounts to 2 decimal places', () => {
    const transactions = [
      makeTx({ date: '2026-01-05', amount: 1000.555, cashflowType: 'operating_income' }),
      makeTx({ date: '2026-01-10', amount: -333.333, cashflowType: 'operating_expense' }),
    ];
    const result = computeCashflow(transactions, 'monthly', 0);
    expect(result[0]!.inflows.total).toBe(1000.56);
    expect(result[0]!.outflows.total).toBe(333.33);
  });

  it('handles large number of transactions', () => {
    const transactions = Array.from({ length: 100 }, (_, i) =>
      makeTx({
        date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
        amount: i % 2 === 0 ? 100 : -50,
        cashflowType: i % 2 === 0 ? 'operating_income' : 'operating_expense',
      }),
    );
    const result = computeCashflow(transactions, 'monthly', 0);
    expect(result).toHaveLength(1);
    expect(result[0]!.inflows.total).toBe(5000); // 50 * 100
    expect(result[0]!.outflows.total).toBe(2500); // 50 * 50
  });

  it('handles single transaction', () => {
    const transactions = [
      makeTx({ date: '2026-06-15', amount: 42.50, cashflowType: 'other' }),
    ];
    const result = computeCashflow(transactions, 'monthly', 100);
    expect(result).toHaveLength(1);
    expect(result[0]!.closingBalance).toBe(142.50);
  });

  it('handles financing income correctly', () => {
    const transactions = [
      makeTx({ date: '2026-01-05', amount: 50000, cashflowType: 'financing_income' }),
    ];
    const result = computeCashflow(transactions, 'monthly', 0);
    expect(result[0]!.inflows.financing).toBe(50000);
    expect(result[0]!.closingBalance).toBe(50000);
  });

  it('computes across multiple months with various types', () => {
    const transactions = [
      makeTx({ date: '2026-01-05', amount: 10000, cashflowType: 'operating_income' }),
      makeTx({ date: '2026-01-15', amount: -3000, cashflowType: 'operating_expense' }),
      makeTx({ date: '2026-02-05', amount: 8000, cashflowType: 'operating_income' }),
      makeTx({ date: '2026-02-15', amount: -4000, cashflowType: 'operating_expense' }),
      makeTx({ date: '2026-02-20', amount: -1000, cashflowType: 'tax' }),
      makeTx({ date: '2026-03-05', amount: 12000, cashflowType: 'operating_income' }),
      makeTx({ date: '2026-03-10', amount: -5000, cashflowType: 'investing_expense' }),
    ];
    const result = computeCashflow(transactions, 'monthly', 20000);
    expect(result).toHaveLength(3);
    // Jan: 20000 + 10000 - 3000 = 27000
    expect(result[0]!.closingBalance).toBe(27000);
    // Feb: 27000 + 8000 - 4000 - 1000 = 30000
    expect(result[1]!.closingBalance).toBe(30000);
    // Mar: 30000 + 12000 - 5000 = 37000
    expect(result[2]!.closingBalance).toBe(37000);
  });
});

describe('categorizeByLabel', () => {
  it('categorizes bank receipts as operating_income', () => {
    expect(categorizeByLabel('VIR RECU CLIENT HOTEL BELLEVUE', 4100).type).toBe('operating_income');
    expect(categorizeByLabel('ENCAISSEMENT CB VENTES COMPTOIR', 3850).type).toBe('operating_income');
    expect(categorizeByLabel('REMISE CHEQUE CLIENT MARTIN', 2000).type).toBe('operating_income');
  });

  it('categorizes rent and salary as operating_expense', () => {
    expect(categorizeByLabel('LOYER LOCAL COMMERCIAL OCT 2025', -1800).type).toBe('operating_expense');
    expect(categorizeByLabel('VIREMENT PAIE SALAIRES OCTOBRE', -5200).type).toBe('operating_expense');
    expect(categorizeByLabel('URSSAF COTISATIONS T3 2025', -2340).type).toBe('operating_expense');
  });

  it('categorizes utilities and insurance as operating_expense', () => {
    expect(categorizeByLabel('EDF ELECTRICITE PRELEVEMENT', -410).type).toBe('operating_expense');
    expect(categorizeByLabel('MAIF ASSURANCE LOCAL PRELEVEMENT', -320).type).toBe('operating_expense');
  });

  it('categorizes loan repayments as financing_expense', () => {
    expect(categorizeByLabel('REMBOURSEMENT EMPRUNT BPI FRANCE', -850).type).toBe('financing_expense');
    expect(categorizeByLabel('INTERETS LIVRET PRO BNP', -85).type).toBe('financing_expense');
  });

  it('categorizes equipment purchases as investing_expense', () => {
    expect(categorizeByLabel('ACHAT FOUR PROFESSIONNEL EQUIPEMENT', -12000).type).toBe('investing_expense');
    expect(categorizeByLabel('TRAVAUX AMENAGEMENT LOCAL', -5000).type).toBe('investing_expense');
  });

  it('categorizes tax payments as tax', () => {
    expect(categorizeByLabel('DGFIP TVA A REVERSER NOV 2025', -1250).type).toBe('tax');
    expect(categorizeByLabel('TRESOR PUBLIC IMPOT SOCIETES', -3000).type).toBe('tax');
    expect(categorizeByLabel('CFE COTISATION FONCIERE', -500).type).toBe('tax');
  });

  it('falls back to operating_income for positive unknown amounts', () => {
    expect(categorizeByLabel('VIREMENT INCONNU REF 12345', 500).type).toBe('operating_income');
  });

  it('falls back to other for negative unknown amounts', () => {
    expect(categorizeByLabel('PRELEVEMENT INCONNU REF 99999', -100).type).toBe('other');
  });

  it('applies custom rules with priority over defaults', () => {
    const customRules = [
      { keywords: ['boulangerie'], type: 'operating_income' as const, label: 'Ventes boulangerie' },
    ];
    const result = categorizeByLabel('BOULANGERIE MARTIN PAIEMENT', 500, customRules);
    expect(result.type).toBe('operating_income');
    expect(result.ruleLabel).toBe('Ventes boulangerie');
  });
});

describe('computeBFR', () => {
  it('computes BFR correctly', () => {
    const result = computeBFR(50000, 30000, 10000);
    expect(result.bfr).toBe(30000); // 50000 - 30000 + 10000
    expect(result.creancesClients).toBe(50000);
    expect(result.dettesFournisseurs).toBe(30000);
    expect(result.stocks).toBe(10000);
  });

  it('computes BFR variation', () => {
    const result = computeBFR(50000, 30000, 10000, 25000);
    expect(result.variationBFR).toBe(5000); // 30000 - 25000
  });

  it('returns zero variation when no previous BFR', () => {
    const result = computeBFR(10000, 5000, 0);
    expect(result.variationBFR).toBe(0);
  });
});

describe('computeBurnRate', () => {
  it('returns zero burn rate for empty periods', () => {
    const result = computeBurnRate([]);
    expect(result.burnRateMonthly).toBe(0);
    expect(result.runwayMonths).toBe(Infinity);
    expect(result.trend).toBe('stable');
  });

  it('computes burn rate from outflows', () => {
    const periods: CashflowPeriod[] = [
      {
        periodStart: '2026-01-01', periodEnd: '2026-01-31', periodType: 'monthly',
        openingBalance: 100000, closingBalance: 90000,
        inflows: { operating: 5000, investing: 0, financing: 0, tax: 0, other: 0, total: 5000 },
        outflows: { operating: 15000, investing: 0, financing: 0, tax: 0, other: 0, total: 15000 },
        netCashflow: -10000,
      },
      {
        periodStart: '2026-02-01', periodEnd: '2026-02-28', periodType: 'monthly',
        openingBalance: 90000, closingBalance: 80000,
        inflows: { operating: 5000, investing: 0, financing: 0, tax: 0, other: 0, total: 5000 },
        outflows: { operating: 15000, investing: 0, financing: 0, tax: 0, other: 0, total: 15000 },
        netCashflow: -10000,
      },
    ];
    const result = computeBurnRate(periods);
    expect(result.burnRateMonthly).toBeGreaterThan(0);
    expect(result.runwayMonths).toBeGreaterThan(0);
    expect(result.runwayMonths).not.toBe(Infinity);
  });

  it('detects improving trend', () => {
    const periods: CashflowPeriod[] = Array.from({ length: 6 }, (_, i) => ({
      periodStart: `2026-0${i + 1}-01`,
      periodEnd: `2026-0${i + 1}-28`,
      periodType: 'monthly' as const,
      openingBalance: 100000,
      closingBalance: 100000 + (i + 1) * 5000,
      inflows: { operating: 20000 + i * 2000, investing: 0, financing: 0, tax: 0, other: 0, total: 20000 + i * 2000 },
      outflows: { operating: 10000, investing: 0, financing: 0, tax: 0, other: 0, total: 10000 },
      netCashflow: 10000 + i * 2000,
    }));
    const result = computeBurnRate(periods);
    expect(result.trend).toBe('improving');
  });

  it('detects degrading trend', () => {
    const periods: CashflowPeriod[] = Array.from({ length: 6 }, (_, i) => ({
      periodStart: `2026-0${i + 1}-01`,
      periodEnd: `2026-0${i + 1}-28`,
      periodType: 'monthly' as const,
      openingBalance: 100000,
      closingBalance: 100000 - (i + 1) * 5000,
      inflows: { operating: 10000 - i * 1000, investing: 0, financing: 0, tax: 0, other: 0, total: 10000 - i * 1000 },
      outflows: { operating: 15000, investing: 0, financing: 0, tax: 0, other: 0, total: 15000 },
      netCashflow: -5000 - i * 1000,
    }));
    const result = computeBurnRate(periods);
    expect(result.trend).toBe('degrading');
  });
});
