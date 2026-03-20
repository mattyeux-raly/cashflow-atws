// REQUIREMENT: Vercel Serverless Function — sync Pennylane transactions
// SECURITY: Clé API Pennylane côté serveur uniquement (env var PENNYLANE_API_KEY)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ─── RATE LIMITER (en mémoire — reset à chaque cold start) ───
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): { allowed: boolean; retryAfterMs?: number } {
  const key = `${userId}:sync`;
  const now = Date.now();
  const windowMs = 300_000; // 5 min entre chaque sync

  const entry = rateLimitStore.get(key);
  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (entry.count >= 1) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }
  entry.count++;
  return { allowed: true };
}

// ─── PENNYLANE CLIENT ─────────────────────────────────────────
const PENNYLANE_BASE_URL = 'https://app.pennylane.com/api/external/v2';

async function pennylaneRequest(apiKey: string, path: string, retryCount = 0): Promise<unknown> {
  const response = await fetch(`${PENNYLANE_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After') ?? '60');
    if (retryCount < 3) {
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      return pennylaneRequest(apiKey, path, retryCount + 1);
    }
    throw { message: 'Limite de requêtes Pennylane dépassée', status: 429 };
  }

  if (response.status === 401) {
    throw { message: 'Clé API Pennylane invalide ou expirée', status: 401 };
  }

  if (response.status === 403) {
    throw { message: 'Scope insuffisant — vérifiez transactions:readonly', status: 403 };
  }

  if (response.status >= 500 && retryCount < 3) {
    await new Promise((r) => setTimeout(r, [1000, 3000, 9000][retryCount]));
    return pennylaneRequest(apiKey, path, retryCount + 1);
  }

  if (!response.ok) {
    // REQUIREMENT: Loguer le body pour debugger les erreurs Pennylane
    const errorBody = await response.text().catch(() => 'no body');
    throw { message: `Erreur API Pennylane ${response.status}: ${errorBody}`, status: 502 };
  }

  return response.json();
}

interface PennylaneTransaction {
  id: string;
  date: string;
  label: string;
  amount: number;
  currency: string;
  bank_account_name: string | null;
  is_reconciled: boolean;
}

// REQUIREMENT: API v2 utilise cursor-based pagination
interface PaginatedResponse {
  has_more: boolean;
  next_cursor: string | null;
  items: Array<{
    id: number;
    label: string | null;
    date: string;
    amount: string;
    currency: string | null;
    currency_amount: string;
    bank_account: { name: string } | null;
    attachment_required: boolean;
  }>;
}

async function fetchAllTransactions(apiKey: string, since?: string): Promise<PennylaneTransaction[]> {
  const all: PennylaneTransaction[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    let url = `/transactions?limit=100`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

    const response = await pennylaneRequest(apiKey, url) as PaginatedResponse;

    for (const item of response.items) {
      all.push({
        id: String(item.id ?? ''),
        date: item.date ?? '',
        label: item.label ?? 'Sans libellé',
        amount: Number(item.amount ?? 0),
        currency: item.currency ?? 'EUR',
        bank_account_name: item.bank_account?.name ?? null,
        is_reconciled: item.attachment_required ?? false,
      });
    }

    hasMore = response.has_more === true;
    cursor = response.next_cursor ?? undefined;
  }

  return all;
}

// ─── CATÉGORISATION PAR LIBELLÉ ───────────────────────────────
function categorizeByLabel(label: string, amount: number): string {
  const n = label.toLowerCase();

  // Fiscal (avant exploitation pour éviter conflit avec 'cotisation', 'cfe', etc.)
  if (n.includes('tva') || n.includes('dgfip') || n.includes('tresor public') || n.includes('impot') || n.includes('cfe') || n.includes('cvae') || n.includes('cotisation fonciere')) return 'tax';

  // Investissement (avant exploitation pour éviter que 'achat' ne capture 'achat equipement')
  if (n.includes('materiel') || n.includes('equipement') || n.includes('machine') || n.includes('four') || n.includes('vehicule') || n.includes('investissement')) return 'investing_expense';
  if (n.includes('travaux') || n.includes('amenagement')) return 'investing_expense';
  if (n.includes('cession') || n.includes('vente materiel')) return 'investing_income';

  // Financement
  if (n.includes('emprunt') || n.includes('remboursement pret') || n.includes('echeance') || n.includes('bpi')) return 'financing_expense';
  if (n.includes('deblocage pret') || n.includes('apport capital')) return 'financing_income';
  if (n.includes('interet') || n.includes('interets')) return 'financing_expense';
  if (n.includes('dividende')) return 'financing_expense';

  // Exploitation — Publicité / Marketing
  if (n.includes('publicite') || n.includes('marketing') || n.includes('google ads') || n.includes('facebook') || n.includes('meta') || n.includes('communication') || n.includes('pub ') || n.includes('ads')) return 'operating_expense';

  // Exploitation — Charges
  if (n.includes('loyer') || n.includes('bail')) return 'operating_expense';
  if (n.includes('salaire') || n.includes('paie') || n.includes('virement paie')) return 'operating_expense';
  if (n.includes('urssaf') || n.includes('cotisation') || n.includes('charges sociales')) return 'operating_expense';
  if (n.includes('edf') || n.includes('electricite') || n.includes('engie') || n.includes('eau')) return 'operating_expense';
  if (n.includes('assurance')) return 'operating_expense';
  if (n.includes('achat') || n.includes('fournisseur') || n.includes('facture')) return 'operating_expense';
  if (n.includes('frais bancaire') || n.includes('commission') || n.includes('agios')) return 'operating_expense';
  if (n.includes('prime')) return 'operating_expense';

  // Exploitation — Revenus
  if (n.includes('encaissement') || n.includes('vir recu') || n.includes('virement recu') || n.includes('remise cheque')) return 'operating_income';
  if (n.includes('ventes') || n.includes('client')) return 'operating_income';
  if (n.includes('subvention')) return 'operating_income';

  // Fallback par signe du montant
  if (amount > 0) return 'operating_income';
  return 'other';
}

// ─── HANDLER PRINCIPAL ────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // SECURITY: Vérifier le JWT Supabase
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Token d'authentification manquant" });
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Configuration Supabase manquante côté serveur' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }

    // Profil utilisateur
    const { data: profile } = await supabase
      .from('users')
      .select('firm_id, role')
      .eq('id', user.id)
      .single();

    const userId = user.id;
    const firmId = profile?.firm_id ?? '';
    const role = profile?.role ?? 'owner';

    if (!['owner', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Rôle insuffisant pour la synchronisation' });
    }

    // Rate limit — 1 sync par 5 minutes par utilisateur
    const rateCheck = checkRateLimit(userId);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'Synchronisation en cours. Réessayez dans 5 minutes.',
        retryAfterMs: rateCheck.retryAfterMs,
      });
    }

    // SECURITY: Clé API Pennylane côté serveur uniquement
    const apiKey = process.env.PENNYLANE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Clé API Pennylane non configurée (PENNYLANE_API_KEY)' });
    }

    // Trouver l'entreprise
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('firm_id', firmId)
      .limit(1)
      .single();

    if (!company) {
      return res.status(404).json({ error: 'Aucune entreprise trouvée pour ce cabinet' });
    }

    // Date de dernière sync
    const { data: lastTx } = await supabase
      .from('transactions')
      .select('date')
      .eq('company_id', company.id)
      .eq('source', 'pennylane')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    const sinceDate = lastTx?.date
      ?? new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch et upsert
    const startTime = Date.now();
    const bankTransactions = await fetchAllTransactions(apiKey, sinceDate);

    let totalSynced = 0;
    for (const tx of bankTransactions) {
      const cashflowType = categorizeByLabel(tx.label, tx.amount);

      const { error: upsertError } = await supabase
        .from('transactions')
        .insert({
          company_id: company.id,
          pennylane_id: tx.id,
          date: tx.date,
          label: tx.label,
          amount: tx.amount,
          currency: tx.currency ?? 'EUR',
          cashflow_type: cashflowType,
          bank_account: tx.bank_account_name ?? null,
          is_reconciled: tx.is_reconciled ?? false,
          pennylane_metadata: {},
          source: 'pennylane',
        });

      if (upsertError) {
        // Skip les doublons (déjà importé), log les autres erreurs
        if (!upsertError.message?.includes('duplicate')) {
          console.error('Insert error:', upsertError.message, 'tx:', tx.id);
        }
      } else {
        totalSynced++;
      }
    }

    const durationMs = Date.now() - startTime;

    // Audit log
    await supabase.from('audit_log').insert({
      firm_id: firmId,
      user_id: userId,
      action: 'pennylane_sync',
      resource_type: 'transaction',
      details: { nb_transactions: totalSynced, duration_ms: durationMs },
    });

    return res.status(200).json({
      success: true,
      transactionsSynced: totalSynced,
      durationMs,
    });

  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    const status = err.status ?? 500;
    const message = err.message ?? 'Erreur interne du serveur';
    return res.status(status).json({ error: message });
  }
}
