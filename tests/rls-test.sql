/**
 * RLS Policy Verification Test
 *
 * Manual SQL test to verify Row Level Security policies
 * prevent cross-user data access.
 *
 * Prerequisites:
 * - Supabase test database
 * - Two test users created
 *
 * Usage:
 * 1. Run in Supabase SQL Editor or via psql:
 *    psql -h <db-host> -U postgres -d <db-name> -f tests/rls-test.sql
 *
 * Expected Results:
 * - All queries for userB accessing userA's data should fail
 * - Queries for userA accessing own data should succeed
 */

-- ============================================
-- SETUP: Create Test Users and Data
-- ============================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

-- Note: Users should already exist via Supabase Auth
-- For testing, we use their user IDs from auth.users

-- Set test user IDs (replace with actual IDs from your test database)
\set user_a_id '00000000-0000-0000-0000-000000000001'
\set user_b_id '00000000-0000-0000-0000-000000000002'

-- ============================================
-- TEST 1: User A creates data
-- ============================================

SET LOCAL jwt.claims.sub to :'user_a_id';

-- User A creates a project
INSERT INTO projects (user_id, title, topic, platform, video_type, target_duration, status)
VALUES (:'user_a_id', 'User A Project', 'Test topic for user A', 'shorts', 'Explainer', 60, 'draft')
RETURNING id;

\set user_a_project_id '00000000-0000-0000-0000-000000000001' -- Replace with actual ID above

-- User A creates a script
INSERT INTO scripts (project_id, version, content, source)
VALUES (:'user_a_project_id', 1, 'This is user A''s script content', 'llm');

-- User A creates scenes
INSERT INTO scenes (project_id, order_index, narration_text, duration_sec_draft, primary_keyword, subtitle_style_preset_id)
VALUES
  (:'user_a_project_id', 0, 'Scene 1 for user A', 5, 'keyword1', 1),
  (:'user_a_project_id', 1, 'Scene 2 for user A', 5, 'keyword2', 1);

-- ============================================
-- TEST 2: User B tries to access User A's data
-- ============================================

SET LOCAL jwt.claims.sub to :'user_b_id';

-- TEST 2.1: User B tries to SELECT User A's projects (SHOULD FAIL)
SELECT * FROM projects WHERE id = :'user_a_project_id';
-- Expected: Empty result (RLS blocks access)

-- TEST 2.2: User B tries to UPDATE User A's project (SHOULD FAIL)
UPDATE projects SET title = 'Hacked by User B' WHERE id = :'user_a_project_id';
-- Expected: 0 rows affected

-- TEST 2.3: User B tries to DELETE User A's project (SHOULD FAIL)
DELETE FROM projects WHERE id = :'user_a_project_id';
-- Expected: 0 rows affected

-- TEST 2.4: User B tries to SELECT User A's scripts (SHOULD FAIL)
SELECT * FROM scripts WHERE project_id = :'user_a_project_id';
-- Expected: Empty result

-- TEST 2.5: User B tries to SELECT User A's scenes (SHOULD FAIL)
SELECT * FROM scenes WHERE project_id = :'user_a_project_id';
-- Expected: Empty result

-- ============================================
-- TEST 3: Verify User A's data is intact
-- ============================================

SET LOCAL jwt.claims.sub to :'user_a_id';

-- Verify User A's project still exists
SELECT id, title FROM projects WHERE id = :'user_a_project_id';
-- Expected: Returns User A's project with original title

-- Verify User A's scripts still exist
SELECT COUNT(*) as script_count FROM scripts WHERE project_id = :'user_a_project_id';
-- Expected: Returns 1

-- Verify User A's scenes still exist
SELECT COUNT(*) as scene_count FROM scenes WHERE project_id = :'user_a_project_id';
-- Expected: Returns 2

-- ============================================
-- TEST 4: User B creates their own data
-- ============================================

SET LOCAL jwt.claims.sub to :'user_b_id';

-- User B creates a project
INSERT INTO projects (user_id, title, topic, platform, video_type, target_duration, status)
VALUES (:'user_b_id', 'User B Project', 'Test topic for user B', 'tiktok', 'Marketing', 30, 'draft')
RETURNING id;

\set user_b_project_id '00000000-0000-0000-0000-000000000002' -- Replace with actual ID above

-- User B creates their own scenes
INSERT INTO scenes (project_id, order_index, narration_text, duration_sec_draft, primary_keyword, subtitle_style_preset_id)
VALUES
  (:'user_b_project_id', 0, 'Scene 1 for user B', 5, 'keyword3', 1);

-- ============================================
-- TEST 5: Verify isolation
-- ============================================

-- User A should only see their own data
SET LOCAL jwt.claims.sub to :'user_a_id';
SELECT COUNT(*) as user_a_project_count FROM projects;
-- Expected: Returns 1 (only User A's project)

-- User B should only see their own data
SET LOCAL jwt.claims.sub to :'user_b_id';
SELECT COUNT(*) as user_b_project_count FROM projects;
-- Expected: Returns 1 (only User B's project)

-- Both users in same query (simulating admin view)
SET LOCAL jwt.claims.sub to :'user_a_id';
SELECT id, title, user_id FROM projects;

SET LOCAL jwt.claims.sub to :'user_b_id';
SELECT id, title, user_id FROM projects;

-- ============================================
-- CLEANUP (Optional - for test database)
-- ============================================

-- Uncomment to clean up test data
-- SET LOCAL jwt.claims.sub to :'user_a_id';
-- DELETE FROM scenes WHERE project_id = :'user_a_project_id';
-- DELETE FROM scripts WHERE project_id = :'user_a_project_id';
-- DELETE FROM projects WHERE id = :'user_a_project_id';

-- SET LOCAL jwt.claims.sub to :'user_b_id';
-- DELETE FROM scenes WHERE project_id = :'user_b_project_id';
-- DELETE FROM scripts WHERE project_id = :'user_b_project_id';
-- DELETE FROM projects WHERE id = :'user_b_project_id';

-- ============================================
-- RESULTS SUMMARY
-- ============================================

/*
Expected Test Results:

✅ User B SELECT User A's projects: Empty result (blocked)
✅ User B UPDATE User A's project: 0 rows affected (blocked)
✅ User B DELETE User A's project: 0 rows affected (blocked)
✅ User B SELECT User A's scripts: Empty result (blocked)
✅ User B SELECT User A's scenes: Empty result (blocked)
✅ User A's data remains intact after User B's attempts
✅ User A sees only their own data (1 project)
✅ User B sees only their own data (1 project)
✅ Complete isolation between users

If any test fails:
- Check RLS policies are enabled on all tables
- Verify policy definitions in database schema
- Check user_id matches auth.uid() in policies
*/
