// REQUIREMENT: Sync transactions from Pennylane to local database
// SECURITY: Admin+ role required, tokens decrypted from pgcrypto

import { createClient } from '@supabase/supabase-js';
import { PennylaneClient, PennylaneApiError } from '../_shared/pennylane-client.ts';
import { decryptToken, encryptToken } from '../_shared/encryption.ts';
import { verifyAuth, requireRole, AuthError } from '../_shared/auth.ts';
import { checkRateLimit } from '../_shared/rate-limiter.ts';

// REQUIREMENT: PCG account → cashflow_type mapping
function categorizePcgAccount(accountNumber: string): string {
  const p2 = accountNumber.slice(0, 2);
  if (accountNumber.startsWith('70') || accountNumber.startsWith('74')) return 'operating_income';
  if (p2 === '60' || p2 === '61' || p2 === '62' || p2 === '63' || p2 === '64' || p2 === '65') return 'operating_expense';
  if (p2 === '66') return 'financing_expense';
  if (p2 === '67') return 'other';
  if (p2 === '68') return 'other';
  if (p2 === '76') return 'financing_income';
  if (p2 === '77') return 'other';
  if (p2 >= '20' && p2 <= '27') return 'investing_expense';
  if (p2 === '16') return 'financing_expense';
  if (accountNumber.startsWith('44') || accountNumber.startsWith('695')) return 'tax';
  return 'other';
}

Deno.serve(async (req: Request) => {
  // SECURITY: Only POST allowed
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // SECURITY: Verify JWT and role
    const auth = await verifyAuth(req);
    requireRole(auth, ['owner', 'admin']);

    // SECURITY: Rate limit sync operations
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

    // Get Pennylane connection for this firm
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

    // Mark sync as in progress
    await supabase
      .from('pennylane_connections')
      .update({ sync_status: 'syncing', sync_error_message: null })
      .eq('id', connection.id);

    // SECURITY: Decrypt tokens
    const accessToken = await decryptToken(supabase, connection.access_token_encrypted);
    const refreshToken = await decryptToken(supabase, connection.refresh_token_encrypted);

    const client = new PennylaneClient({
      accessToken,
      refreshToken,
      tokenExpiresAt: new Date(connection.token_expires_at),
      clientId: Deno.env.get('PENNYLANE_CLIENT_ID')!,
      clientSecret: Deno.env.get('PENNYLANE_CLIENT_SECRET')!,
      onTokenRefreshed: async (newAccess, newRefresh, expiresAt) => {
        // SECURITY: Re-encrypt and store updated tokens
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

    // Get companies for this firm
    const { data: companies } = await supabase
      .from('companies')
      .select('id, pennylane_company_id')
      .eq('firm_id', auth.firmId)
      .not('pennylane_company_id', 'is', null);

    let totalSynced = 0;
    const startTime = Date.now();

    for (const company of companies ?? []) {
      if (!company.pennylane_company_id) continue;

      // Sync since last sync or 3 years ago for first sync
      const sinceDate = connection.last_sync_at
        ? connection.last_sync_at.split('T')[0]
        : new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const transactions = await client.getTransactions(company.pennylane_company_id, sinceDate);

      for (const tx of transactions) {
        const cashflowType = categorizePcgAccount(tx.account_number);

        // REQUIREMENT: Upsert by pennylane_id
        await supabase
          .from('transactions')
          .upsert({
            company_id: company.id,
            pennylane_id: tx.id,
            date: tx.date,
            label: tx.label,
            amount: tx.amount,
            currency: tx.currency,
            category: tx.account_number.slice(0, 3),
            subcategory: tx.account_name,
            cashflow_type: cashflowType,
            bank_account: tx.bank_account_id,
            is_reconciled: tx.is_reconciled,
            pennylane_metadata: {},
            source: 'pennylane',
          }, { onConflict: 'pennylane_id' });

        totalSynced++;
      }
    }

    const durationMs = Date.now() - startTime;

    // Update connection status
    await supabase
      .from('pennylane_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: 'success',
        sync_error_message: null,
      })
      .eq('id', connection.id);

    // REQUIREMENT: Audit log
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
    // SECURITY: Generic error for client, no sensitive details
    if (error instanceof AuthError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (error instanceof PennylaneApiError) {
      // Update connection with error status
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
        // Silently fail — we already have a primary error to return
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
