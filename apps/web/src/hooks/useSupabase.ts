import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Company } from '@cashflow/shared';
import { useAuthStore } from '../stores/auth.store';

// REQUIREMENT: Hook for fetching companies belonging to the user's firm
export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const fetchCompanies = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('companies')
        .select('*')
        .eq('firm_id', user.firmId)
        .order('name');

      if (fetchError) throw new Error(fetchError.message);

      setCompanies(
        (data ?? []).map((c) => ({
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
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return { companies, isLoading, error, refresh: fetchCompanies };
}
