-- 001_initial_schema.sql
-- REQUIREMENT: Complete database schema for cashflow application

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- REQUIREMENT: Multi-tenant accounting firms
CREATE TABLE public.firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  siret TEXT UNIQUE CHECK (siret IS NULL OR length(siret) = 14),
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  gdpr_dpo_email TEXT,
  data_retention_months INTEGER DEFAULT 36,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  full_name TEXT,
  gdpr_consent_at TIMESTAMPTZ,
  gdpr_consent_version TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  pennylane_company_id TEXT,
  name TEXT NOT NULL,
  siren TEXT CHECK (siren IS NULL OR length(siren) = 9),
  siret TEXT CHECK (siret IS NULL OR length(siret) = 14),
  naf_code TEXT,
  legal_form TEXT,
  fiscal_year_start_month INTEGER DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  currency TEXT DEFAULT 'EUR',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SECURITY: Tokens encrypted with pgcrypto before storage
CREATE TABLE public.pennylane_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  access_token_encrypted BYTEA NOT NULL,
  refresh_token_encrypted BYTEA NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  pennylane_organization_id TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error', 'success')),
  sync_error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(firm_id)
);

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pennylane_id TEXT,
  date DATE NOT NULL,
  label TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  category TEXT,
  subcategory TEXT,
  cashflow_type TEXT NOT NULL CHECK (cashflow_type IN (
    'operating_income', 'operating_expense',
    'investing_income', 'investing_expense',
    'financing_income', 'financing_expense',
    'tax', 'other'
  )),
  bank_account TEXT,
  is_reconciled BOOLEAN DEFAULT false,
  pennylane_metadata JSONB DEFAULT '{}',
  source TEXT DEFAULT 'pennylane' CHECK (source IN ('pennylane', 'manual', 'import')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PERF: Indexes for common query patterns
CREATE INDEX idx_transactions_company_date ON public.transactions(company_id, date DESC);
CREATE INDEX idx_transactions_cashflow_type ON public.transactions(cashflow_type);
CREATE INDEX idx_transactions_pennylane_id ON public.transactions(pennylane_id);
CREATE INDEX idx_companies_firm ON public.companies(firm_id);

CREATE TABLE public.cashflow_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  opening_balance NUMERIC(15,2) NOT NULL,
  closing_balance NUMERIC(15,2) NOT NULL,
  total_inflows NUMERIC(15,2) NOT NULL,
  total_outflows NUMERIC(15,2) NOT NULL,
  net_cashflow NUMERIC(15,2) NOT NULL,
  operating_inflows NUMERIC(15,2) DEFAULT 0,
  operating_outflows NUMERIC(15,2) DEFAULT 0,
  investing_inflows NUMERIC(15,2) DEFAULT 0,
  investing_outflows NUMERIC(15,2) DEFAULT 0,
  financing_inflows NUMERIC(15,2) DEFAULT 0,
  financing_outflows NUMERIC(15,2) DEFAULT 0,
  tax_outflows NUMERIC(15,2) DEFAULT 0,
  projected_balance_30d NUMERIC(15,2),
  projected_balance_90d NUMERIC(15,2),
  projected_balance_180d NUMERIC(15,2),
  burn_rate_monthly NUMERIC(15,2),
  runway_months NUMERIC(5,1),
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, period_start, period_type)
);

-- REQUIREMENT: GDPR audit trail (mandatory)
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_log_firm ON public.audit_log(firm_id, created_at DESC);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id, created_at DESC);

CREATE TABLE public.gdpr_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'terms_of_service', 'privacy_policy', 'data_processing', 'marketing', 'analytics'
  )),
  granted BOOLEAN NOT NULL,
  version TEXT NOT NULL,
  ip_address INET,
  granted_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_gdpr_consents_user ON public.gdpr_consents(user_id);

-- REQUIREMENT: Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER firms_updated_at BEFORE UPDATE ON public.firms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER pennylane_connections_updated_at BEFORE UPDATE ON public.pennylane_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
