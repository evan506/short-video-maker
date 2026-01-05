/**
 * Supabase Client Configuration
 *
 * Real Supabase client for database operations.
 * Replaces mock implementations used in WP02-WP04.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!supabaseKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable is required');
}

/**
 * Supabase client instance
 *
 * Uses service role key for backend operations (bypasses RLS for admin operations).
 * For user-specific operations, RLS is enforced via user_id checks.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Backend doesn't need session persistence
    autoRefreshToken: false, // Backend doesn't need auto-refresh
  },
  db: {
    schema: 'public',
  },
});

/**
 * Export for testing purposes
 */
export default supabase;
