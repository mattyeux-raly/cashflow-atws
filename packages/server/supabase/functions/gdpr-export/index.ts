// REQUIREMENT: GDPR Article 15 & 20 — Right of access and data portability
// Export all user data in JSON + CSV format

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // REQUIREMENT: Export all data for this user's firm
    const { data: firm } = await supabase
      .from('firms')
      .select('*')
      .eq('id', auth.firmId)
      .single();

    const { data: users } = await supabase
      .from('users')
      .select('id, role, full_name, created_at')
      .eq('firm_id', auth.firmId);

    const { data: companies } = await supabase
      .from('companies')
      .select('*')
      .eq('firm_id', auth.firmId);

    const companyIds = (companies ?? []).map((c) => c.id);

    const { data: transactions } = companyIds.length > 0
      ? await supabase
          .from('transactions')
          .select('*')
          .in('company_id', companyIds)
      : { data: [] };

    const { data: consents } = await supabase
      .from('gdpr_consents')
      .select('*')
      .eq('user_id', auth.userId);

    const exportData = {
      exportDate: new Date().toISOString(),
      exportedBy: auth.userId,
      firm: firm ? { name: firm.name, siret: firm.siret, email: firm.email } : null,
      users: (users ?? []).map((u) => ({
        role: u.role,
        fullName: u.full_name,
        createdAt: u.created_at,
      })),
      companies: (companies ?? []).map((c) => ({
        name: c.name,
        siren: c.siren,
        siret: c.siret,
      })),
      transactions: (transactions ?? []).map((t) => ({
        date: t.date,
        label: t.label,
        amount: t.amount,
        category: t.category,
        cashflowType: t.cashflow_type,
      })),
      consents: consents ?? [],
    };

    // REQUIREMENT: Audit this data access
    await supabase.from('audit_log').insert({
      firm_id: auth.firmId,
      user_id: auth.userId,
      action: 'data_export',
      resource_type: 'gdpr_export',
      details: {
        transactionCount: transactions?.length ?? 0,
        companyCount: companies?.length ?? 0,
      },
    });

    return new Response(JSON.stringify(exportData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="gdpr-export.json"',
      },
    });
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
