-- 003_encryption_functions.sql
-- SECURITY: Helper functions for token encryption/decryption using pgcrypto

CREATE OR REPLACE FUNCTION public.encrypt_token(plaintext TEXT, key TEXT)
RETURNS BYTEA AS $$
  SELECT pgp_sym_encrypt(plaintext, key)
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrypt_token(encrypted_data BYTEA, key TEXT)
RETURNS TEXT AS $$
  SELECT pgp_sym_decrypt(encrypted_data, key)
$$ LANGUAGE sql SECURITY DEFINER;

-- SECURITY: Revoke direct access to encryption functions from public
REVOKE ALL ON FUNCTION public.encrypt_token(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrypt_token(BYTEA, TEXT) FROM PUBLIC;
-- Grant only to service_role (Edge Functions run as service_role)
GRANT EXECUTE ON FUNCTION public.encrypt_token(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_token(BYTEA, TEXT) TO service_role;
