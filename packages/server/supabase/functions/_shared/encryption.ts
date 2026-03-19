// SECURITY: Token encryption/decryption using pgcrypto via Supabase SQL
// Tokens are NEVER stored in plain text

import { createClient } from '@supabase/supabase-js';

// SECURITY: ENCRYPTION_KEY comes from Supabase Edge Function secrets
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

export async function encryptToken(
  supabaseAdmin: ReturnType<typeof createClient>,
  plaintext: string,
): Promise<string> {
  // SECURITY: Use pgcrypto's pgp_sym_encrypt for AES encryption
  const { data, error } = await supabaseAdmin.rpc('encrypt_token', {
    plaintext,
    key: ENCRYPTION_KEY,
  });

  if (error) throw new Error(`Échec du chiffrement: ${error.message}`);
  return data as string;
}

export async function decryptToken(
  supabaseAdmin: ReturnType<typeof createClient>,
  encrypted: string,
): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('decrypt_token', {
    encrypted_data: encrypted,
    key: ENCRYPTION_KEY,
  });

  if (error) throw new Error(`Échec du déchiffrement: ${error.message}`);
  return data as string;
}
