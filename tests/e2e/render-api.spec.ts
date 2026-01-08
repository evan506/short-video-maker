/**
 * API Integration Tests: Render Job Endpoints
 *
 * Tests for render job lifecycle API endpoints (T020):
 * - POST /api/v1/render/jobs - Create render job
 * - GET /api/v1/render/jobs/:jobId - Get job status
 * - POST /api/v1/render/jobs/:jobId/cancel - Cancel job
 * - POST /api/v1/render/jobs/:jobId/retry - Retry failed job
 *
 * Prerequisites:
 * - Dev server running on http://localhost:3001
 * - Supabase test database configured
 * - Test user exists: test@example.com / password123
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

test.describe('Render API Endpoints', () => {
  let authToken: string;
  let testProjectId: string;

  test.beforeAll(async ({ request }) => {
    // Login and get auth token
    const response = await request.post(`${BASE_URL}/auth/v1/token?grant_type=password`, {
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    });

    if (!response.ok()) {
      throw new Error('Failed to authenticate test user');
    }

    const data = await response.json();
    authToken = data.access_token;

    // Create a test project
    const projectResponse = await request.post(`${BASE_URL}/api/v1/projects`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        topic: 'Test video for render API testing',
        platform: 'shorts',
        video_type: 'Explainer',
        target_duration: 30,
      },
    });

    if (!projectResponse.ok()) {
      throw new Error('Failed to create test project');
    }

    const projectData = await projectResponse.json();
    testProjectId = projectData.id;
  });

  test('POST /api/v1/render/jobs - Create render job', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/v1/render/jobs`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        projectId: testProjectId,
      },
    });

    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data).toHaveProperty('jobId');
    expect(data).toHaveProperty('status', 'queued');
    expect(data).toHaveProperty('currentStep', 'tts_generation');
    expect(data).toHaveProperty('progress', 0);
    expect(data).toHaveProperty('createdAt');
  });

  test('POST /api/v1/render/jobs - Missing projectId returns 400', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/v1/render/jobs`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {},
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toHaveProperty('code', 'INVALID_REQUEST');
    expect(data.error).toHaveProperty('message');
    expect(data.error).toHaveProperty('action');
  });

  test('POST /api/v1/render/jobs - Invalid projectId returns 403', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/v1/render/jobs`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        projectId: '00000000-0000-0000-0000-000000000000',
      },
    });

    expect(response.status()).toBe(403);

    const data = await response.json();
    expect(data.error).toHaveProperty('code', 'ACCESS_DENIED');
  });

  test('GET /api/v1/render/jobs/:jobId - Get job status', async ({ request }) => {
    // First create a job
    const createResponse = await request.post(`${BASE_URL}/api/v1/render/jobs`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        projectId: testProjectId,
      },
    });

    const { jobId } = await createResponse.json();

    // Now fetch the job status
    const response = await request.get(`${BASE_URL}/api/v1/render/jobs/${jobId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('jobId', jobId);
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('progress');
    expect(data).toHaveProperty('jobSteps');
    expect(Array.isArray(data.jobSteps)).toBe(true);
    expect(data.jobSteps).toHaveLength(4);
    expect(data).toHaveProperty('updatedAt');
  });

  test('GET /api/v1/render/jobs/:jobId - Invalid jobId returns 404', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/v1/render/jobs/00000000-0000-0000-0000-000000000000`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toHaveProperty('code', 'JOB_NOT_FOUND');
  });

  test('POST /api/v1/render/jobs/:jobId/cancel - Cancel queued job', async ({ request }) => {
    // First create a job
    const createResponse = await request.post(`${BASE_URL}/api/v1/render/jobs`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        projectId: testProjectId,
      },
    });

    const { jobId } = await createResponse.json();

    // Now cancel the job
    const response = await request.post(
      `${BASE_URL}/api/v1/render/jobs/${jobId}/cancel`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('jobId', jobId);
    expect(data).toHaveProperty('status', 'canceled');
  });

  test('POST /api/v1/render/jobs/:jobId/cancel - Non-existent job returns 404', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/v1/render/jobs/00000000-0000-0000-0000-000000000000/cancel`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    expect(response.status()).toBe(404);
  });

  test('POST /api/v1/render/jobs/:jobId/retry - Only failed jobs can be retried', async ({
    request,
  }) => {
    // First create a job
    const createResponse = await request.post(`${BASE_URL}/api/v1/render/jobs`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        projectId: testProjectId,
      },
    });

    const { jobId } = await createResponse.json();

    // Try to retry a queued job (should fail)
    const response = await request.post(
      `${BASE_URL}/api/v1/render/jobs/${jobId}/retry`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toHaveProperty('code', 'RETRY_NOT_ALLOWED');
  });

  test('GET /api/v1/render/jobs/:jobId - Progress calculation', async ({ request }) => {
    // Create a job
    const createResponse = await request.post(`${BASE_URL}/api/v1/render/jobs`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        projectId: testProjectId,
      },
    });

    const { jobId } = await createResponse.json();

    // Fetch job status
    const response = await request.get(`${BASE_URL}/api/v1/render/jobs/${jobId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    // All steps should be pending initially (0% progress)
    expect(data.progress).toBe(0);

    // Verify all 4 steps exist with correct names
    expect(data.jobSteps.map((s: any) => s.step_name)).toEqual([
      'tts_generation',
      'subtitle_generation',
      'media_fetch',
      'render_composite',
    ]);
  });
});
