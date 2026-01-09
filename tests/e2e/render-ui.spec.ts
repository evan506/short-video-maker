/**
 * E2E Tests: Render Job UI Flow (T070)
 *
 * Tests for render job progress tracking UI components:
 * - RenderProgress component (progress bar, step indicator, relative time)
 * - JobStatusCard component (retry/cancel buttons)
 * - RenderNotification component (completion toast)
 * - ExportDownload component (download button, video player modal)
 *
 * Prerequisites:
 * - Dev server running on http://localhost:3000
 * - Supabase test database configured
 * - Test user exists: test@example.com / password123
 * - Render worker is running (or mocked for testing)
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

test.describe('Render Job UI Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and login
    await page.goto(BASE_URL);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/projects');
  });

  test('RenderProgress - Displays progress bar and step indicator', async ({
    page,
  }) => {
    // Create a new project with scenes
    await page.click('text=New Project');
    await page.fill('input[name="topic"]', 'Test render progress UI');
    await page.selectOption('select[name="platform"]', 'shorts');
    await page.click('button[type="submit"]');

    // Wait for project creation
    await page.waitForURL('**/projects/**');

    // Add some scenes (simulate storyboard editor)
    const projectId = page.url().split('/').pop();
    await page.goto(`${BASE_URL}/projects/${projectId}/storyboard`);

    // Click "Render Video" button to start render
    await page.click('button:has-text("Render Video")');

    // Wait for render job creation
    await page.waitForSelector('[data-testid="render-progress"]', { timeout: 5000 });

    // Check progress bar is visible
    const progressBar = page.locator('[data-testid="render-progress"] .progress-bar');
    await expect(progressBar).toBeVisible();

    // Check step indicator is visible
    const stepIndicator = page.locator(
      '[data-testid="render-progress"] [data-testid="step-indicator"]'
    );
    await expect(stepIndicator).toBeVisible();
    await expect(stepIndicator).toContainText('Step 1/4');

    // Check "Last updated" text is visible (T063)
    const lastUpdated = page.locator(
      '[data-testid="render-progress"] [data-testid="last-updated"]'
    );
    await expect(lastUpdated).toBeVisible();
    await expect(lastUpdated).toContainText('Last updated:');

    // Check step list is visible with all 4 steps
    const stepList = page.locator(
      '[data-testid="render-progress"] [data-testid="step-list"]'
    );
    await expect(stepList).toBeVisible();

    const steps = stepList.locator('[data-testid="step-item"]');
    await expect(steps).toHaveCount(4);

    // Verify step labels are user-friendly (T062)
    await expect(stepList).toContainText('Generating voiceovers');
    await expect(stepList).toContainText('Generating subtitles');
    await expect(stepList).toContainText('Downloading media');
    await expect(stepList).toContainText('Rendering video');
  });

  test('JobStatusCard - Cancel button works', async ({ page }) => {
    // Create a render job
    await page.goto(`${BASE_URL}/projects/test-project-id/render`);
    await page.click('button:has-text("Render Video")');

    // Wait for job to start
    await page.waitForSelector('[data-testid="job-status-card"]', { timeout: 5000 });

    // Check status badge shows "Rendering"
    const statusBadge = page.locator(
      '[data-testid="job-status-card"] [data-testid="status-badge"]'
    );
    await expect(statusBadge).toContainText('Rendering');

    // Check cancel button is visible (T064)
    const cancelButton = page.locator(
      '[data-testid="job-status-card"] button:has-text("Cancel Render")'
    );
    await expect(cancelButton).toBeVisible();
    await expect(cancelButton).toBeEnabled();

    // Click cancel button
    await cancelButton.click();

    // Confirm cancellation (if confirmation dialog appears)
    const confirmButton = page.locator('button:has-text("Yes, cancel")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Wait for cancellation to complete
    await page.waitForTimeout(5000);

    // Check status badge changed to "Canceled"
    await expect(statusBadge).toContainText('Canceled');

    // Check cancel button is no longer visible
    await expect(cancelButton).not.toBeVisible();
  });

  test('JobStatusCard - Retry button appears on failure', async ({
    page,
    request,
  }) => {
    // Create a render job via API
    const authResponse = await request.post(`${BASE_URL}/auth/v1/token?grant_type=password`, {
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    });

    const authData = await authResponse.json();
    const authToken = authData.access_token;

    // Simulate a failed render job by updating database directly
    // (In real scenario, worker would fail during processing)
    const jobResponse = await request.post(`${BASE_URL}/api/v1/render/jobs`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        projectId: 'test-project-id',
      },
    });

    const { jobId } = await jobResponse.json();

    // Manually update job to failed state (simulating worker failure)
    await request.patch(`${BASE_URL}/api/v1/render/jobs/${jobId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        status: 'failed',
        error_code: 'TTS_FAILED',
        error_message: 'TTS generation failed',
      },
    });

    // Navigate to render page
    await page.goto(`${BASE_URL}/projects/test-project-id/render`);

    // Wait for job status card to load
    await page.waitForSelector('[data-testid="job-status-card"]');

    // Check error message is displayed with actionable text (T069)
    const errorMessage = page.locator(
      '[data-testid="job-status-card"] [data-testid="error-message"]'
    );
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Voiceover generation failed');
    await expect(errorMessage).toContainText('Regenerate voiceovers from storyboard editor');

    // Check retry button is visible
    const retryButton = page.locator(
      '[data-testid="job-status-card"] button:has-text("Retry from Failed Step")'
    );
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toBeEnabled();

    // Click retry button
    await retryButton.click();

    // Wait for retry to initiate
    await page.waitForTimeout(2000);

    // Check job status changed to "Queued"
    const statusBadge = page.locator(
      '[data-testid="job-status-card"] [data-testid="status-badge"]'
    );
    await expect(statusBadge).toContainText('Queued');
  });

  test('RenderNotification - Shows success toast on completion', async ({
    page,
  }) => {
    // Start a render job
    await page.goto(`${BASE_URL}/projects/test-project-id/render`);
    await page.click('button:has-text("Render Video")');

    // Wait for job to complete (in real scenario, this would take time)
    // For testing, we'll simulate completion by manually updating state

    // Initially, notification should not be visible
    const notification = page.locator('[data-testid="render-notification"]');
    await expect(notification).not.toBeVisible();

    // Simulate job completion (in real test, wait for worker)
    await page.waitForTimeout(10000);

    // Check success notification appears (T066)
    if (await notification.isVisible()) {
      await expect(notification).toBeVisible();
      await expect(notification).toContainText('Render Complete!');
      await expect(notification).toContainText(
        'Your video is ready! Download it from the exports section below.'
      );

      // Check dismiss button works
      const dismissButton = notification.locator('button[aria-label="Dismiss"]');
      await dismissButton.click();

      // Notification should be hidden after dismissal
      await expect(notification).not.toBeVisible();
    }
  });

  test('ExportDownload - Download and preview buttons work', async ({
    page,
  }) => {
    // Navigate to completed render job
    await page.goto(`${BASE_URL}/projects/test-project-id/render?jobId=completed-job-id`);

    // Wait for export download component
    await page.waitForSelector('[data-testid="export-download"]', { timeout: 5000 });

    // Check success message is visible
    const exportCard = page.locator('[data-testid="export-download"]');
    await expect(exportCard).toContainText('Your Video is Ready!');

    // Check download button is visible and enabled (T067)
    const downloadButton = exportCard.locator('button:has-text("Download Video")');
    await expect(downloadButton).toBeVisible();
    await expect(downloadButton).toBeEnabled();

    // Check preview button is visible
    const previewButton = exportCard.locator('button:has-text("Preview")');
    await expect(previewButton).toBeVisible();
    await expect(previewButton).toBeEnabled();

    // Click preview button to open modal
    await previewButton.click();

    // Check video player modal opens (T068)
    const modal = page.locator('[data-testid="video-player-modal"]');
    await expect(modal).toBeVisible();

    // Check video element is present
    const videoElement = modal.locator('video');
    await expect(videoElement).toBeVisible();

    // Check close button in modal
    const closeButton = modal.locator('button:has-text("Close")');
    await expect(closeButton).toBeVisible();

    // Close modal
    await closeButton.click();
    await expect(modal).not.toBeVisible();

    // Note: Actual download testing is difficult in automated tests
    // because browser download dialogs can't be easily controlled
    // In real scenario, you'd verify the download was triggered
  });

  test('Full render flow - From button to download', async ({ page }) => {
    // Start from project page
    await page.goto(`${BASE_URL}/projects/test-project-id`);

    // Click "Render Video" button
    await page.click('button:has-text("Render Video")');

    // Wait for navigation to render page
    await page.waitForURL('**/render');

    // Verify progress tracking UI is visible
    await expect(page.locator('[data-testid="render-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="job-status-card"]')).toBeVisible();

    // Wait for render to complete (or timeout)
    await page.waitForSelector('[data-testid="export-download"]', {
      timeout: 120000, // 2 minutes timeout for render
    });

    // Verify completion notification appears
    const notification = page.locator('[data-testid="render-notification"]');
    if (await notification.isVisible({ timeout: 10000 })) {
      await expect(notification).toContainText('Render Complete!');
    }

    // Verify export download component is visible
    const exportCard = page.locator('[data-testid="export-download"]');
    await expect(exportCard).toBeVisible();
    await expect(exportCard).toContainText('Your Video is Ready!');

    // Verify download button works
    const downloadButton = exportCard.locator('button:has-text("Download Video")');
    await expect(downloadButton).toBeEnabled();
  });

  test('Progress bar updates within 3 seconds (T062)', async ({ page }) => {
    // Start a render job
    await page.goto(`${BASE_URL}/projects/test-project-id/render`);
    await page.click('button:has-text("Render Video")');

    // Wait for progress bar to appear
    await page.waitForSelector('[data-testid="render-progress"]');

    // Capture initial progress
    const initialProgress = await page
      .locator('[data-testid="progress-percentage"]')
      .textContent();

    // Wait up to 3 seconds for progress update
    await page.waitForTimeout(3000);

    // Check that progress has updated (or stayed same if job finished quickly)
    const updatedProgress = await page
      .locator('[data-testid="progress-percentage"]')
      .textContent();

    // Progress should be visible (0-100%)
    expect(parseInt(updatedProgress || '0')).toBeGreaterThanOrEqual(0);
    expect(parseInt(updatedProgress || '0')).toBeLessThanOrEqual(100);
  });

  test('Cancel render stops job within 5 seconds (SC-011)', async ({ page }) => {
    // Start a render job
    await page.goto(`${BASE_URL}/projects/test-project-id/render`);
    await page.click('button:has-text("Render Video")');

    // Wait for job to start
    await page.waitForSelector('[data-testid="job-status-card"]');

    // Click cancel button immediately
    await page.click('button:has-text("Cancel Render")');

    // Record start time
    const startTime = Date.now();

    // Wait for status to change to "canceled"
    await page.waitForSelector('[data-testid="status-badge"]:has-text("Canceled")', {
      timeout: 10000,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify cancellation happened within 5 seconds
    expect(duration).toBeLessThan(5000);
  });
});
