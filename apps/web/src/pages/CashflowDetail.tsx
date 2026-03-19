import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Search, ChevronUp, ChevronDown, FileSpreadsheet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCashflowStore } from '../stores/cashflow.store';
import type { CashflowType } from '@cashflow/shared';

function formatEur(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

const cashflowTypeLabels: Record<CashflowType, string> = {
  operating_income: 'Exploitation +',
  operating_expense: 'Exploitation -',
  investing_income: 'Investissement +',
  investing_expense: 'Investissement -',
  financing_income: 'Financement +',
  financing_expense: 'Financement -',
  tax: 'Fiscalité',
  other: 'Autre',
};

const cashflowTypeColors: Record<CashflowType, string> = {
  operating_income: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  operating_expense: 'bg-coral-100 text-coral-700 dark:bg-coral-900/30 dark:text-coral-400',
  investing_income: 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400',
  investing_expense: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  financing_income: 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400',
  financing_expense: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  tax: 'bg-primary-100 text-primary-600 dark:bg-primary-800/30 dark:text-primary-400',
  other: 'bg-surface-200 text-primary-600 dark:bg-surface-dark-200 dark:text-primary-400',
};

export function CashflowDetail() {
  const { companyId } = useParams<{ companyId: string }>();
  const { transactions, isLoading, fetchTransactions, fetchCompanies, companies, setCompany, selectedCompanyId } = useCashflowStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (companyId) {
      fetchTransactions(companyId);
    } else {
      fetchCompanies().then(() => {
        const { companies: loaded, selectedCompanyId: current } = useCashflowStore.getState();
        if (!current && loaded.length > 0) {
          setCompany(loaded[0]!.id);
        }
      });
    }
  }, [companyId]);

  const filtered = transactions
    .filter((t) => {
      if (typeFilter !== 'all' && t.cashflowType !== typeFilter) return false;
      if (search && !t.label.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const mult = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'date') return mult * a.date.localeCompare(b.date);
      return mult * (a.amount - b.amount);
    });

  const totalInflows = filtered.filter((t) => t.amount >= 0).reduce((s, t) => s + t.amount, 0);
  const totalOutflows = filtered.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);

  const handleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: 'date' | 'amount' }) => {
    if (sortField !== field) return <span className="w-3" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const exportCsv = () => {
    const headers = ['Date', 'Libellé', 'Montant', 'Catégorie', 'Type', 'Rapproché'];
    const rows = filtered.map((t) => [
      t.date,
      `"${t.label.replace(/"/g, '""')}"`,
      t.amount.toFixed(2),
      t.category ?? '',
      cashflowTypeLabels[t.cashflowType],
      t.isReconciled ? 'Oui' : 'Non',
    ]);
    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${companyId ?? 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="skeleton h-14 w-full rounded-2xl" />
        <div className="skeleton h-[500px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-display-lg text-primary-900 dark:text-white">Transactions</h1>
          <p className="text-body-md text-primary-500 dark:text-primary-400 mt-1">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
            {typeFilter !== 'all' && ' (filtrées)'}
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-dark-200 bg-white dark:bg-surface-dark-50 text-body-sm font-medium text-primary-700 dark:text-primary-300 hover:bg-surface-100 dark:hover:bg-surface-dark-100 transition-all"
        >
          <Download className="w-4 h-4" />
          Exporter CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-surface-dark-50 rounded-2xl border border-surface-200 dark:border-surface-dark-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-label uppercase text-primary-500 dark:text-primary-400">Encaissements</p>
            <p className="font-display text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{formatEur(totalInflows)}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-dark-50 rounded-2xl border border-surface-200 dark:border-surface-dark-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-coral-50 dark:bg-coral-900/20 flex items-center justify-center">
            <ArrowDownRight className="w-5 h-5 text-coral-500" />
          </div>
          <div>
            <p className="text-label uppercase text-primary-500 dark:text-primary-400">Décaissements</p>
            <p className="font-display text-lg font-bold text-coral-600 dark:text-coral-400 tabular-nums">
              {formatEur(totalOutflows)}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-dark-50 rounded-2xl border border-surface-200 dark:border-surface-dark-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-900/20 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-accent-500" />
          </div>
          <div>
            <p className="text-label uppercase text-primary-500 dark:text-primary-400">Solde net</p>
            <p className={`font-display text-lg font-bold tabular-nums ${totalInflows + totalOutflows >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-coral-600 dark:text-coral-400'}`}>
              {formatEur(totalInflows + totalOutflows)}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
          <input
            type="text"
            placeholder="Rechercher par libellé..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-11 pr-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-dark-200 bg-white dark:bg-surface-dark-50 text-body-sm text-primary-900 dark:text-white placeholder-primary-400 dark:placeholder-primary-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-all"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-dark-200 bg-white dark:bg-surface-dark-50 text-body-sm text-primary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-all"
        >
          <option value="all">Tous les types</option>
          {Object.entries(cashflowTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-surface-dark-50 rounded-2xl border border-surface-200 dark:border-surface-dark-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-dark-200">
                <th
                  className="px-5 py-3 text-left text-label uppercase text-primary-500 dark:text-primary-400 cursor-pointer hover:text-primary-700 dark:hover:text-primary-300 select-none"
                  onClick={() => handleSort('date')}
                >
                  <span className="flex items-center gap-1">Date <SortIcon field="date" /></span>
                </th>
                <th className="px-5 py-3 text-left text-label uppercase text-primary-500 dark:text-primary-400">
                  Libellé
                </th>
                <th className="px-5 py-3 text-left text-label uppercase text-primary-500 dark:text-primary-400 hidden md:table-cell">
                  Catégorie
                </th>
                <th className="px-5 py-3 text-left text-label uppercase text-primary-500 dark:text-primary-400">
                  Type
                </th>
                <th
                  className="px-5 py-3 text-right text-label uppercase text-primary-500 dark:text-primary-400 cursor-pointer hover:text-primary-700 dark:hover:text-primary-300 select-none"
                  onClick={() => handleSort('amount')}
                >
                  <span className="flex items-center justify-end gap-1">Montant <SortIcon field="amount" /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <FileSpreadsheet className="w-10 h-10 text-primary-300 dark:text-primary-600 mx-auto mb-3" />
                    <p className="font-display text-body-md font-medium text-primary-700 dark:text-primary-300">
                      Aucune transaction trouvée
                    </p>
                    <p className="text-body-sm text-primary-500 dark:text-primary-400 mt-1">
                      Essayez de modifier vos filtres
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((tx, i) => (
                  <tr
                    key={tx.id}
                    className="border-b border-surface-100 dark:border-surface-dark-100 last:border-0 hover:bg-surface-50 dark:hover:bg-surface-dark-100/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-body-sm text-primary-500 dark:text-primary-400 whitespace-nowrap tabular-nums">
                      {format(parseISO(tx.date), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-5 py-3.5 text-body-sm font-medium text-primary-900 dark:text-white">
                      {tx.label}
                    </td>
                    <td className="px-5 py-3.5 text-body-sm text-primary-500 dark:text-primary-400 hidden md:table-cell font-mono text-xs">
                      {tx.category ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${cashflowTypeColors[tx.cashflowType]}`}>
                        {cashflowTypeLabels[tx.cashflowType]}
                      </span>
                    </td>
                    <td className={`px-5 py-3.5 text-right font-mono text-body-sm font-semibold whitespace-nowrap tabular-nums ${tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-coral-600 dark:text-coral-400'}`}>
                      {tx.amount >= 0 ? '+' : ''}{formatEur(tx.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
