import type { Transaction } from '@cashflow/shared';

export interface ReconciliationResult {
  matched: Array<{ transactionId: string; bankEntryId: string; confidence: number }>;
  unmatchedTransactions: string[];
  unmatchedBankEntries: string[];
  matchRate: number;
}

interface BankEntry {
  id: string;
  date: string;
  amount: number;
  label: string;
}

// REQUIREMENT: Auto-reconcile bank entries with accounting transactions
export function reconcileTransactions(
  transactions: Transaction[],
  bankEntries: BankEntry[],
  toleranceDays: number = 3,
): ReconciliationResult {
  const matched: ReconciliationResult['matched'] = [];
  const usedTransactions = new Set<string>();
  const usedBankEntries = new Set<string>();

  // Sort by amount for efficient matching
  const sortedTx = [...transactions].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const sortedEntries = [...bankEntries].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  for (const entry of sortedEntries) {
    let bestMatch: { txId: string; confidence: number } | null = null;

    for (const tx of sortedTx) {
      if (usedTransactions.has(tx.id)) continue;

      // Exact amount match
      if (Math.abs(tx.amount - entry.amount) < 0.01) {
        const dateDiff = Math.abs(
          new Date(tx.date).getTime() - new Date(entry.date).getTime(),
        ) / (1000 * 60 * 60 * 24);

        if (dateDiff <= toleranceDays) {
          const dateConfidence = 1 - dateDiff / (toleranceDays * 2);
          const labelSimilarity = computeLabelSimilarity(tx.label, entry.label);
          const confidence = Math.round((0.5 * dateConfidence + 0.3 + 0.2 * labelSimilarity) * 100) / 100;

          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { txId: tx.id, confidence };
          }
        }
      }
    }

    if (bestMatch && bestMatch.confidence > 0.5) {
      matched.push({
        transactionId: bestMatch.txId,
        bankEntryId: entry.id,
        confidence: bestMatch.confidence,
      });
      usedTransactions.add(bestMatch.txId);
      usedBankEntries.add(entry.id);
    }
  }

  const unmatchedTransactions = transactions
    .filter((tx) => !usedTransactions.has(tx.id))
    .map((tx) => tx.id);
  const unmatchedBankEntries = bankEntries
    .filter((e) => !usedBankEntries.has(e.id))
    .map((e) => e.id);

  const totalEntries = bankEntries.length;
  const matchRate = totalEntries > 0 ? matched.length / totalEntries : 0;

  return { matched, unmatchedTransactions, unmatchedBankEntries, matchRate };
}

// Simple label similarity using common token overlap
function computeLabelSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.toLowerCase().split(/\s+/));
  const tokensB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...tokensA].filter((t) => tokensB.has(t));
  const union = new Set([...tokensA, ...tokensB]);
  return union.size > 0 ? intersection.length / union.size : 0;
}
