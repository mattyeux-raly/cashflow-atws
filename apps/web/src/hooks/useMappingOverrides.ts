import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useCashflowStore } from '../stores/cashflow.store';
import type { LabelRule } from '@cashflow/engine';
import type { CashflowType } from '@cashflow/shared';

const STORAGE_KEY = 'cashflow_label_rules';

function loadFromStorage(companyId: string): LabelRule[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${companyId}`);
    if (!raw) return [];
    return JSON.parse(raw) as LabelRule[];
  } catch {
    return [];
  }
}

function saveToStorage(companyId: string, rules: LabelRule[]) {
  localStorage.setItem(`${STORAGE_KEY}_${companyId}`, JSON.stringify(rules));
}

export function useMappingOverrides() {
  const [customRules, setCustomRules] = useState<LabelRule[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const selectedCompanyId = useCashflowStore((s) => s.selectedCompanyId);

  useEffect(() => {
    if (!selectedCompanyId) return;

    if (!isSupabaseConfigured) {
      setCustomRules(loadFromStorage(selectedCompanyId));
      return;
    }

    supabase
      .from('pcg_mapping_overrides')
      .select('account_prefix, override_type, override_label')
      .eq('company_id', selectedCompanyId)
      .then(({ data }) => {
        if (data) {
          setCustomRules(
            data.map((row) => ({
              keywords: (row.account_prefix as string).split(','),
              type: row.override_type as CashflowType,
              label: (row.override_label as string) ?? '',
            })),
          );
        }
      });
  }, [selectedCompanyId]);

  const saveRules = useCallback(
    async (newRules: LabelRule[]) => {
      if (!selectedCompanyId) return;
      setIsSaving(true);

      try {
        if (!isSupabaseConfigured) {
          saveToStorage(selectedCompanyId, newRules);
          setCustomRules(newRules);
          return;
        }

        await supabase
          .from('pcg_mapping_overrides')
          .delete()
          .eq('company_id', selectedCompanyId);

        if (newRules.length > 0) {
          await supabase.from('pcg_mapping_overrides').insert(
            newRules.map((r) => ({
              company_id: selectedCompanyId,
              account_prefix: r.keywords.join(','),
              original_type: 'other',
              override_type: r.type,
              override_label: r.label,
            })),
          );
        }

        setCustomRules(newRules);
      } finally {
        setIsSaving(false);
      }
    },
    [selectedCompanyId],
  );

  return { customRules, saveRules, isSaving };
}
