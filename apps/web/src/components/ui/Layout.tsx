import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Settings as SettingsIcon,
  Shield, LogOut, Moon, Sun, Menu, X, TrendingUp,
  ChevronRight, BarChart3,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';

const navigation = [
  { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { name: 'Transactions', href: '/cashflow', icon: BarChart3 },
  { name: 'Paramètres', href: '/settings', icon: SettingsIcon },
  { name: 'Données & RGPD', href: '/gdpr', icon: Shield },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const location = useLocation();
  const { logout, user, firm, isDemoMode } = useAuthStore();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-dark-0 transition-colors duration-300">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-primary-950/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[var(--sidebar-width)] flex flex-col bg-primary-900 dark:bg-surface-dark-50 transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 flex-shrink-0">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-accent-500/20 flex items-center justify-center group-hover:bg-accent-500/30 transition-colors">
              <TrendingUp className="w-4 h-4 text-accent-400" />
            </div>
            <span className="font-display text-lg font-bold text-white tracking-tight">Cashflow</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-primary-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Firm info */}
        {firm && (
          <div className="mx-4 mb-4 px-3 py-2.5 rounded-xl bg-white/5 border border-white/[0.06]">
            <p className="text-label uppercase text-primary-500 mb-0.5">Cabinet</p>
            <p className="text-body-sm font-medium text-white truncate">{firm.name}</p>
            {isDemoMode && (
              <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                Démo
              </span>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = item.href === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-white/10 text-white shadow-inner-light'
                    : 'text-primary-400 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-accent-400" />
                )}
                <item.icon className={`w-[18px] h-[18px] transition-colors ${isActive ? 'text-accent-400' : 'text-primary-500 group-hover:text-primary-300'}`} />
                {item.name}
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-primary-500" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-lg bg-accent-500/15 flex items-center justify-center flex-shrink-0">
              <span className="text-body-sm font-bold text-accent-400">
                {user?.fullName?.charAt(0)?.toUpperCase() ?? 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium text-white truncate">{user?.fullName ?? 'Utilisateur'}</p>
              <p className="text-[11px] text-primary-500 capitalize">{user?.role ?? 'membre'}</p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-lg text-primary-500 hover:text-white hover:bg-white/10 transition-colors"
              title={darkMode ? 'Mode clair' : 'Mode sombre'}
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-body-sm text-primary-500 hover:bg-white/[0.06] hover:text-white transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="lg:pl-[var(--sidebar-width)]">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center h-14 px-4 bg-white/80 dark:bg-surface-dark-0/80 backdrop-blur-xl border-b border-surface-200 dark:border-surface-dark-200 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-xl text-primary-500 hover:bg-surface-100 dark:hover:bg-surface-dark-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 ml-3">
            <TrendingUp className="w-4 h-4 text-accent-500" />
            <span className="font-display text-base font-bold text-primary-900 dark:text-white">Cashflow</span>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8 max-w-[1400px]">
          {children}
        </main>
      </div>
    </div>
  );
}
