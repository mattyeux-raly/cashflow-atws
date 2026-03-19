// SECURITY: JWT verification and user role extraction for Edge Functions

import { createClient } from '@supabase/supabase-js';

export interface AuthContext {
  userId: string;
  firmId: string;
  role: string;
}

export async function verifyAuth(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Token d\'authentification manquant', 401);
  }

  const token = authHeader.slice(7);
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new AuthError('Token invalide ou expiré', 401);
  }

  // Get user's firm and role
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('firm_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new AuthError('Profil utilisateur introuvable', 403);
  }

  return {
    userId: user.id,
    firmId: profile.firm_id,
    role: profile.role,
  };
}

export function requireRole(auth: AuthContext, allowedRoles: string[]): void {
  if (!allowedRoles.includes(auth.role)) {
    throw new AuthError('Permissions insuffisantes', 403);
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
