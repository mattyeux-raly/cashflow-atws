// REQUIREMENT: Sync bank transactions from Pennylane to local database
// SECURITY: API key stored as Supabase Edge Function secret

import { createClient } from '@supabase/supabase-js';
import { PennylaneClient, PennylaneApiError } from '../_shared/pennylane-client.ts';
import { verifyAuth, requireRole, AuthError } from '../_shared/auth.ts';
import { checkRateLimit } from '../_shared/rate-limiter.ts';

// REQUIREMENT: Catégorisation par libellé bancaire — mots-clés courants
function categorizeByLabel(label: string, amount: number): string {
  const n = label.toLowerCase();

  // Fiscal
  if (n.includes('tva') || n.includes('dgfip') || n.includes('tresor public') || n.includes('impot') || n.includes('cfe') || n.includes('cvae')) return 'tax';

  // Financement
  if (n.includes('emprunt') || n.includes('remboursement pret') || n.includes('echeance') || n.includes('bpi')) return 'financing_expense';
  if (n.includes('deblocage pret') || n.includes('apport capital')) return 'financing_income';
  if (n.includes('interet') || n.includes('interets')) return 'financing_expense';
  if (n.includes('dividende')) return 'financing_expense';

  // Investissement
  if (n.includes('materiel') || n.includes('equipement') || n.includes('machine') || n.includes('four') || n.includes('vehicule') || n.includes('investissement')) return 'investing_expense';
  if (n.includes('travaux') || n.includes('amenagement')) return 'investing_expense';
  if (n.includes('cession') || n.includes('vente materiel')) return 'investing_income';

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

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const auth = await verifyAuth(req);
    requireRole(auth, ['owner', 'admin']);

    const rateCheck = checkRateLimit(auth.userId, 'sync');
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({
        error: 'Synchronisation en cours. Réessayez plus tard.',
        retryAfterMs: rateCheck.retryAfterMs,
      }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }

    // REQUIREMENT: Clé API directe — pas d'OAuth
    const apiKey = Deno.env.get('PENNYLANE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Clé API Pennylane non configurée' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer l'entreprise liée au cabinet
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('firm_id', auth.firmId)
      .limit(1)
      .single();

    if (companyError || !company) {
      return new Response(JSON.stringify({ error: 'Aucune entreprise trouvée pour ce cabinet' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const client = new PennylaneClient(apiKey);

    // Chercher la date de dernière sync
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

    const startTime = Date.now();
    const bankTransactions = await client.getBankTransactions(sinceDate);

    let totalSynced = 0;
    for (const tx of bankTransactions) {
      const cashflowType = categorizeByLabel(tx.label, tx.amount);

      await supabase
        .from('transactions')
        .upsert({
          company_id: company.id,
          pennylane_id: tx.id,
          date: tx.date,
          label: tx.label,
          amount: tx.amount,
          currency: tx.currency ?? 'EUR',
          category: null,
          subcategory: null,
          cashflow_type: cashflowType,
          bank_account: tx.bank_account_name ?? null,
          is_reconciled: tx.is_reconciled ?? false,
          pennylane_metadata: {},
          source: 'pennylane',
        }, { onConflict: 'pennylane_id' });

      totalSynced++;
    }

    const durationMs = Date.now() - startTime;

    await supabase.from('audit_log').insert({
      firm_id: auth.firmId,
      user_id: auth.userId,
      action: 'pennylane_sync',
      resource_type: 'transaction',
      details: { nb_transactions: totalSynced, duration_ms: durationMs },
    });

    return new Response(JSON.stringify({
      success: true,
      transactionsSynced: totalSynced,
      durationMs,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    if (error instanceof AuthError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (error instanceof PennylaneApiError) {
      return new Response(JSON.stringify({
        error: `Erreur Pennylane: ${error.message}`,
        code: error.code,
      }), {
        status: error.status === 401 || error.status === 403 ? error.status : 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
