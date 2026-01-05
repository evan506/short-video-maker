/**
 * E2E Test Authentication Setup
 *
 * This file sets up authenticated browser state for E2E tests.
 * It creates a mock session that bypasses Supabase auth for testing.
 */

import { test as setup } from '@playwright/test';

const authFile = 'tests/e2e/auth-storage.json';

setup('authenticate', async ({ page }) => {
  // For testing purposes, we'll use localStorage to mock an authenticated session
  // This works because our Supabase client checks for auth state in localStorage

  await page.goto('http://localhost:3001');

  // Set mock auth state in localStorage
  await page.evaluate(() => {
    const mockSession = {
      access_token: 'mock-test-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Date.now() + 3600000, // 1 hour from now
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        aud: 'authenticated',
        role: 'authenticated',
      },
    };

    // Supabase stores session in localStorage with this key
    localStorage.setItem(
      `sb-${import.meta.env.VITE_SUPABASE_URL?.replace(/https:\/\/|http:\/\/|\/$/g, '') || 'supabase'}-auth-token`,
      JSON.stringify(mockSession)
    );
  });

  // Save storage state to file
  await page.context().storageState({ path: authFile });
});
