import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { CashflowPeriod } from '@cashflow/shared';

interface BreakdownChartProps {
  periods: CashflowPeriod[];
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

export function BreakdownChart({ periods, height = 300 }: BreakdownChartProps) {
  const chartData = periods.map((p) => ({
    date: format(parseISO(p.periodStart), 'MMM yyyy', { locale: fr }),
    'Exploitation +': p.inflows.operating,
    'Investissement +': p.inflows.investing,
    'Financement +': p.inflows.financing,
    'Exploitation -': -p.outflows.operating,
    'Investissement -': -p.outflows.investing,
    'Financement -': -p.outflows.financing,
    'Fiscalité -': -p.outflows.tax,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }} stackOffset="sign">
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
        <YAxis tickFormatter={(v: number) => formatEur(v)} tick={{ fontSize: 12 }} stroke="#94a3b8" width={80} />
        <Tooltip formatter={(value: number) => formatEur(value)} />
        <Legend />
        <Bar dataKey="Exploitation +" stackId="positive" fill="#27AE60" radius={[2, 2, 0, 0]} />
        <Bar dataKey="Investissement +" stackId="positive" fill="#2D9CDB" radius={[2, 2, 0, 0]} />
        <Bar dataKey="Financement +" stackId="positive" fill="#9B51E0" radius={[2, 2, 0, 0]} />
        <Bar dataKey="Exploitation -" stackId="negative" fill="#EB5757" radius={[0, 0, 2, 2]} />
        <Bar dataKey="Investissement -" stackId="negative" fill="#F2994A" radius={[0, 0, 2, 2]} />
        <Bar dataKey="Financement -" stackId="negative" fill="#BB6BD9" radius={[0, 0, 2, 2]} />
        <Bar dataKey="Fiscalité -" stackId="negative" fill="#828282" radius={[0, 0, 2, 2]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
