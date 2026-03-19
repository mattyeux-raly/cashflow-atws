// REQUIREMENT: Demo mode — realistic French mock data for previewing the app without Supabase
import type { User, Firm, Company, Transaction } from '@cashflow/shared';

export const DEMO_FIRM: Firm = {
  id: 'a0000000-0000-0000-0000-000000000001',
  name: 'Cabinet Dupont & Associés',
  siret: '12345678901234',
  email: 'contact@cabinet-dupont.fr',
  plan: 'pro',
  gdprDpoEmail: 'dpo@cabinet-dupont.fr',
  dataRetentionMonths: 36,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2026-03-01T08:00:00Z',
};

export const DEMO_USER: User = {
  id: 'u0000000-0000-0000-0000-000000000001',
  firmId: DEMO_FIRM.id,
  role: 'owner',
  fullName: 'Marie Dupont',
  gdprConsentAt: '2024-01-15T10:05:00Z',
  gdprConsentVersion: '1.0',
  lastLoginAt: '2026-03-19T08:30:00Z',
  createdAt: '2024-01-15T10:00:00Z',
};

export const DEMO_COMPANIES: Company[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    firmId: DEMO_FIRM.id,
    pennylaneCompanyId: 'pl-001',
    name: 'Boulangerie Martin SARL',
    siren: '123456789',
    siret: '12345678900012',
    nafCode: '1071C',
    legalForm: 'SARL',
    fiscalYearStartMonth: 1,
    currency: 'EUR',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    firmId: DEMO_FIRM.id,
    pennylaneCompanyId: 'pl-002',
    name: 'Tech Solutions SAS',
    siren: '987654321',
    siret: '98765432100015',
    nafCode: '6201Z',
    legalForm: 'SAS',
    fiscalYearStartMonth: 7,
    currency: 'EUR',
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
];

let txId = 0;
function tx(
  date: string,
  label: string,
  amount: number,
  cashflowType: Transaction['cashflowType'],
  category: string,
  subcategory: string,
): Transaction {
  txId++;
  return {
    id: `tx-${String(txId).padStart(4, '0')}`,
    companyId: DEMO_COMPANIES[0]!.id,
    pennylaneId: `pl-tx-${txId}`,
    date,
    label,
    amount,
    currency: 'EUR',
    category,
    subcategory,
    cashflowType,
    bankAccount: 'FR76 3000 1007 1600 0000 0000 123',
    isReconciled: true,
    pennylaneMetadata: {},
    source: 'pennylane',
    createdAt: `${date}T12:00:00Z`,
    updatedAt: `${date}T12:00:00Z`,
  };
}

