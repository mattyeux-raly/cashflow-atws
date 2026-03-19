import type { CashflowType } from '@cashflow/shared';

// REQUIREMENT: Catégorisation automatique des transactions bancaires par mots-clés dans le libellé

export interface LabelRule {
  keywords: string[];
  type: CashflowType;
  label: string;
}

// REQUIREMENT: Règles par défaut — mots-clés courants dans les libellés bancaires français
export const DEFAULT_LABEL_RULES: LabelRule[] = [
  // Exploitation — Revenus
  { keywords: ['virement recu', 'vir recu', 'encaissement', 'remise cheque', 'cb client', 'paiement client'], type: 'operating_income', label: 'Encaissement client' },
  { keywords: ['ventes', 'vente', 'ca ', 'chiffre'], type: 'operating_income', label: 'Ventes' },
  { keywords: ['subvention', 'aide region', 'bpifrance'], type: 'operating_income', label: 'Subvention' },
  { keywords: ['remboursement trop', 'avoir'], type: 'operating_income', label: 'Remboursement / Avoir' },

  // Exploitation — Charges
  { keywords: ['loyer', 'bail', 'fermage'], type: 'operating_expense', label: 'Loyer' },
  { keywords: ['salaire', 'paie', 'remuneration', 'virement paie'], type: 'operating_expense', label: 'Salaires' },
  { keywords: ['urssaf', 'cotisation', 'charges sociales', 'prevoyance', 'mutuelle', 'retraite'], type: 'operating_expense', label: 'Charges sociales' },
  { keywords: ['edf', 'engie', 'electricite', 'gaz', 'eau', 'veolia'], type: 'operating_expense', label: 'Énergie / Eau' },
  { keywords: ['assurance', 'maif', 'axa', 'allianz', 'generali'], type: 'operating_expense', label: 'Assurance' },
  { keywords: ['telephone', 'mobile', 'orange', 'sfr', 'bouygues', 'free', 'internet', 'fibre'], type: 'operating_expense', label: 'Télécom' },
  { keywords: ['achat', 'fournisseur', 'facture', 'commande'], type: 'operating_expense', label: 'Achats / Fournisseurs' },
  { keywords: ['carburant', 'total energies', 'essence', 'gasoil', 'peage', 'autoroute'], type: 'operating_expense', label: 'Déplacements' },
  { keywords: ['comptable', 'expert comptable', 'avocat', 'honoraire', 'conseil'], type: 'operating_expense', label: 'Honoraires' },
  { keywords: ['maintenance', 'reparation', 'entretien', 'sav'], type: 'operating_expense', label: 'Maintenance' },
  { keywords: ['publicite', 'marketing', 'google ads', 'facebook', 'meta', 'communication'], type: 'operating_expense', label: 'Publicité / Marketing' },
  { keywords: ['abonnement', 'licence', 'saas', 'logiciel'], type: 'operating_expense', label: 'Abonnements' },
  { keywords: ['frais bancaire', 'commission', 'agios', 'cotisation carte'], type: 'operating_expense', label: 'Frais bancaires' },
  { keywords: ['prime noel', 'prime', 'bonus'], type: 'operating_expense', label: 'Primes' },

  // Investissement
  { keywords: ['materiel', 'equipement', 'machine', 'four', 'vehicule', 'camion', 'investissement'], type: 'investing_expense', label: 'Investissement matériel' },
  { keywords: ['travaux', 'amenagement', 'renovation'], type: 'investing_expense', label: 'Travaux / Aménagement' },
  { keywords: ['cession', 'vente materiel', 'vente vehicule'], type: 'investing_income', label: 'Cession d\'actif' },

  // Financement
  { keywords: ['emprunt', 'pret', 'credit', 'remboursement emprunt', 'echeance pret', 'bpi'], type: 'financing_expense', label: 'Remboursement emprunt' },
  { keywords: ['deblocage pret', 'versement emprunt', 'mise en place credit'], type: 'financing_income', label: 'Déblocage emprunt' },
  { keywords: ['interet', 'interets'], type: 'financing_expense', label: 'Intérêts' },
  { keywords: ['apport capital', 'augmentation capital', 'apport cca'], type: 'financing_income', label: 'Apport en capital' },
  { keywords: ['dividende', 'distribution'], type: 'financing_expense', label: 'Dividendes' },

  // Fiscal
  { keywords: ['tva', 'taxe valeur ajoutee'], type: 'tax', label: 'TVA' },
  { keywords: ['impot', 'dgfip', 'tresor public', 'cfe', 'cvae', 'is ', 'impots gouv'], type: 'tax', label: 'Impôts et taxes' },
  { keywords: ['taxe fonciere', 'taxe habitation'], type: 'tax', label: 'Taxes foncières' },
];

export const CASHFLOW_TYPE_LABELS: Record<CashflowType, string> = {
  operating_income: 'Exploitation — Revenus',
  operating_expense: 'Exploitation — Charges',
  investing_income: 'Investissement — Revenus',
  investing_expense: 'Investissement — Dépenses',
  financing_income: 'Financement — Revenus',
  financing_expense: 'Financement — Charges',
  tax: 'Fiscal',
  other: 'Autre',
};

export function categorizeByLabel(
  label: string,
  amount: number,
  customRules?: LabelRule[],
): { type: CashflowType; ruleLabel: string } {
  const normalized = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // REQUIREMENT: Vérifier les règles custom d'abord, puis les règles par défaut
  const allRules = customRules
    ? [...customRules, ...DEFAULT_LABEL_RULES]
    : DEFAULT_LABEL_RULES;

  for (const rule of allRules) {
    for (const keyword of rule.keywords) {
      const normalizedKeyword = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalized.includes(normalizedKeyword)) {
        return { type: rule.type, ruleLabel: rule.label };
      }
    }
  }

  // Fallback : si pas de règle trouvée, catégoriser par le signe du montant
  if (amount > 0) {
    return { type: 'operating_income', ruleLabel: 'Encaissement non catégorisé' };
  }
  return { type: 'other', ruleLabel: 'Non catégorisé' };
}
