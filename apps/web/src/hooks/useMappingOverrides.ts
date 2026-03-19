import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from '../stores/auth.store';
import { useCashflowStore } from '../stores/cashflow.store';
import type { CashflowType } from '@cashflow/shared';

interface MappingOverride {
  prefix: string;
  type: CashflowType;
  label: string | null;
}

const STORAGE_KEY = 'cashflow_pcg_overrides';

function loadFromStorage(companyId: string): MappingOverride[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${companyId}`);
    if (!raw) return [];
    return JSON.parse(raw) as MappingOverride[];
  } catch {
    return [];
  }
}

function saveToStorage(companyId: string, overrides: MappingOverride[]) {
  localStorage.setItem(`${STORAGE_KEY}_${companyId}`, JSON.stringify(overrides));
}

export function useMappingOverrides() {
  const [overrides, setOverrides] = useState<MappingOverride[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const selectedCompanyId = useCashflowStore((s) => s.selectedCompanyId);

  useEffect(() => {
    if (!selectedCompanyId) return;

    if (!isSupabaseConfigured) {
      // REQUIREMENT: Mode démo — utiliser localStorage
      setOverrides(loadFromStorage(selectedCompanyId));
      return;
    }

    // Charger depuis Supabase
    supabase
      .from('pcg_mapping_overrides')
      .select('account_prefix, override_type, override_label')
      .eq('company_id', selectedCompanyId)
      .then(({ data }) => {
        if (data) {
          setOverrides(
            data.map((row) => ({
              prefix: row.account_prefix as string,
              type: row.override_type as CashflowType,
              label: (row.override_label as string) ?? null,
            })),
          );
        }
      });
  }, [selectedCompanyId]);

  const saveOverrides = useCallback(
    async (newOverrides: MappingOverride[]) => {
      if (!selectedCompanyId) return;
      setIsSaving(true);

      try {
        if (!isSupabaseConfigured) {
          // Mode démo — persistance localStorage
          saveToStorage(selectedCompanyId, newOverrides);
          setOverrides(newOverrides);
          return;
        }

        // REQUIREMENT: Upsert dans Supabase — supprimer les anciens, insérer les nouveaux
        await supabase
          .from('pcg_mapping_overrides')
          .delete()
          .eq('company_id', selectedCompanyId);

        if (newOverrides.length > 0) {
          await supabase.from('pcg_mapping_overrides').insert(
            newOverrides.map((o) => ({
              company_id: selectedCompanyId,
              account_prefix: o.prefix,
              override_type: o.type,
              override_label: o.label,
            })),
          );
        }

        setOverrides(newOverrides);
      } finally {
        setIsSaving(false);
      }
    },
    [selectedCompanyId],
  );

  return { overrides, saveOverrides, isSaving };
}
