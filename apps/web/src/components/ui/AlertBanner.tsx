import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useState } from 'react';
import type { CashflowAlert } from '@cashflow/shared';

interface AlertBannerProps {
  alerts: CashflowAlert[];
}

const severityConfig = {
  critical: {
    bg: 'bg-coral-50 dark:bg-coral-900/15 border-coral-200 dark:border-coral-800/30',
    text: 'text-coral-700 dark:text-coral-300',
    icon: AlertTriangle,
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-800/30',
    text: 'text-amber-700 dark:text-amber-300',
    icon: AlertCircle,
  },
  info: {
    bg: 'bg-accent-50 dark:bg-accent-900/15 border-accent-200 dark:border-accent-800/30',
    text: 'text-accent-700 dark:text-accent-300',
    icon: Info,
  },
};

export function AlertBanner({ alerts }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.code));
  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => {
        const config = severityConfig[alert.severity];
        const Icon = config.icon;
        return (
          <div
            key={alert.code}
            className={`flex items-start gap-3 p-3.5 rounded-2xl border ${config.bg} animate-fade-in`}
          >
            <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${config.text}`} />
            <p className={`text-body-sm flex-1 ${config.text}`}>{alert.message}</p>
            <button
              onClick={() => setDismissed((prev) => new Set(prev).add(alert.code))}
              className={`flex-shrink-0 p-1 rounded-lg ${config.text} opacity-40 hover:opacity-100 transition-opacity`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
