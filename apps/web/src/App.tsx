import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { Layout } from './components/ui/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CashflowDetail } from './pages/CashflowDetail';
import { Settings } from './pages/Settings';
import { GdprCenter } from './pages/GdprCenter';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/cashflow" element={<CashflowDetail />} />
                    <Route path="/cashflow/:companyId" element={<CashflowDetail />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/gdpr" element={<GdprCenter />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
