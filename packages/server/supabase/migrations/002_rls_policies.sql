-- 002_rls_policies.sql
-- SECURITY: Row Level Security policies for multi-tenant isolation

ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pennylane_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflow_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_consents ENABLE ROW LEVEL SECURITY;

-- SECURITY: Helper to get current user's firm_id
CREATE OR REPLACE FUNCTION public.get_user_firm_id()
RETURNS UUID AS $$
  SELECT firm_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- SECURITY: Helper to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- FIRMS
CREATE POLICY "firms_select" ON public.firms FOR SELECT
  USING (id = public.get_user_firm_id());
CREATE POLICY "firms_update" ON public.firms FOR UPDATE
  USING (id = public.get_user_firm_id() AND public.get_user_role() IN ('owner', 'admin'));

-- USERS
CREATE POLICY "users_select" ON public.users FOR SELECT
  USING (firm_id = public.get_user_firm_id());

-- COMPANIES
CREATE POLICY "companies_select" ON public.companies FOR SELECT
  USING (firm_id = public.get_user_firm_id());
CREATE POLICY "companies_insert" ON public.companies FOR INSERT
  WITH CHECK (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('owner', 'admin', 'member'));
CREATE POLICY "companies_update" ON public.companies FOR UPDATE
  USING (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('owner', 'admin', 'member'));
CREATE POLICY "companies_delete" ON public.companies FOR DELETE
  USING (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('owner', 'admin'));

-- TRANSACTIONS (via company's firm)
CREATE POLICY "transactions_select" ON public.transactions FOR SELECT
  USING (company_id IN (SELECT id FROM public.companies WHERE firm_id = public.get_user_firm_id()));
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE firm_id = public.get_user_firm_id())
    AND public.get_user_role() IN ('owner', 'admin', 'member'));

-- PENNYLANE CONNECTIONS (admin+ only)
CREATE POLICY "pennylane_conn_select" ON public.pennylane_connections FOR SELECT
  USING (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('owner', 'admin'));
CREATE POLICY "pennylane_conn_insert" ON public.pennylane_connections FOR INSERT
  WITH CHECK (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('owner', 'admin'));
CREATE POLICY "pennylane_conn_update" ON public.pennylane_connections FOR UPDATE
  USING (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('owner', 'admin'));

-- CASHFLOW SNAPSHOTS (via company)
CREATE POLICY "snapshots_select" ON public.cashflow_snapshots FOR SELECT
  USING (company_id IN (SELECT id FROM public.companies WHERE firm_id = public.get_user_firm_id()));

-- AUDIT LOG (admin+ of own firm)
CREATE POLICY "audit_select" ON public.audit_log FOR SELECT
  USING (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('owner', 'admin'));

-- GDPR CONSENTS (own consents only)
CREATE POLICY "gdpr_select" ON public.gdpr_consents FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "gdpr_insert" ON public.gdpr_consents FOR INSERT
  WITH CHECK (user_id = auth.uid());
