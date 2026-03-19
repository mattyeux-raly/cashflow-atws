import { useState, useMemo } from 'react';
import { Search, RotateCcw, Save, ChevronDown, ChevronRight } from 'lucide-react';
import { PCG_MAPPINGS } from '@cashflow/engine';
import type { PcgMapping } from '@cashflow/engine';
import type { CashflowType } from '@cashflow/shared';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

// REQUIREMENT: Labels en français pour chaque type de cashflow
const CASHFLOW_TYPE_LABELS: Record<CashflowType, string> = {
  operating_income: 'Exploitation — Revenus',
  operating_expense: 'Exploitation — Charges',
  investing_income: 'Investissement — Revenus',
  investing_expense: 'Investissement — Dépenses',
  financing_income: 'Financement — Revenus',
  financing_expense: 'Financement — Charges',
  tax: 'Fiscal',
  other: 'Autre',
};

const CASHFLOW_TYPE_VARIANTS: Record<CashflowType, 'success' | 'danger' | 'info' | 'warning' | 'default'> = {
  operating_income: 'success',
  operating_expense: 'danger',
  investing_income: 'info',
  investing_expense: 'info',
  financing_income: 'warning',
  financing_expense: 'warning',
  tax: 'default',
  other: 'default',
};

const CASHFLOW_TYPE_OPTIONS: Array<{ value: CashflowType; label: string }> = Object.entries(CASHFLOW_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as CashflowType, label }),
);

// REQUIREMENT: Grouper les comptes par classe PCG
const PCG_CLASSES: Record<string, string> = {
  '1': 'Classe 1 — Capitaux',
  '2': 'Classe 2 — Immobilisations',
  '4': 'Classe 4 — Tiers',
  '6': 'Classe 6 — Charges',
  '7': 'Classe 7 — Produits',
};

interface MappingOverride {
  prefix: string;
  type: CashflowType;
  label: string | null;
}

interface MappingEditorProps {
  overrides: MappingOverride[];
  onSave: (overrides: MappingOverride[]) => void;
  isSaving?: boolean;
}

