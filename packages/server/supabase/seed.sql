-- seed.sql
-- REQUIREMENT: Realistic French test data for development

-- NOTE: In production, firms/users are created via the app.
-- This seed requires a test auth user with a known UUID.
-- Replace 'TEST_USER_UUID' with an actual Supabase Auth user ID.

-- Test firm: Cabinet comptable
INSERT INTO public.firms (id, name, siret, email, plan, gdpr_dpo_email, data_retention_months)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Cabinet Dupont & Associés',
  '12345678901234',
  'contact@cabinet-dupont.fr',
  'pro',
  'dpo@cabinet-dupont.fr',
  36
);

-- Test companies
INSERT INTO public.companies (id, firm_id, name, siren, siret, naf_code, legal_form, fiscal_year_start_month)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Boulangerie Martin SARL', '123456789', '12345678900012', '1071C', 'SARL', 1),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Tech Solutions SAS', '987654321', '98765432100015', '6201Z', 'SAS', 7);

-- Test transactions for Boulangerie Martin
INSERT INTO public.transactions (company_id, date, label, amount, category, subcategory, cashflow_type, source)
VALUES
  ('b0000000-0000-0000-0000-000000000001', '2026-01-05', 'Ventes comptoir semaine 1', 4250.00, '701', 'Ventes de produits finis', 'operating_income', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-01-05', 'Achat farine Bio Meunerie', -1200.00, '601', 'Achats matières premières', 'operating_expense', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-01-10', 'Ventes comptoir semaine 2', 3980.00, '701', 'Ventes de produits finis', 'operating_income', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-01-15', 'Loyer local commercial', -1800.00, '613', 'Locations', 'operating_expense', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-01-15', 'Salaires janvier', -5200.00, '641', 'Rémunérations du personnel', 'operating_expense', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-01-20', 'Charges sociales janvier', -2340.00, '645', 'Charges de sécurité sociale', 'operating_expense', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-01-25', 'Ventes comptoir semaine 3-4', 8100.00, '701', 'Ventes de produits finis', 'operating_income', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-01-28', 'EDF Électricité', -380.00, '606', 'Achats non stockés', 'operating_expense', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-01-31', 'TVA collectée', -1250.00, '44571', 'TVA collectée', 'tax', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-01-31', 'Remboursement emprunt BPI', -850.00, '164', 'Emprunts établissements de crédit', 'financing_expense', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-02-05', 'Ventes comptoir février S1', 4100.00, '701', 'Ventes de produits finis', 'operating_income', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-02-10', 'Achat four professionnel', -12000.00, '215', 'Installations techniques', 'investing_expense', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-02-15', 'Subvention région équipement', 3000.00, '74', 'Subventions exploitation', 'operating_income', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-02-15', 'Loyer local commercial', -1800.00, '613', 'Locations', 'operating_expense', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-02-15', 'Salaires février', -5200.00, '641', 'Rémunérations du personnel', 'operating_expense', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-02-20', 'Ventes comptoir février S2-3', 7800.00, '701', 'Ventes de produits finis', 'operating_income', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-02-28', 'Remboursement emprunt BPI', -850.00, '164', 'Emprunts établissements de crédit', 'financing_expense', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-03-05', 'Ventes comptoir mars S1', 4500.00, '701', 'Ventes de produits finis', 'operating_income', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-03-10', 'Achat emballages', -600.00, '602', 'Achats autres approvisionnements', 'operating_expense', 'manual'),
  ('b0000000-0000-0000-0000-000000000001', '2026-03-15', 'Salaires mars', -5200.00, '641', 'Rémunérations du personnel', 'operating_expense', 'manual');
