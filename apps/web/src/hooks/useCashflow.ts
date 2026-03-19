import { useEffect } from 'react';
import { useCashflowStore } from '../stores/cashflow.store';

// REQUIREMENT: Convenience hook for cashflow data with auto-fetch
export function useCashflow(companyId: string | undefined) {
  const store = useCashflowStore();

  useEffect(() => {
    if (companyId && companyId !== store.selectedCompanyId) {
      store.setCompany(companyId);
    }
  }, [companyId]);

  return {
    transactions: store.transactions,
    periods: store.periods,
    projections: store.projections,
    burnRate: store.burnRate,
    alerts: store.alerts,
    isLoading: store.isLoading,
    error: store.error,
    periodType: store.periodType,
    setPeriodType: store.setPeriodType,
    syncPennylane: store.syncPennylane,
    refresh: () => companyId && store.fetchTransactions(companyId),
  };
}