export const DEMO_TRANSACTIONS: Transaction[] = [
  // === Octobre 2025 ===
  tx('2025-10-03', 'Ventes comptoir semaine 1', 4100, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2025-10-07', 'Achat farine Meunerie du Moulin', -1350, 'operating_expense', '601', 'Achats matières premières'),
  tx('2025-10-10', 'Ventes comptoir semaine 2', 3850, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2025-10-15', 'Loyer local commercial', -1800, 'operating_expense', '613', 'Locations'),
  tx('2025-10-15', 'Salaires octobre', -5200, 'operating_expense', '641', 'Rémunérations du personnel'),
  tx('2025-10-20', 'Charges sociales octobre', -2340, 'operating_expense', '645', 'Charges de sécurité sociale'),
  tx('2025-10-22', 'Ventes comptoir semaine 3', 4300, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2025-10-28', 'EDF Électricité', -410, 'operating_expense', '606', 'Achats non stockés'),
  tx('2025-10-31', 'Ventes comptoir semaine 4', 3900, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2025-10-31', 'Remboursement emprunt BPI', -850, 'financing_expense', '164', 'Emprunts établissements de crédit'),

  // === Novembre 2025 ===
  tx('2025-11-05', 'Ventes comptoir semaine 1', 3700, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2025-11-08', 'Achat beurre AOP Charentes', -980, 'operating_expense', '601', 'Achats matières premières'),
  tx('2025-11-12', 'Ventes comptoir semaine 2', 4200, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2025-11-15', 'Loyer local commercial', -1800, 'operating_expense', '613', 'Locations'),
  tx('2025-11-15', 'Salaires novembre', -5200, 'operating_expense', '641', 'Rémunérations du personnel'),
  tx('2025-11-20', 'Charges sociales novembre', -2340, 'operating_expense', '645', 'Charges de sécurité sociale'),
  tx('2025-11-22', 'Ventes comptoir semaine 3', 4500, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2025-11-25', 'Assurance local', -320, 'operating_expense', '616', 'Primes d\'assurance'),
  tx('2025-11-28', 'Ventes comptoir semaine 4', 3950, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2025-11-30', 'Remboursement emprunt BPI', -850, 'financing_expense', '164', 'Emprunts établissements de crédit'),
  tx('2025-11-30', 'TVA à reverser', -1250, 'tax', '44571', 'TVA collectée'),

  // === Décembre 2025 (saison haute Noël) ===
  tx('2025-12-03', 'Ventes comptoir + commandes Noël S1', 6200, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2025-12-05', 'Achat ingrédients spéciaux Noël', -2100, 'operating_expense', '601', 'Achats matières premières'),
  tx('2025-12-10', 'Ventes comptoir + bûches S2', 7500, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2025-12-15', 'Loyer local commercial', -1800, 'operating_expense', '613', 'Locations'),
  tx('2025-12-15', 'Salaires décembre', -5200, 'operating_expense', '641', 'Rémunérations du personnel'),
  tx('2025-12-15', 'Prime de Noël employés', -1500, 'operating_expense', '641', 'Rémunérations du personnel'),
  tx('2025-12-18', 'Ventes galettes des rois (pré-commandes)', 3200, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2025-12-20', 'Charges sociales décembre', -2340, 'operating_expense', '645', 'Charges de sécurité sociale'),
  tx('2025-12-24', 'Ventes réveillon S4', 8900, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2025-12-31', 'Remboursement emprunt BPI', -850, 'financing_expense', '164', 'Emprunts établissements de crédit'),

  // === Janvier 2026 ===
  tx('2026-01-05', 'Ventes galettes des rois S1', 5800, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2026-01-07', 'Achat farine Bio Meunerie', -1200, 'operating_expense', '601', 'Achats matières premières'),
  tx('2026-01-10', 'Ventes comptoir semaine 2', 3980, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2026-01-15', 'Loyer local commercial', -1800, 'operating_expense', '613', 'Locations'),
  tx('2026-01-15', 'Salaires janvier', -5200, 'operating_expense', '641', 'Rémunérations du personnel'),
  tx('2026-01-20', 'Charges sociales janvier', -2340, 'operating_expense', '645', 'Charges de sécurité sociale'),
  tx('2026-01-25', 'Ventes comptoir S3-4', 8100, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2026-01-28', 'EDF Électricité', -380, 'operating_expense', '606', 'Achats non stockés'),
  tx('2026-01-31', 'TVA à reverser', -1250, 'tax', '44571', 'TVA collectée'),
  tx('2026-01-31', 'Remboursement emprunt BPI', -850, 'financing_expense', '164', 'Emprunts établissements de crédit'),

  // === Février 2026 ===
  tx('2026-02-05', 'Ventes comptoir S1', 4100, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2026-02-10', 'Achat four professionnel', -12000, 'investing_expense', '215', 'Installations techniques'),
  tx('2026-02-10', 'Subvention région équipement', 3000, 'operating_income', '74', 'Subventions exploitation'),
  tx('2026-02-12', 'Ventes comptoir S2', 3800, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2026-02-15', 'Loyer local commercial', -1800, 'operating_expense', '613', 'Locations'),
  tx('2026-02-15', 'Salaires février', -5200, 'operating_expense', '641', 'Rémunérations du personnel'),
  tx('2026-02-20', 'Charges sociales février', -2340, 'operating_expense', '645', 'Charges de sécurité sociale'),
  tx('2026-02-22', 'Ventes comptoir S3', 4200, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2026-02-25', 'Ventes comptoir S4', 3600, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2026-02-28', 'Remboursement emprunt BPI', -850, 'financing_expense', '164', 'Emprunts établissements de crédit'),

  // === Mars 2026 (partiel) ===
  tx('2026-03-05', 'Ventes comptoir S1', 4500, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2026-03-08', 'Achat emballages éco', -600, 'operating_expense', '602', 'Autres approvisionnements'),
  tx('2026-03-10', 'Ventes comptoir S2', 4100, 'operating_income', '701', 'Ventes de produits finis'),
  tx('2026-03-12', 'Intérêts livret pro', 85, 'financing_income', '764', 'Produits financiers'),
  tx('2026-03-15', 'Loyer local commercial', -1800, 'operating_expense', '613', 'Locations'),
  tx('2026-03-15', 'Salaires mars', -5200, 'operating_expense', '641', 'Rémunérations du personnel'),
  tx('2026-03-18', 'Ventes comptoir S3', 4300, 'operating_income', '701', 'Ventes de produits finis'),
];

// REQUIREMENT: Opening balance for the demo (before Oct 2025)
export const DEMO_OPENING_BALANCE = 35000;
