/**
 * E2E Tests: Video Media Search & Selection
 *
 * End-to-end tests for the complete media search workflow:
 * - Automatic search on scene creation
 * - Video selection and persistence
 * - Batch search functionality
 * - Real-time updates
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Helper: Login and navigate to storyboard editor
 */
async function setupStoryboardPage(page: Page) {
  // Navigate to app
  await page.goto('/');

  // Login (assuming auth exists)
  // await page.fill('[name="email"]', 'test@example.com');
  // await page.fill('[name="password"]', 'password');
  // await page.click('button[type="submit"]');

  // Wait for main editor to load
  await page.waitForSelector('[data-testid="storyboard-editor"]', { timeout: 5000 });
}

/**
 * Helper: Create a test project with scenes
 */
async function createTestProject(page: Page, sceneCount: number = 5) {
  // Click "New Project" button
  await page.click('button:has-text("New Project")');

  // Fill project details
  await page.fill('[name="projectName"]', 'E2E Test Project');
  await page.fill('[name="topic"]', 'Cooking steak');
  await page.fill('[name="style"]', 'Tutorial');

  // Submit and generate scenes
  await page.click('button:has-text("Generate Scenes")');

  // Wait for scene generation
  await page.waitForSelector('[data-testid="scene-card"]', { timeout: 15000 });

  // Verify scenes were created
  const sceneCards = await page.locator('[data-testid="scene-card"]').count();
  expect(sceneCards).toBeGreaterThanOrEqual(sceneCount);
}

/**
 * Test 1: Automatic media search triggers on scene creation
 */
test('T045: Automatic search triggers on scene creation', async ({ page }) => {
  await setupStoryboardPage(page);
  await createTestProject(page, 3);

  // Wait for automatic search to trigger
  await page.waitForSelector('[data-testid="scene-card"]', { timeout: 10000 });

  // Check first scene for loading state
  const firstScene = page.locator('[data-testid="scene-card"]').first();

  // Should show "Searching for media..." initially
  await expect(firstScene.locator('text=/searching for media/i')).toBeVisible({ timeout: 5000 });

  // Wait for search to complete (up to 30 seconds)
  await page.waitForTimeout(30000);

  // Should show video options found or no results
  const statusText = await firstScene.textContent();
  expect(statusText).toMatch(/video options found|no videos found/i);
});

/**
 * Test 2: Video selection flow
 */
test('T046: Video selection persists across refresh', async ({ page }) => {
  await setupStoryboardPage(page);
  await createTestProject(page, 1);

  const sceneCard = page.locator('[data-testid="scene-card"]').first();

  // Wait for media search to complete
  await page.waitForSelector('text=/video options found/i', { timeout: 30000 });
  await page.waitForTimeout(2000); // Extra buffer for Pexels API

  // Find video thumbnails
  const thumbnails = sceneCard.locator('[role="button"][aria-label^="Video option"]');
  const thumbnailCount = await thumbnails.count();

  expect(thumbnailCount).toBeGreaterThan(0);

  // Click first thumbnail to open preview modal
  await thumbnails.first().click();

  // Wait for modal to open
  await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

  // Click "Select this video" button
  await page.click('button:has-text("Select this video")');

  // Wait for selection to complete
  await page.waitForTimeout(1000);

  // Verify green border appears on thumbnail
  await expect(thumbnails.first()).toHaveAttribute('class', /selected/);

  // Refresh page
  await page.reload();

  // Wait for page to load
  await page.waitForSelector('[data-testid="scene-card"]', { timeout: 5000 });

  // Verify selection persists (green border still visible)
  const refreshedScene = page.locator('[data-testid="scene-card"]').first();
  const refreshedThumbnails = refreshedScene.locator('[role="button"][aria-label^="Video option"]');

  await expect(refreshedThumbnails.first()).toHaveAttribute('class', /selected/);
});

/**
 * Test 3: Batch search functionality
 */
