/**
 * E2E Test: Happy Path Workflow
 *
 * Tests the complete user journey:
 * 1. Create Project
 * 2. Generate Script
 * 3. Quick Edit (Shorten)
 * 4. Generate Scenes
 * 5. Edit Scene Duration
 * 6. Verify Persistence (reload and verify all data)
 *
 * Prerequisites:
 * - Dev server running on http://localhost:5173
 * - Supabase test database configured
 * - Test user credentials in .env.test
 */

import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const TEST_TIMEOUT = 60000; // 60 seconds

test.describe('Happy Path Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto(BASE_URL);
  });

  test('complete workflow: create project → generate script → edit → generate scenes → verify persistence', async ({ page }) => {
    // Step 1: Create Project
    await test.step('Create new project', async () => {
      // Click "New Project" button
      await page.click('button:has-text("New Project")');

      // Fill out project form
      await page.fill('label:has-text("Topic")', 'Create a short video about the benefits of meditation for stress relief');
      await page.selectOption('label:has-text("Platform")', 'shorts');
      await page.selectOption('label:has-text("Video Type")', 'Explainer');
      await page.selectOption('label:has-text("Target Duration")', '60');

      // Submit form
      await page.click('button:has-text("Create Project")');

      // Verify redirect to editor page
      await expect(page).toHaveURL(/\/editor\/[a-f0-9-]+/);

      // Verify project metadata is displayed
      await expect(page.locator('h4:has-text("Create a short video about")')).toBeVisible();
    });

    // Extract project ID from URL
    const url = page.url();
    const projectId = url.split('/').pop();
    console.log(`Project ID: ${projectId}`);

    // Step 2: Generate Script
    await test.step('Generate script', async () => {
      // Wait for Script tab to be active
      await expect(page.locator('button[role="tab"]:has-text("Script")')).toBeVisible();

      // Click "Generate Script" button
      await page.click('button:has-text("Generate Script")');

      // Wait for generation to complete (loading spinner disappears)
      await expect(page.locator('text=Generating script...')).not.toBeVisible({ timeout: 30000 });

      // Verify script content is displayed
      await expect(page.locator('textarea[name="scriptContent"]')).not.toBeEmpty();
    });

    // Step 3: Quick Edit Script (Shorten)
    await test.step('Quick edit script: Shorten', async () => {
      // Click "Shorten" quick edit button
      await page.click('button:has-text("Shorten")');

      // Wait for preview generation
      await expect(page.locator('text=Generating preview...')).not.toBeVisible({ timeout: 15000 });

      // Verify preview is displayed
      await expect(page.locator('text=Preview')).toBeVisible();

      // Click "Apply Changes"
      await page.click('button:has-text("Apply Changes")');

      // Wait for new version to be created
      await expect(page.locator('text=Script updated successfully')).toBeVisible({ timeout: 10000 });
    });

    // Step 4: Generate Scenes
    await test.step('Generate scenes from script', async () => {
      // Navigate to Storyboard tab
      await page.click('button[role="tab"]:has-text("Storyboard")');

      // Wait for scenes to be generated automatically (one-time generation)
      await expect(page.locator('text=Generating scenes from script...')).not.toBeVisible({ timeout: 30000 });

      // Verify at least one scene is displayed
      const scenes = page.locator('[data-testid="scene-card"]');
      await expect(scenes.first()).toBeVisible({ timeout: 10000 });
    });

    // Step 5: Edit Scene Duration
    await test.step('Edit scene duration', async () => {
      // Click on the first scene card to open edit dialog
      const firstScene = page.locator('[data-testid="scene-card"]').first();
      await firstScene.click();

      // Verify edit dialog opens
      await expect(page.locator('h2:has-text("Edit Scene")')).toBeVisible();

      // Change duration from default to 7 seconds
      await page.fill('input[label="Duration (seconds)"]', '7');

      // Click "Save"
      await page.click('button:has-text("Save")');

      // Wait for save confirmation
      await expect(page.locator('text=Scene saved successfully')).toBeVisible({ timeout: 5000 });
    });

    // Step 6: Verify Persistence
    await test.step('Verify data persistence after reload', async () => {
      // Reload the page
      await page.reload();

      // Wait for page to load
      await expect(page.locator('h4:has-text("Create a short video about")')).toBeVisible({ timeout: 10000 });

      // Navigate to Storyboard tab
      await page.click('button[role="tab"]:has-text("Storyboard")');

      // Verify scenes are still present
      const scenes = page.locator('[data-testid="scene-card"]');
      await expect(scenes.first()).toBeVisible({ timeout: 10000 });

      // Click first scene to verify duration change persisted
      await scenes.first().click();
      await expect(page.locator('h2:has-text("Edit Scene")')).toBeVisible();

      // Verify duration is 7 seconds
      const durationInput = page.locator('input[label="Duration (seconds)"]');
      await expect(durationInput).toHaveValue('7');

      // Close dialog
      await page.click('button:has-text("Cancel")');
    });

    // Step 7: Navigate back to dashboard
    await test.step('Return to dashboard and verify project appears', async () => {
      await page.goto(`${BASE_URL}/dashboard`);

      // Verify project appears in list
      await expect(page.locator('text=Create a short video about')).toBeVisible({ timeout: 10000 });

      // Verify status is "Draft"
      await expect(page.locator('text=Draft')).toBeVisible();
    });
  });

  test('quick-edit flow: generate script → shorten → apply → verify version created', async ({ page }) => {
    // Create a project first
    await page.goto(`${BASE_URL}/editor/new`);
    await page.fill('label:has-text("Topic")', 'Test quick edit functionality with this topic');
    await page.selectOption('label:has-text("Platform")', 'tiktok');
    await page.selectOption('label:has-text("Video Type")', 'Marketing');
    await page.selectOption('label:has-text("Target Duration")', '30');
    await page.click('button:has-text("Create Project")');

    // Wait for editor to load
    await expect(page).toHaveURL(/\/editor\/[a-f0-9-]+/);

    // Generate script
    await page.click('button:has-text("Generate Script")');
    await expect(page.locator('text=Generating script...')).not.toBeVisible({ timeout: 30000 });

    // Get initial script content
    const initialContent = await page.locator('textarea[name="scriptContent"]').inputValue();

    // Click Shorten
    await page.click('button:has-text("Shorten")');
    await expect(page.locator('text=Generating preview...')).not.toBeVisible({ timeout: 15000 });

    // Verify preview is different from original
    const previewContent = await page.locator('textarea[name="scriptContent"]').inputValue();
    expect(previewContent).not.toBe(initialContent);
    expect(previewContent.length).toBeLessThan(initialContent.length);

    // Apply changes
    await page.click('button:has-text("Apply Changes")');
    await expect(page.locator('text=Script updated successfully')).toBeVisible({ timeout: 10000 });

    // Verify new version was created (version number should increment)
    // This requires checking version display or API response
    await expect(page.locator('text=Version 2')).toBeVisible();
  });

  test('scene reordering: drag scene to new position → reload → verify order persists', async ({ page }) => {
    // Create project and generate scenes first
    await page.goto(`${BASE_URL}/editor/new`);
    await page.fill('label:has-text("Topic")', 'Test scene reordering with multiple scenes about AI technology');
    await page.selectOption('label:has-text("Platform")', 'reels');
    await page.selectOption('label:has-text("Video Type")', 'Tutorial');
    await page.selectOption('label:has-text("Target Duration")', '60');
    await page.click('button:has-text("Create Project")');

    await expect(page).toHaveURL(/\/editor\/[a-f0-9-]+/);

    // Generate script
    await page.click('button:has-text("Generate Script")');
    await expect(page.locator('text=Generating script...')).not.toBeVisible({ timeout: 30000 });

    // Generate scenes
    await page.click('button[role="tab"]:has-text("Storyboard")');
    await expect(page.locator('text=Generating scenes from script...')).not.toBeVisible({ timeout: 30000 });

    // Get initial scene order
    const scenesBefore = await page.locator('[data-testid="scene-card"]').allTextContents();

    // Drag scene 3 to position 1 (using native HTML5 drag and drop)
    const scene3 = page.locator('[data-testid="scene-card"]').nth(2);
    const scene1 = page.locator('[data-testid="scene-card"]').first();

    await scene3.dragTo(scene1);

    // Reload page
    await page.reload();

    // Navigate to Storyboard tab
    await page.click('button[role="tab"]:has-text("Storyboard")');

    // Get new scene order
    const scenesAfter = await page.locator('[data-testid="scene-card"]').allTextContents();

    // Verify order changed
    expect(scenesAfter[0]).toBe(scenesBefore[2]);
    expect(scenesAfter[2]).toBe(scenesBefore[0]);
  });
});

test.describe('RLS Policy Verification', () => {
  test('user A cannot access user B projects', async ({ browser }) => {
    // This test would require:
    // 1. Two test user accounts (userA@example.com, userB@example.com)
    // 2. Context isolation between users
    // 3. Verification that SELECT/UPDATE/DELETE operations fail for cross-user access

    // For now, this is a placeholder for manual testing
    test.skip(true, 'RLS testing requires manual test database setup - see WP05 documentation');

    // Implementation would:
    // 1. Login as userA, create project
    // 2. Get project ID
    // 3. Logout, login as userB
    // 4. Try to access userA's project directly via URL
    // 5. Verify access denied (404 or 403)
    // 6. Try API calls with userB's token to userA's project
    // 7. Verify all operations fail
  });
});
