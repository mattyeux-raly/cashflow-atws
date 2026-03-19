// REQUIREMENT: Sync bank transactions from Pennylane to local database
// SECURITY: Admin+ role required, tokens decrypted from pgcrypto

import { createClient } from '@supabase/supabase-js';
import { PennylaneClient, PennylaneApiError } from '../_shared/pennylane-client.ts';
import { decryptToken, encryptToken } from '../_shared/encryption.ts';
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: connection, error: connError } = await supabase
      .from('pennylane_connections')
      .select('*')
      .eq('firm_id', auth.firmId)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: 'Connexion Pennylane non configurée' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await supabase
      .from('pennylane_connections')
      .update({ sync_status: 'syncing', sync_error_message: null })
      .eq('id', connection.id);

    const accessToken = await decryptToken(supabase, connection.access_token_encrypted);
    const refreshToken = await decryptToken(supabase, connection.refresh_token_encrypted);

    const client = new PennylaneClient({
      accessToken,
      refreshToken,
      tokenExpiresAt: new Date(connection.token_expires_at),
      clientId: Deno.env.get('PENNYLANE_CLIENT_ID')!,
      clientSecret: Deno.env.get('PENNYLANE_CLIENT_SECRET')!,
      onTokenRefreshed: async (newAccess, newRefresh, expiresAt) => {
        const encAccess = await encryptToken(supabase, newAccess);
        const encRefresh = await encryptToken(supabase, newRefresh);
        await supabase
          .from('pennylane_connections')
          .update({
            access_token_encrypted: encAccess,
            refresh_token_encrypted: encRefresh,
            token_expires_at: expiresAt.toISOString(),
          })
          .eq('id', connection.id);
      },
    });

    const { data: companies } = await supabase
      .from('companies')
      .select('id, pennylane_company_id')
      .eq('firm_id', auth.firmId)
      .not('pennylane_company_id', 'is', null);

    let totalSynced = 0;
    const startTime = Date.now();

    for (const company of companies ?? []) {
      if (!company.pennylane_company_id) continue;

      const sinceDate = connection.last_sync_at
        ? connection.last_sync_at.split('T')[0]
        : new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // REQUIREMENT: Utiliser l'endpoint bank_transactions (pas journal_entries)
      const bankTransactions = await client.getBankTransactions(company.pennylane_company_id, sinceDate);

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
    }

    const durationMs = Date.now() - startTime;

    await supabase
      .from('pennylane_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: 'success',
        sync_error_message: null,
      })
      .eq('id', connection.id);

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
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const auth = await verifyAuth(req);
        await supabase
          .from('pennylane_connections')
          .update({ sync_status: 'error', sync_error_message: error.message })
          .eq('firm_id', auth.firmId);
      } catch {
        // Silently fail
      }

      return new Response(JSON.stringify({ error: 'Erreur de synchronisation Pennylane' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