test('T047: Batch search works for multiple scenes', async ({ page }) => {
  await setupStoryboardPage(page);
  await createTestProject(page, 10);

  // Wait for scene creation
  await page.waitForSelector('[data-testid="scene-card"]', { timeout: 15000 });

  // Find batch search button
  const batchSearchButton = page.locator('button:has-text("Search All Scenes")');
  await expect(batchSearchButton).toBeVisible();

  // Click batch search button
  await batchSearchButton.click();

  // Verify progress indicator appears
  await expect(page.locator('text=/searching scenes/i')).toBeVisible({ timeout: 3000 });

  // Verify linear progress bar appears
  const progressBar = page.locator('[role="progressbar"]');
  await expect(progressBar).toBeVisible();

  // Wait for batch search to complete (10 scenes * 1 second = ~10 seconds + buffer)
  await page.waitForTimeout(15000);

  // Verify completion message
  await expect(page.locator('text=/scenes searched successfully/i')).toBeVisible({ timeout: 5000 });

  // Verify all scene cards have media options
  const sceneCards = page.locator('[data-testid="scene-card"]');
  const cardCount = await sceneCards.count();

  let cardsWithMedia = 0;
  for (let i = 0; i < cardCount; i++) {
    const card = sceneCards.nth(i);
    const hasMedia = await card.locator('text=/video options found/i').count() > 0;
    if (hasMedia) cardsWithMedia++;
  }

  expect(cardsWithMedia).toBeGreaterThan(0);
});

/**
 * Test 4: Batch search rate limiting
 */
test('T047: Batch search respects rate limiting', async ({ page }) => {
  await setupStoryboardPage(page);
  await createTestProject(page, 5);

  // Wait for scene creation
  await page.waitForSelector('[data-testid="scene-card"]', { timeout: 15000 });

  // Start batch search
  const batchSearchButton = page.locator('button:has-text("Search All Scenes")');
  await batchSearchButton.click();

  // Track progress over time
  const startTime = Date.now();
  let progressUpdates = 0;

  // Monitor progress every 500ms
  while (progressUpdates < 3) {
    await page.waitForTimeout(500);

    const progressText = await page.locator('text=/searching scenes/i').textContent();
    const match = progressText?.match(/(\d+)\/(\d+)/);

    if (match) {
      const current = parseInt(match[1]);
      if (current > progressUpdates) {
        progressUpdates = current;
        const elapsed = Date.now() - startTime;
        const expectedMinTime = progressUpdates * 1000; // 1 second per scene

        console.log(`Progress: ${progressUpdates}/5, Elapsed: ${elapsed}ms, Expected min: ${expectedMinTime}ms`);

        // Verify rate limiting (should take at least 1 second per scene)
        expect(elapsed).toBeGreaterThanOrEqual(expectedMinTime - 500); // -500ms for tolerance
      }
    }
  }
});

/**
 * Test 5: Refresh functionality with rate limit
 */
test('T047: Individual refresh button has rate limit', async ({ page }) => {
  await setupStoryboardPage(page);
  await createTestProject(page, 1);

  const sceneCard = page.locator('[data-testid="scene-card"]').first();

  // Wait for initial search
  await page.waitForSelector('text=/video options found/i', { timeout: 30000 });
  await page.waitForTimeout(2000);

  // Find refresh button
  const refreshButton = sceneCard.locator('button:has-text("Refresh")');
  await expect(refreshButton).toBeVisible();

  // Click refresh
  await refreshButton.click();

  // Verify button becomes disabled immediately
  await expect(refreshButton).toBeDisabled();

  // Try clicking again immediately (should be blocked)
  await refreshButton.click(); // This click should be ignored

  // Wait a bit
  await page.waitForTimeout(2000);

  // Verify button still disabled (rate limit active)
  await expect(refreshButton).toBeDisabled();

  // Verify rate limit message appears
  await expect(sceneCard.locator('text=/please wait.*seconds before refreshing/i')).toBeVisible();
});

/**
 * Test 6: Batch search error handling
 */
test('T047: Batch search handles partial failures gracefully', async ({ page }) => {
  await setupStoryboardPage(page);
  await createTestProject(page, 5);

  // Wait for scene creation
  await page.waitForSelector('[data-testid="scene-card"]', { timeout: 15000 });

  // Mock API failure for some scenes (via network interception)
  await page.route('**/api/v1/media/search', (route) => {
    const url = route.request().url();
    const sceneId = url.match(/sceneId=([^&]+)/)?.[1];

    // Fail every second scene
    if (sceneId && parseInt(sceneId.slice(-1)) % 2 === 0) {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Internal server error' } })
      });
    } else {
      route.continue();
    }
  });

  // Start batch search
  const batchSearchButton = page.locator('button:has-text("Search All Scenes")');
  await batchSearchButton.click();

  // Wait for completion
  await page.waitForTimeout(10000);

  // Verify error message appears
  await expect(page.locator('text=/failed to search/i')).toBeVisible({ timeout: 5000 });

  // Verify "Retry Failed" button appears
  await expect(page.locator('button:has-text("Retry Failed")')).toBeVisible();

  // Verify individual error cards are shown
  await expect(page.locator('text=/scene.*failed/i')).toBeVisible();
});

