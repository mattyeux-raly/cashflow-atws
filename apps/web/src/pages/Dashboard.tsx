import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, Flame, Clock, BarChart3,
  RefreshCw, ArrowUpRight, ArrowDownRight, Building2,
} from 'lucide-react';
import { AlertBanner } from '../components/ui/AlertBanner';
import { CashflowChart } from '../components/charts/CashflowChart';
import { BreakdownChart } from '../components/charts/BreakdownChart';
import { SparklineChart } from '../components/charts/SparklineChart';
import { useCashflowStore } from '../stores/cashflow.store';
import { useAuthStore } from '../stores/auth.store';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

function formatEur(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function AnimatedValue({ value, className }: { value: string; className?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <span className={`inline-block transition-all duration-500 ease-out ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} ${className ?? ''}`}>
      {value}
    </span>
  );
}

function KpiCard({
  label, value, subtitle, icon: Icon, trend, sparklineData, accentColor, delay,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  sparklineData?: number[];
  accentColor?: string;
  delay?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay ?? 0);
    return () => clearTimeout(t);
  }, [delay]);

  const trendColors = {
    up: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    down: 'text-coral-500 bg-coral-50 dark:bg-coral-900/20',
    neutral: 'text-primary-500 bg-surface-100 dark:bg-surface-dark-100',
  };
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null;

  return (
    <div
      className={`group bg-white dark:bg-surface-dark-50 rounded-2xl border border-surface-200 dark:border-surface-dark-200 p-5 hover:shadow-card-hover hover:border-surface-300 dark:hover:border-surface-dark-300 transition-all duration-300 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${delay ?? 0}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentColor ?? 'bg-accent-50 dark:bg-accent-900/20'}`}>
          <Icon className={`w-5 h-5 ${accentColor ? 'text-white' : 'text-accent-500'}`} />
        </div>
        {sparklineData && sparklineData.length > 1 && (
          <div className="w-24 h-10 opacity-60 group-hover:opacity-100 transition-opacity">
            <SparklineChart data={sparklineData} color="auto" />
          </div>
        )}
      </div>

      <p className="text-label uppercase text-primary-500 dark:text-primary-400 mb-1">{label}</p>
      <p className="font-display text-[1.75rem] font-bold text-primary-900 dark:text-white kpi-value leading-tight">
        <AnimatedValue value={value} />
      </p>

      {subtitle && (
        <div className="flex items-center gap-1.5 mt-2">
          {TrendIcon && (
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${trendColors[trend ?? 'neutral']}`}>
              <TrendIcon className="w-3 h-3" />
            </span>
          )}
          <span className="text-body-sm text-primary-500 dark:text-primary-400">{subtitle}</span>
        </div>
      )}
    </div>
  );
}

function SkeletonKpi() {
  return (
    <div className="bg-white dark:bg-surface-dark-50 rounded-2xl border border-surface-200 dark:border-surface-dark-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="skeleton w-20 h-8 rounded-lg" />
      </div>
      <div className="skeleton w-20 h-3 mb-2 rounded" />
      <div className="skeleton w-28 h-8 rounded" />
      <div className="skeleton w-36 h-3 mt-3 rounded" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-white dark:bg-surface-dark-50 rounded-2xl border border-surface-200 dark:border-surface-dark-200 p-6">
      <div className="skeleton w-48 h-6 mb-6 rounded" />
      <div className="skeleton w-full h-[350px] rounded-xl" />
    </div>
  );
}

export function Dashboard() {
  const { periods, projections, burnRate, alerts, isLoading, error, syncPennylane, selectedCompanyId, setCompany, fetchCompanies, companies } = useCashflowStore();
  const { firm } = useAuthStore();

  useEffect(() => {
    fetchCompanies().then(() => {
      const { companies: loaded, selectedCompanyId: current } = useCashflowStore.getState();
      if (!current && loaded.length > 0) {
        setCompany(loaded[0]!.id);
      }
    });
  }, []);

  const currentBalance = periods.length > 0 ? periods[periods.length - 1]!.closingBalance : 0;
  const previousBalance = periods.length > 1 ? periods[periods.length - 2]!.closingBalance : 0;
  const balanceChange = previousBalance !== 0 ? ((currentBalance - previousBalance) / Math.abs(previousBalance)) * 100 : 0;
  const balanceSparkline = periods.map((p) => p.closingBalance);
  const netSparkline = periods.map((p) => p.netCashflow);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-display-lg text-primary-900 dark:text-white">
            Tableau de bord
          </h1>
          <p className="text-body-md text-primary-500 dark:text-primary-400 mt-1">
            Vue d'ensemble de votre trésorerie
          </p>
        </div>
        <div className="flex items-center gap-3">
          {companies.length > 1 && (
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 pointer-events-none" />
              <select
                value={selectedCompanyId ?? ''}
                onChange={(e) => setCompany(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2.5 rounded-xl border border-surface-200 dark:border-surface-dark-200 bg-white dark:bg-surface-dark-50 text-body-sm font-medium text-primary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-all cursor-pointer"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={() => syncPennylane()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-dark-200 bg-white dark:bg-surface-dark-50 text-body-sm font-medium text-primary-700 dark:text-primary-300 hover:bg-surface-100 dark:hover:bg-surface-dark-100 focus:outline-none focus:ring-2 focus:ring-accent-500/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Synchroniser</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && <AlertBanner alerts={alerts} />}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-coral-50 dark:bg-coral-900/15 border border-coral-200 dark:border-coral-800/30 rounded-2xl">
          <div className="w-2 h-2 rounded-full bg-coral-500 flex-shrink-0" />
          <p className="text-body-sm text-coral-700 dark:text-coral-300">{error}</p>
        </div>
      )}

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonKpi key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Solde actuel"
            value={formatEur(currentBalance)}
            subtitle={`${balanceChange >= 0 ? '+' : ''}${balanceChange.toFixed(1)}% vs mois préc.`}
            trend={balanceChange >= 0 ? 'up' : 'down'}
            icon={Wallet}
            sparklineData={balanceSparkline}
            delay={50}
          />
          <KpiCard
            label="Burn rate"
            value={burnRate ? formatEur(burnRate.burnRateMonthly) : '—'}
            subtitle={burnRate ? (burnRate.trend === 'improving' ? 'En amélioration' : burnRate.trend === 'degrading' ? 'En hausse' : 'Stable') : undefined}
            trend={burnRate?.trend === 'improving' ? 'up' : burnRate?.trend === 'degrading' ? 'down' : 'neutral'}
            icon={Flame}
            accentColor="bg-amber-100 dark:bg-amber-900/20"
            delay={100}
          />
          <KpiCard
            label="Runway"
            value={burnRate ? (burnRate.runwayMonths === Infinity ? '∞' : `${burnRate.runwayMonths.toFixed(1)} mois`) : '—'}
            subtitle={burnRate && burnRate.runwayMonths < 6 && burnRate.runwayMonths !== Infinity ? 'Surveillance requise' : 'Confortable'}
            trend={burnRate && burnRate.runwayMonths < 4 && burnRate.runwayMonths !== Infinity ? 'down' : 'neutral'}
            icon={Clock}
            accentColor="bg-emerald-100 dark:bg-emerald-900/20"
            delay={150}
          />
          <KpiCard
            label="Flux net du mois"
            value={periods.length > 0 ? formatEur(periods[periods.length - 1]!.netCashflow) : '—'}
            subtitle={periods.length > 0 && periods[periods.length - 1]!.netCashflow >= 0 ? 'Excédentaire' : 'Déficitaire'}
            trend={periods.length > 0 && periods[periods.length - 1]!.netCashflow >= 0 ? 'up' : 'down'}
            icon={BarChart3}
            sparklineData={netSparkline}
            delay={200}
          />
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main cashflow chart — spans 2 columns */}
        <ErrorBoundary fallback={<div className="p-6 text-center text-primary-500">Erreur d'affichage du graphique</div>}>
          <div className="xl:col-span-2">
            {isLoading ? (
              <SkeletonChart />
            ) : (
              <div className="bg-white dark:bg-surface-dark-50 rounded-2xl border border-surface-200 dark:border-surface-dark-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-display text-display-sm text-primary-900 dark:text-white">
                      Évolution de la trésorerie
                    </h2>
                    <p className="text-body-sm text-primary-500 dark:text-primary-400 mt-0.5">
                      Réalisé et projections sur 6 mois
                    </p>
                  </div>
                </div>
                {periods.length > 0 ? (
                  <CashflowChart periods={periods} projections={projections} height={350} />
                ) : (
                  <div className="h-[350px] flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-dark-100 flex items-center justify-center mb-4">
                      <BarChart3 className="w-7 h-7 text-primary-400" />
                    </div>
                    <p className="font-display text-body-md font-medium text-primary-700 dark:text-primary-300 mb-1">
                      Aucune donnée
                    </p>
                    <p className="text-body-sm text-primary-500 dark:text-primary-400">
                      Synchronisez Pennylane pour commencer
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ErrorBoundary>

        {/* Breakdown chart */}
        {periods.length > 0 && (
          <ErrorBoundary>
            <div className="bg-white dark:bg-surface-dark-50 rounded-2xl border border-surface-200 dark:border-surface-dark-200 p-6">
              <h2 className="font-display text-display-sm text-primary-900 dark:text-white mb-1">
                Répartition
              </h2>
              <p className="text-body-sm text-primary-500 dark:text-primary-400 mb-6">
                Flux par catégorie
              </p>
              <BreakdownChart periods={periods} height={310} />
            </div>
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
