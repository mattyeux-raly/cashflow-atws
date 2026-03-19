-- rls.test.sql
-- SECURITY: RLS policy tests
-- These tests verify multi-tenant isolation

-- Test setup: Create two firms with users
-- NOTE: In practice, run these against a test Supabase instance

-- ===== TEST 1: User of Firm A cannot see Firm B's data =====
-- Expected: User in firm_a sees only firm_a companies
-- SELECT * FROM companies; -- Should only return firm_a companies when logged as firm_a user

-- ===== TEST 2: Viewer cannot modify data =====
-- Expected: INSERT/UPDATE/DELETE denied for viewer role
-- SET LOCAL role TO 'authenticated';
-- SET LOCAL request.jwt.claims TO '{"sub": "viewer-user-id"}';
-- INSERT INTO companies (firm_id, name) VALUES ('firm-b-id', 'Hack attempt'); -- Should fail

-- ===== TEST 3: Admin can see Pennylane connections, member cannot =====
-- Expected: Admin sees connections, member gets empty result
-- As admin: SELECT * FROM pennylane_connections; -- Should return rows
-- As member: SELECT * FROM pennylane_connections; -- Should return empty

-- ===== TEST 4: User can only see own GDPR consents =====
-- Expected: Each user only sees their own consents
-- As user_a: SELECT * FROM gdpr_consents; -- Only user_a's consents
-- As user_b: SELECT * FROM gdpr_consents; -- Only user_b's consents

-- ===== TEST 5: Transactions are isolated via company's firm =====
-- Expected: Cannot see transactions of companies belonging to another firm
-- As firm_a_user: SELECT * FROM transactions; -- Only firm_a company transactions

-- ===== TEST 6: Audit log restricted to admin+ =====
-- Expected: Member/viewer cannot read audit log
-- As member: SELECT * FROM audit_log; -- Should return empty

-- ===== TEST 7: Cashflow snapshots isolated via company =====
-- Expected: Cannot see snapshots for companies in other firms
-- As firm_a_user: SELECT * FROM cashflow_snapshots; -- Only firm_a snapshots

-- NOTE: These tests should be automated using pgTAP or a test framework
-- For now, they serve as documentation of expected RLS behavior
-- Run manually against a test database with:
-- psql -f rls.test.sql