/**
 * Test 7: Real-time updates across multiple clients
 */
test('Real-time: Selection updates in second window', async ({ browser }) => {
  // Create two contexts (simulating two browser windows)
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  try {
    // Setup both pages
    await setupStoryboardPage(page1);
    await createTestProject(page1, 1);

    await setupStoryboardPage(page2);
    await page2.goto(page1.url()); // Navigate to same project

    // Wait for media search on both pages
    await page1.waitForSelector('text=/video options found/i', { timeout: 30000 });
    await page2.waitForSelector('text=/video options found/i', { timeout: 30000 });

    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);

    // Select video on page1
    const thumbnail1 = page1.locator('[role="button"][aria-label^="Video option"]').first();
    await thumbnail1.click();
    await page1.click('button:has-text("Select this video")');
    await page1.waitForTimeout(1000);

    // Verify selection appears on page2 (real-time update)
    const thumbnail2 = page2.locator('[role="button"][aria-label^="Video option"]').first();
    await expect(thumbnail2).toHaveAttribute('class', /selected/, { timeout: 3000 });

  } finally {
    await context1.close();
    await context2.close();
  }
});

/**
 * Test 8: Keyboard navigation
 */
test('T044: Keyboard navigation works through media options', async ({ page }) => {
  await setupStoryboardPage(page);
  await createTestProject(page, 1);

  // Wait for media search
  await page.waitForSelector('text=/video options found/i', { timeout: 30000 });
  await page.waitForTimeout(2000);

  const sceneCard = page.locator('[data-testid="scene-card"]').first();

  // Tab to first thumbnail
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab'); // Keep tabbing until we reach thumbnail

  // Verify thumbnail is focused
  const firstThumbnail = page.locator('[role="button"][aria-label^="Video option"]').first();
  await expect(firstThumbnail).toBeFocused();

  // Press Enter to open preview
  await page.keyboard.press('Enter');

  // Verify modal opens
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });

  // Press Escape to close modal
  await page.keyboard.press('Escape');

  // Verify modal closes
  await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 1000 });

  // Use arrow keys to navigate
  await firstThumbnail.focus();
  await page.keyboard.press('ArrowRight');

  // Second thumbnail should be focused
  const secondThumbnail = page.locator('[role="button"][aria-label^="Video option"]').nth(1);
  await expect(secondThumbnail).toBeFocused();
});

/**
 * Test 9: Animations are smooth (visual regression test)
 */
test('T041: Animations complete without layout shifts', async ({ page }) => {
  await setupStoryboardPage(page);
  await createTestProject(page, 1);

  // Wait for media search
  await page.waitForSelector('text=/video options found/i', { timeout: 30000 });

  const sceneCard = page.locator('[data-testid="scene-card"]').first();

  // Get initial bounding box
  const initialBox = await sceneCard.boundingBox();

  // Hover over thumbnail to trigger preview
  const thumbnail = sceneCard.locator('[role="button"][aria-label^="Video option"]').first();
  await thumbnail.hover();

  // Wait for animation
  await page.waitForTimeout(500);

  // Check for layout shift (bounding box should remain stable)
  const afterHoverBox = await sceneCard.boundingBox();

  expect(initialBox?.y).toBeCloseTo(afterHoverBox?.y || 0, 0);
  expect(initialBox?.height).toBeCloseTo(afterHoverBox?.height || 0, 0);
});

/**
 * Test 10: Accessibility - ARIA labels and roles
 */
test('T043: All media components have proper ARIA labels', async ({ page }) => {
  await setupStoryboardPage(page);
  await createTestProject(page, 1);

  // Wait for media search
  await page.waitForSelector('text=/video options found/i', { timeout: 30000 });

  // Check thumbnails have aria-label
  const thumbnails = page.locator('[role="button"][aria-label^="Video option"]');
  const count = await thumbnails.count();

  expect(count).toBeGreaterThan(0);

  // Check first thumbnail has descriptive aria-label
  const firstLabel = await thumbnails.first().getAttribute('aria-label');
  expect(firstLabel).toMatch(/video option/i);

  // Check modal has proper role when opened
  await thumbnails.first().click();
  await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

  const modal = page.locator('[role="dialog"]');
  await expect(modal).toHaveAttribute('aria-modal', 'true');

  // Check progress bar has aria-label (during batch search)
  const batchButton = page.locator('button:has-text("Search All Scenes")');
  if (await batchButton.isVisible()) {
    await batchButton.click();

    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toHaveAttribute('aria-label', /batch search progress/i);
  }
});
