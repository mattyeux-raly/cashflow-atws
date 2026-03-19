-- REQUIREMENT: Table pour les surcharges utilisateur du mapping PCG → type de cashflow
-- Permet de modifier la catégorisation automatique par entreprise

CREATE TABLE IF NOT EXISTS pcg_mapping_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_prefix TEXT NOT NULL,
  original_type TEXT NOT NULL,
  override_type TEXT NOT NULL,
  override_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, account_prefix)
);

-- SECURITY: RLS — seuls les membres du cabinet peuvent voir/modifier les mappings
ALTER TABLE pcg_mapping_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pcg_mapping_overrides_select" ON pcg_mapping_overrides
  FOR SELECT USING (
    company_id IN (
      SELECT c.id FROM companies c
      JOIN firm_members fm ON fm.firm_id = c.firm_id
      WHERE fm.user_id = auth.uid()
    )
  );

CREATE POLICY "pcg_mapping_overrides_insert" ON pcg_mapping_overrides
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT c.id FROM companies c
      JOIN firm_members fm ON fm.firm_id = c.firm_id
      WHERE fm.user_id = auth.uid() AND fm.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "pcg_mapping_overrides_update" ON pcg_mapping_overrides
  FOR UPDATE USING (
    company_id IN (
      SELECT c.id FROM companies c
      JOIN firm_members fm ON fm.firm_id = c.firm_id
      WHERE fm.user_id = auth.uid() AND fm.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "pcg_mapping_overrides_delete" ON pcg_mapping_overrides
  FOR DELETE USING (
    company_id IN (
      SELECT c.id FROM companies c
      JOIN firm_members fm ON fm.firm_id = c.firm_id
      WHERE fm.user_id = auth.uid() AND fm.role IN ('owner', 'admin', 'member')
    )
  );

-- Index pour les requêtes par entreprise
CREATE INDEX idx_pcg_mapping_overrides_company ON pcg_mapping_overrides(company_id);
