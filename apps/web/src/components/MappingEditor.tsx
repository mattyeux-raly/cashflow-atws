import { useState, useMemo } from 'react';
import { Search, RotateCcw, Save, Plus, Trash2, Tag } from 'lucide-react';
import { DEFAULT_LABEL_RULES, CASHFLOW_TYPE_LABELS } from '@cashflow/engine';
import type { LabelRule } from '@cashflow/engine';
import type { CashflowType } from '@cashflow/shared';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

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

// Grouper les règles par type de cashflow
const TYPE_GROUPS: Array<{ type: CashflowType; label: string }> = [
  { type: 'operating_income', label: 'Exploitation — Revenus' },
  { type: 'operating_expense', label: 'Exploitation — Charges' },
  { type: 'investing_income', label: 'Investissement — Revenus' },
  { type: 'investing_expense', label: 'Investissement — Dépenses' },
  { type: 'financing_income', label: 'Financement — Revenus' },
  { type: 'financing_expense', label: 'Financement — Charges' },
  { type: 'tax', label: 'Fiscal' },
  { type: 'other', label: 'Autre' },
];

interface MappingEditorProps {
  customRules: LabelRule[];
  onSave: (rules: LabelRule[]) => void;
  isSaving?: boolean;
}

export function MappingEditor({ customRules, onSave, isSaving }: MappingEditorProps) {
  const [search, setSearch] = useState('');
  const [localRules, setLocalRules] = useState<LabelRule[]>(customRules);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKeywords, setNewKeywords] = useState('');
  const [newType, setNewType] = useState<CashflowType>('operating_expense');
  const [newLabel, setNewLabel] = useState('');

  // Fusionner règles custom + par défaut pour l'affichage
  const allRules = useMemo(() => {
    const combined: Array<LabelRule & { isCustom: boolean }> = [
      ...localRules.map((r) => ({ ...r, isCustom: true })),
      ...DEFAULT_LABEL_RULES.map((r) => ({ ...r, isCustom: false })),
    ];
    if (!search.trim()) return combined;
    const q = search.toLowerCase();
    return combined.filter(
      (r) =>
        r.keywords.some((k) => k.toLowerCase().includes(q)) ||
        r.label.toLowerCase().includes(q) ||
        CASHFLOW_TYPE_LABELS[r.type].toLowerCase().includes(q),
    );
  }, [localRules, search]);

  const groupedRules = useMemo(() => {
    const groups = new Map<CashflowType, Array<LabelRule & { isCustom: boolean }>>();
    for (const rule of allRules) {
      if (!groups.has(rule.type)) groups.set(rule.type, []);
      groups.get(rule.type)!.push(rule);
    }
    return groups;
  }, [allRules]);

  const handleAddRule = () => {
    if (!newKeywords.trim() || !newLabel.trim()) return;
    const keywords = newKeywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
    if (keywords.length === 0) return;

    const rule: LabelRule = { keywords, type: newType, label: newLabel.trim() };
    setLocalRules([...localRules, rule]);
    setNewKeywords('');
    setNewLabel('');
    setShowAddForm(false);
    setHasChanges(true);
  };

  const handleDeleteCustomRule = (index: number) => {
    const next = localRules.filter((_, i) => i !== index);
    setLocalRules(next);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(localRules);
    setHasChanges(false);
  };

  const handleResetAll = () => {
    setLocalRules([]);
    setHasChanges(true);
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Règles de catégorisation
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Les transactions bancaires sont catégorisées automatiquement par mots-clés dans le libellé.
            Ajoutez vos propres règles (elles sont prioritaires).
          </p>
        </div>
        {localRules.length > 0 && (
          <Badge variant="info" size="md">
            {localRules.length} règle{localRules.length > 1 ? 's' : ''} personnalisée{localRules.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Barre de recherche et actions */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par mot-clé, libellé ou type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500"
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Ajouter
        </Button>
        {localRules.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleResetAll} leftIcon={<RotateCcw className="w-4 h-4" />}>
            Réinitialiser
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

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <div className="mb-4 p-4 border border-accent-200 dark:border-accent-800 rounded-lg bg-accent-50/30 dark:bg-accent-900/10">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Nouvelle règle</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Mots-clés (séparés par des virgules)
              </label>
              <input
                type="text"
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
                placeholder="loyer, bail, fermage"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Nom de la règle
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Loyer bureau"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Type de flux
              </label>
              <div className="flex gap-2">
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as CashflowType)}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                >
                  {CASHFLOW_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <Button variant="primary" size="sm" onClick={handleAddRule}>
                  OK
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liste des règles groupées par type */}
      <div className="space-y-3">
        {TYPE_GROUPS.filter((g) => groupedRules.has(g.type)).map(({ type, label: groupLabel }) => {
          const rules = groupedRules.get(type)!;
          return (
            <div key={type} className="border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-slate-700/50">
                <div className="flex items-center gap-2">
                  <Badge variant={CASHFLOW_TYPE_VARIANTS[type]} size="sm">{groupLabel}</Badge>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {rules.length} règle{rules.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {rules.map((rule, idx) => (
                  <div
                    key={`${rule.label}-${idx}`}
                    className={`flex items-center justify-between px-4 py-2.5 ${
                      rule.isCustom
                        ? 'bg-accent-50/30 dark:bg-accent-900/10'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Tag className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {rule.label}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rule.keywords.map((kw) => (
                            <code
                              key={kw}
                              className="inline-block px-1.5 py-0.5 text-xs font-mono rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400"
                            >
                              {kw}
                            </code>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {rule.isCustom ? (
                        <>
                          <Badge variant="info" size="sm">Personnalisée</Badge>
                          <button
                            onClick={() => handleDeleteCustomRule(localRules.indexOf(rule))}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <Badge variant="default" size="sm">Par défaut</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {allRules.length === 0 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
          Aucune règle trouvée pour « {search} »
        </p>
      )}
    </Card>
  );
}
