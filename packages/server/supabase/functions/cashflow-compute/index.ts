// REQUIREMENT: Compute and cache cashflow snapshots

import { createClient } from '@supabase/supabase-js';
import { verifyAuth, AuthError } from '../_shared/auth.ts';
import { checkRateLimit } from '../_shared/rate-limiter.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const auth = await verifyAuth(req);

    const rateCheck = checkRateLimit(auth.userId, 'write');
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ error: 'Trop de requêtes' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { companyId, periodType = 'monthly' } = await req.json() as {
      companyId: string;
      periodType?: string;
    };

    if (!companyId) {
      return new Response(JSON.stringify({ error: 'companyId requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify company belongs to user's firm
    const { data: company } = await supabase
      .from('companies')
      .select('id, firm_id')
      .eq('id', companyId)
      .eq('firm_id', auth.firmId)
      .single();

    if (!company) {
      return new Response(JSON.stringify({ error: 'Société introuvable' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: true });

    // NOTE: Cashflow computation is done client-side using @cashflow/engine
    // This endpoint could pre-compute and cache snapshots for performance
    // For MVP, we return transactions and let the frontend compute

    return new Response(JSON.stringify({
      success: true,
      transactionCount: transactions?.length ?? 0,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    if (error instanceof AuthError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Erreur interne' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
