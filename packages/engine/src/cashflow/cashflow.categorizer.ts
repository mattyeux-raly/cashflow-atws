import type { CashflowType } from '@cashflow/shared';

// REQUIREMENT: PCG account number to cashflow type mapping
// Based on Plan Comptable Général (French accounting standards)

export interface PcgMapping {
  prefix: string;
  type: CashflowType;
  label: string;
}

export const PCG_MAPPINGS: PcgMapping[] = [
  // Classe 7 — Produits
  { prefix: '701', type: 'operating_income', label: 'Ventes de produits finis' },
  { prefix: '706', type: 'operating_income', label: 'Prestations de services' },
  { prefix: '707', type: 'operating_income', label: 'Ventes de marchandises' },
  { prefix: '70', type: 'operating_income', label: 'Chiffre d\'affaires' },
  { prefix: '74', type: 'operating_income', label: 'Subventions d\'exploitation' },
  { prefix: '75', type: 'operating_income', label: 'Autres produits de gestion' },
  { prefix: '76', type: 'financing_income', label: 'Produits financiers' },
  { prefix: '77', type: 'other', label: 'Produits exceptionnels' },
  // Classe 6 — Charges
  { prefix: '601', type: 'operating_expense', label: 'Achats matières premières' },
  { prefix: '602', type: 'operating_expense', label: 'Autres approvisionnements' },
  { prefix: '606', type: 'operating_expense', label: 'Achats non stockés' },
  { prefix: '607', type: 'operating_expense', label: 'Achats de marchandises' },
  { prefix: '60', type: 'operating_expense', label: 'Achats' },
  { prefix: '61', type: 'operating_expense', label: 'Services extérieurs' },
  { prefix: '62', type: 'operating_expense', label: 'Autres services extérieurs' },
  { prefix: '63', type: 'operating_expense', label: 'Impôts et taxes' },
  { prefix: '641', type: 'operating_expense', label: 'Rémunérations du personnel' },
  { prefix: '645', type: 'operating_expense', label: 'Charges de sécurité sociale' },
  { prefix: '64', type: 'operating_expense', label: 'Charges de personnel' },
  { prefix: '65', type: 'operating_expense', label: 'Autres charges de gestion' },
  { prefix: '66', type: 'financing_expense', label: 'Charges financières' },
  { prefix: '67', type: 'other', label: 'Charges exceptionnelles' },
  { prefix: '68', type: 'other', label: 'Dotations amortissements' },
  // Classe 2 — Immobilisations
  { prefix: '20', type: 'investing_expense', label: 'Immobilisations incorporelles' },
  { prefix: '21', type: 'investing_expense', label: 'Immobilisations corporelles' },
  { prefix: '23', type: 'investing_expense', label: 'Immobilisations en cours' },
  { prefix: '26', type: 'investing_expense', label: 'Participations' },
  { prefix: '27', type: 'investing_expense', label: 'Autres immobilisations financières' },
  // Classe 1 — Capitaux
  { prefix: '16', type: 'financing_expense', label: 'Emprunts' },
  // Classe 4 — Tiers (TVA, IS)
  { prefix: '44571', type: 'tax', label: 'TVA collectée' },
  { prefix: '44566', type: 'tax', label: 'TVA déductible' },
  { prefix: '445', type: 'tax', label: 'TVA' },
  { prefix: '44', type: 'tax', label: 'État et collectivités' },
  { prefix: '695', type: 'tax', label: 'Impôt sur les bénéfices' },
];

export function categorizePcgAccount(
  accountNumber: string,
  overrides?: Array<{ prefix: string; type: CashflowType; label?: string | null }>,
): { type: CashflowType; label: string } {
  // REQUIREMENT: Check user overrides first (most specific prefix match)
  if (overrides && overrides.length > 0) {
    const sortedOverrides = [...overrides].sort((a, b) => b.prefix.length - a.prefix.length);
    for (const ov of sortedOverrides) {
      if (accountNumber.startsWith(ov.prefix)) {
        return { type: ov.type, label: ov.label ?? CASHFLOW_TYPE_LABELS[ov.type] ?? 'Personnalisé' };
      }
    }
  }

  // REQUIREMENT: Match the most specific prefix first (sorted by prefix length desc)
  const sorted = [...PCG_MAPPINGS].sort((a, b) => b.prefix.length - a.prefix.length);

  for (const mapping of sorted) {
    if (accountNumber.startsWith(mapping.prefix)) {
      return { type: mapping.type, label: mapping.label };
    }
  }

  return { type: 'other', label: 'Non catégorisé' };
}

const CASHFLOW_TYPE_LABELS: Record<string, string> = {
  operating_income: 'Exploitation — Revenus',
  operating_expense: 'Exploitation — Charges',
  investing_income: 'Investissement — Revenus',
  investing_expense: 'Investissement — Dépenses',
  financing_income: 'Financement — Revenus',
  financing_expense: 'Financement — Charges',
  tax: 'Fiscal',
  other: 'Autre',
};

export function getPcgCategoryLabel(category: string): string {
  const mapping = PCG_MAPPINGS.find((m) => m.prefix === category);
  return mapping?.label ?? category;
}