export function MappingEditor({ overrides, onSave, isSaving }: MappingEditorProps) {
  const [search, setSearch] = useState('');
  const [localOverrides, setLocalOverrides] = useState<Map<string, MappingOverride>>(
    () => new Map(overrides.map((o) => [o.prefix, o])),
  );
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set(['6', '7']));
  const [hasChanges, setHasChanges] = useState(false);

  const groupedMappings = useMemo(() => {
    const groups = new Map<string, PcgMapping[]>();
    for (const mapping of PCG_MAPPINGS) {
      const classKey = mapping.prefix[0]!;
      if (!groups.has(classKey)) groups.set(classKey, []);
      groups.get(classKey)!.push(mapping);
    }
    // Trier les préfixes dans chaque groupe
    for (const [, mappings] of groups) {
      mappings.sort((a, b) => a.prefix.localeCompare(b.prefix));
    }
    return groups;
  }, []);

  const filteredMappings = useMemo(() => {
    if (!search.trim()) return groupedMappings;
    const q = search.toLowerCase();
    const filtered = new Map<string, PcgMapping[]>();
    for (const [classKey, mappings] of groupedMappings) {
      const matches = mappings.filter(
        (m) =>
          m.prefix.includes(q) ||
          m.label.toLowerCase().includes(q) ||
          CASHFLOW_TYPE_LABELS[m.type].toLowerCase().includes(q),
      );
      if (matches.length > 0) filtered.set(classKey, matches);
    }
    return filtered;
  }, [groupedMappings, search]);

  const getEffectiveType = (mapping: PcgMapping): CashflowType => {
    const override = localOverrides.get(mapping.prefix);
    return override?.type ?? mapping.type;
  };

  const isOverridden = (prefix: string): boolean => localOverrides.has(prefix);

  const handleTypeChange = (mapping: PcgMapping, newType: CashflowType) => {
    const next = new Map(localOverrides);
    if (newType === mapping.type) {
      next.delete(mapping.prefix);
    } else {
      next.set(mapping.prefix, { prefix: mapping.prefix, type: newType, label: null });
    }
    setLocalOverrides(next);
    setHasChanges(true);
  };

  const handleReset = (prefix: string) => {
    const next = new Map(localOverrides);
    next.delete(prefix);
    setLocalOverrides(next);
    setHasChanges(true);
  };

  const handleResetAll = () => {
    setLocalOverrides(new Map());
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(Array.from(localOverrides.values()));
    setHasChanges(false);
  };

  const toggleClass = (classKey: string) => {
    const next = new Set(expandedClasses);
    if (next.has(classKey)) next.delete(classKey);
    else next.add(classKey);
    setExpandedClasses(next);
  };

  const overrideCount = localOverrides.size;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Mapping PCG → Cashflow
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Correspondance automatique des comptes du Plan Comptable Général vers les types de flux de trésorerie.
            Modifiez les catégories si nécessaire.
          </p>
        </div>
        {overrideCount > 0 && (
          <Badge variant="warning" size="md">
            {overrideCount} modification{overrideCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Barre de recherche et actions */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par n° de compte, libellé ou type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500"
          />
        </div>
        {overrideCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleResetAll} leftIcon={<RotateCcw className="w-4 h-4" />}>
            Tout réinitialiser
          </Button>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges}
          isLoading={isSaving}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Enregistrer
        </Button>
      </div>

      {/* Tableau de mapping groupé par classe */}
      <div className="space-y-2">
        {Array.from(filteredMappings.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([classKey, mappings]) => {
            const isExpanded = expandedClasses.has(classKey) || search.trim().length > 0;
            const classOverrides = mappings.filter((m) => isOverridden(m.prefix)).length;

            return (
              <div key={classKey} className="border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleClass(classKey)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-gray-500" />
                      : <ChevronRight className="w-4 h-4 text-gray-500" />}
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {PCG_CLASSES[classKey] ?? `Classe ${classKey}`}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({mappings.length} compte{mappings.length > 1 ? 's' : ''})
                    </span>
                  </div>
                  {classOverrides > 0 && (
                    <Badge variant="warning" size="sm">
                      {classOverrides} modifié{classOverrides > 1 ? 's' : ''}
                    </Badge>
                  )}
                </button>

                {isExpanded && (
                  <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {/* En-tête */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50/50 dark:bg-slate-800/30 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <div className="col-span-2">Compte</div>
                      <div className="col-span-4">Libellé</div>
                      <div className="col-span-4">Type de flux</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>

                    {mappings.map((mapping) => {
                      const effectiveType = getEffectiveType(mapping);
                      const modified = isOverridden(mapping.prefix);

                      return (
                        <div
                          key={mapping.prefix}
                          className={`grid grid-cols-12 gap-2 items-center px-4 py-2.5 transition-colors ${
                            modified
                              ? 'bg-amber-50/50 dark:bg-amber-900/10'
                              : 'hover:bg-gray-50 dark:hover:bg-slate-700/30'
                          }`}
                        >
                          {/* N° de compte */}
                          <div className="col-span-2">
                            <code className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">
                              {mapping.prefix}*
                            </code>
                          </div>

                          {/* Libellé */}
                          <div className="col-span-4">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{mapping.label}</span>
                          </div>

                          {/* Sélecteur de type */}
                          <div className="col-span-4">
                            <div className="flex items-center gap-2">
                              {modified && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" title="Modifié" />
                              )}
                              <select
                                value={effectiveType}
                                onChange={(e) => handleTypeChange(mapping, e.target.value as CashflowType)}
                                className={`block w-full text-sm rounded-md border px-2 py-1.5 transition-colors
                                  ${modified
                                    ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20'
                                    : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700'}
                                  text-gray-900 dark:text-gray-100
                                  focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500`}
                              >
                                {CASHFLOW_TYPE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="col-span-2 text-right">
                            {modified && (
                              <button
                                onClick={() => handleReset(mapping.prefix)}
                                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                title="Réinitialiser"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Annuler
                              </button>
                            )}
                            {!modified && (
                              <Badge variant={CASHFLOW_TYPE_VARIANTS[effectiveType]} size="sm">
                                Auto
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {filteredMappings.size === 0 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
          Aucun compte trouvé pour « {search} »
        </p>
      )}
    </Card>
  );
}
