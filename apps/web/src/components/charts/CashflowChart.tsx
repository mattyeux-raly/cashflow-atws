import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { CashflowPeriod, ProjectedCashflowPeriod } from '@cashflow/shared';

interface CashflowChartProps {
  periods: CashflowPeriod[];
  projections?: ProjectedCashflowPeriod[];
  height?: number;
}

function formatEur(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 p-3">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatEur(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function CashflowChart({ periods, projections = [], height = 350 }: CashflowChartProps) {
  const realisticProjections = projections.filter((p) => p.scenario === 'realistic');
  const optimisticProjections = projections.filter((p) => p.scenario === 'optimistic');
  const pessimisticProjections = projections.filter((p) => p.scenario === 'pessimistic');

  const chartData = [
    ...periods.map((p) => ({
      date: format(parseISO(p.periodStart), 'MMM yyyy', { locale: fr }),
      solde: p.closingBalance,
      entrees: p.inflows.total,
      sorties: -p.outflows.total,
    })),
    ...realisticProjections.map((p) => ({
      date: format(parseISO(p.periodStart), 'MMM yyyy', { locale: fr }),
      soldeProjecte: p.closingBalance,
      soldeOptimiste: optimisticProjections.find((o) => o.periodStart === p.periodStart)?.closingBalance,
      soldePessimiste: pessimisticProjections.find((o) => o.periodStart === p.periodStart)?.closingBalance,
    })),
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
        <defs>
          <linearGradient id="gradientSolde" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2D9CDB" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#2D9CDB" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradientProjection" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F2994A" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#F2994A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
        <YAxis tickFormatter={(v: number) => formatEur(v)} tick={{ fontSize: 12 }} stroke="#94a3b8" width={80} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
        <Area
          type="monotone"
          dataKey="solde"
          name="Solde réalisé"
          stroke="#2D9CDB"
          fill="url(#gradientSolde)"
          strokeWidth={2}
          dot={{ fill: '#2D9CDB', r: 3 }}
        />
        <Area
          type="monotone"
          dataKey="soldeProjecte"
          name="Projection réaliste"
          stroke="#F2994A"
          fill="url(#gradientProjection)"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: '#F2994A', r: 3 }}
        />
        <Area
          type="monotone"
          dataKey="soldeOptimiste"
          name="Optimiste"
          stroke="#27AE60"
          fill="none"
          strokeWidth={1}
          strokeDasharray="3 3"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="soldePessimiste"
          name="Pessimiste"
          stroke="#EB5757"
          fill="none"
          strokeWidth={1}
          strokeDasharray="3 3"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
