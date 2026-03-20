import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEMO_TRANSACTIONS, DEMO_COMPANIES, DEMO_OPENING_BALANCE } from '../lib/demo-data';
import { computeCashflow, computeBurnRate, projectCashflow, generateAlerts } from '@cashflow/engine';
import type {
  Transaction, CashflowPeriod, ProjectedCashflowPeriod,
  BurnRateResult, CashflowAlert, PeriodType,
  AlertSettings, Company,
} from '@cashflow/shared';

interface CashflowState {
  transactions: Transaction[];
  periods: CashflowPeriod[];
  projections: ProjectedCashflowPeriod[];
  burnRate: BurnRateResult | null;
  alerts: CashflowAlert[];
  companies: Company[];
  selectedCompanyId: string | null;
  periodType: PeriodType;
  isLoading: boolean;
  error: string | null;
  setCompany: (companyId: string) => void;
  setPeriodType: (type: PeriodType) => void;
  fetchCompanies: () => Promise<void>;
  fetchTransactions: (companyId: string) => Promise<void>;
  syncPennylane: () => Promise<void>;
}

const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  runwayCriticalMonths: 2,
  runwayWarningMonths: 4,
  negativeBalanceHorizonDays: 90,
  highBurnRateThreshold: 1.2,
  lateReceivablesDays: 60,
  concentrationRiskPercent: 30,
  seasonalDropPercent: 25,
};

function computeAll(transactions: Transaction[], periodType: PeriodType, openingBalance: number) {
  const periods = computeCashflow(transactions, periodType, openingBalance);
  const burnRate = computeBurnRate(periods);
  const projections = projectCashflow(periods, [], [], [], 6);
  const currentBalance = periods.length > 0 ? periods[periods.length - 1]!.closingBalance : 0;
  const alerts = generateAlerts(currentBalance, burnRate, projections, DEFAULT_ALERT_SETTINGS);
  return { periods, burnRate, projections, alerts };
}

export const useCashflowStore = create<CashflowState>((set, get) => ({
  transactions: [],
  periods: [],
  projections: [],
  burnRate: null,
  alerts: [],
  companies: [],
  selectedCompanyId: null,
  periodType: 'monthly',
  isLoading: false,
  error: null,

  setCompany: (companyId: string) => {
    set({ selectedCompanyId: companyId });
    get().fetchTransactions(companyId);
  },

  setPeriodType: (type: PeriodType) => {
    set({ periodType: type });
    const { transactions } = get();
    if (transactions.length > 0) {
      const computed = computeAll(transactions, type, DEMO_OPENING_BALANCE);
      set(computed);
    }
  },

  fetchCompanies: async () => {
    if (!isSupabaseConfigured) {
      set({ companies: DEMO_COMPANIES });
      return;
    }
    const { data } = await supabase.from('companies').select('*').order('name');
    if (data) {
      set({
        companies: data.map((c) => ({
          id: c.id,
          firmId: c.firm_id,
          pennylaneCompanyId: c.pennylane_company_id,
          name: c.name,
          siren: c.siren,
          siret: c.siret,
          nafCode: c.naf_code,
          legalForm: c.legal_form,
          fiscalYearStartMonth: c.fiscal_year_start_month,
          currency: c.currency,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        })),
      });
    }
  },

  fetchTransactions: async (companyId: string) => {
    set({ isLoading: true, error: null });
    try {
      let transactions: Transaction[];

      if (!isSupabaseConfigured) {
        // REQUIREMENT: Demo mode — use mock data
        transactions = DEMO_TRANSACTIONS.filter((t) => t.companyId === companyId);
      } else {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('company_id', companyId)
          .order('date', { ascending: true });

        if (error) throw new Error(error.message);

        transactions = (data ?? []).map((t) => ({
          id: t.id,
          companyId: t.company_id,
          pennylaneId: t.pennylane_id,
          date: t.date,
          label: t.label,
          amount: Number(t.amount),
          currency: t.currency,
          category: t.category,
          subcategory: t.subcategory,
          cashflowType: t.cashflow_type as Transaction['cashflowType'],
          bankAccount: t.bank_account,
          isReconciled: t.is_reconciled,
          pennylaneMetadata: (t.pennylane_metadata ?? {}) as Record<string, unknown>,
          source: t.source as Transaction['source'],
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        }));
      }

      const { periodType } = get();
      const computed = computeAll(transactions, periodType, DEMO_OPENING_BALANCE);

      set({ transactions, ...computed, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Erreur lors du chargement',
        isLoading: false,
      });
    }
  },

  syncPennylane: async () => {
    if (!isSupabaseConfigured) {
      // Demo mode — simulate sync delay
      set({ isLoading: true });
      await new Promise((r) => setTimeout(r, 1500));
      set({ isLoading: false });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      // REQUIREMENT: Appel via Vercel Serverless Function (pas Edge Function Supabase)
      const response = await fetch('/api/pennylane-sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const detail = body.error ?? `HTTP ${response.status} — ${response.statusText}`;
        throw new Error(`Sync échouée: ${detail}`);
      }

      const { selectedCompanyId } = get();
      if (selectedCompanyId) {
        await get().fetchTransactions(selectedCompanyId);
      }
      set({ isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de synchronisation';
      set({ error: message, isLoading: false });
      throw err;
    }
  },
}));
