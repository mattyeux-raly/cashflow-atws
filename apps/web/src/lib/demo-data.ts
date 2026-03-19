// REQUIREMENT: Demo mode — realistic French bank transaction data
import type { User, Firm, Company, Transaction } from '@cashflow/shared';
import { categorizeByLabel } from '@cashflow/engine';

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
function tx(date: string, label: string, amount: number): Transaction {
  txId++;
  const { type } = categorizeByLabel(label, amount);
  return {
    id: `tx-${String(txId).padStart(4, '0')}`,
    companyId: DEMO_COMPANIES[0]!.id,
    pennylaneId: `pl-tx-${txId}`,
    date,
    label,
    amount,
    currency: 'EUR',
    category: null,
    subcategory: null,
    cashflowType: type,
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
  tx('2025-10-03', 'VIR RECU CLIENT HOTEL BELLEVUE', 4100),
  tx('2025-10-07', 'ACHAT FARINE MEUNERIE DU MOULIN', -1350),
  tx('2025-10-10', 'ENCAISSEMENT CB VENTES COMPTOIR', 3850),
  tx('2025-10-15', 'LOYER LOCAL COMMERCIAL OCT 2025', -1800),
  tx('2025-10-15', 'VIREMENT PAIE SALAIRES OCTOBRE', -5200),
  tx('2025-10-20', 'URSSAF COTISATIONS T3 2025', -2340),
  tx('2025-10-22', 'VIR RECU MAIRIE BUFFET RECEPTION', 4300),
  tx('2025-10-28', 'EDF ELECTRICITE PRELEVEMENT', -410),
  tx('2025-10-31', 'ENCAISSEMENT CB VENTES COMPTOIR', 3900),
  tx('2025-10-31', 'REMBOURSEMENT EMPRUNT BPI FRANCE', -850),

  // === Novembre 2025 ===
  tx('2025-11-05', 'ENCAISSEMENT CB VENTES COMPTOIR', 3700),
  tx('2025-11-08', 'ACHAT BEURRE AOP CHARENTES FOURNISSEUR', -980),
  tx('2025-11-12', 'VIR RECU TRAITEUR MARIAGE LEROY', 4200),
  tx('2025-11-15', 'LOYER LOCAL COMMERCIAL NOV 2025', -1800),
  tx('2025-11-15', 'VIREMENT PAIE SALAIRES NOVEMBRE', -5200),
  tx('2025-11-20', 'URSSAF COTISATIONS OCT 2025', -2340),
  tx('2025-11-22', 'VIR RECU CLIENT RESTAURANT LE GOURMET', 4500),
  tx('2025-11-25', 'MAIF ASSURANCE LOCAL PRELEVEMENT', -320),
  tx('2025-11-28', 'ENCAISSEMENT CB VENTES COMPTOIR', 3950),
  tx('2025-11-30', 'REMBOURSEMENT EMPRUNT BPI FRANCE', -850),
  tx('2025-11-30', 'DGFIP TVA A REVERSER NOV 2025', -1250),

  // === Décembre 2025 (saison haute Noël) ===
  tx('2025-12-03', 'ENCAISSEMENT CB VENTES COMPTOIR NOEL', 6200),
  tx('2025-12-05', 'ACHAT INGREDIENTS SPECIAUX NOEL', -2100),
  tx('2025-12-10', 'VIR RECU COMMANDES BUCHES NOEL', 7500),
  tx('2025-12-15', 'LOYER LOCAL COMMERCIAL DEC 2025', -1800),
  tx('2025-12-15', 'VIREMENT PAIE SALAIRES DECEMBRE', -5200),
  tx('2025-12-15', 'PRIME NOEL EMPLOYES VIREMENT', -1500),
  tx('2025-12-18', 'ENCAISSEMENT CB PRE-COMMANDES GALETTES', 3200),
  tx('2025-12-20', 'URSSAF COTISATIONS NOV 2025', -2340),
  tx('2025-12-24', 'ENCAISSEMENT CB VENTES REVEILLON', 8900),
  tx('2025-12-31', 'REMBOURSEMENT EMPRUNT BPI FRANCE', -850),

  // === Janvier 2026 ===
  tx('2026-01-05', 'ENCAISSEMENT CB GALETTES DES ROIS', 5800),
  tx('2026-01-07', 'ACHAT FARINE BIO MEUNERIE LOCALE', -1200),
  tx('2026-01-10', 'VIR RECU CLIENT COMITE ENTREPRISE', 3980),
  tx('2026-01-15', 'LOYER LOCAL COMMERCIAL JAN 2026', -1800),
  tx('2026-01-15', 'VIREMENT PAIE SALAIRES JANVIER', -5200),
  tx('2026-01-20', 'URSSAF COTISATIONS DEC 2025', -2340),
  tx('2026-01-25', 'ENCAISSEMENT CB VENTES COMPTOIR', 8100),
  tx('2026-01-28', 'EDF ELECTRICITE PRELEVEMENT', -380),
  tx('2026-01-31', 'DGFIP TVA A REVERSER JAN 2026', -1250),
  tx('2026-01-31', 'REMBOURSEMENT EMPRUNT BPI FRANCE', -850),

  // === Février 2026 ===
  tx('2026-02-05', 'ENCAISSEMENT CB VENTES COMPTOIR', 4100),
  tx('2026-02-10', 'ACHAT FOUR PROFESSIONNEL EQUIPEMENT', -12000),
  tx('2026-02-10', 'VIR RECU SUBVENTION REGION EQUIPEMENT', 3000),
  tx('2026-02-12', 'VIR RECU CLIENT EPICERIE FINE MARTIN', 3800),
  tx('2026-02-15', 'LOYER LOCAL COMMERCIAL FEV 2026', -1800),
  tx('2026-02-15', 'VIREMENT PAIE SALAIRES FEVRIER', -5200),
  tx('2026-02-20', 'URSSAF COTISATIONS JAN 2026', -2340),
  tx('2026-02-22', 'ENCAISSEMENT CB VENTES COMPTOIR', 4200),
  tx('2026-02-25', 'ENCAISSEMENT CB VENTES COMPTOIR', 3600),
  tx('2026-02-28', 'REMBOURSEMENT EMPRUNT BPI FRANCE', -850),

  // === Mars 2026 (partiel) ===
  tx('2026-03-05', 'ENCAISSEMENT CB VENTES COMPTOIR', 4500),
  tx('2026-03-08', 'ACHAT EMBALLAGES ECO FOURNISSEUR', -600),
  tx('2026-03-10', 'VIR RECU CLIENT RESTAURANT JEAN', 4100),
  tx('2026-03-12', 'INTERETS LIVRET PRO BNP PARIBAS', 85),
  tx('2026-03-15', 'LOYER LOCAL COMMERCIAL MAR 2026', -1800),
  tx('2026-03-15', 'VIREMENT PAIE SALAIRES MARS', -5200),
  tx('2026-03-18', 'ENCAISSEMENT CB VENTES COMPTOIR', 4300),
];

// REQUIREMENT: Opening balance for the demo (before Oct 2025)
export const DEMO_OPENING_BALANCE = 35000;
