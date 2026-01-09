/**
 * Integration Tests: Render Job Flow (T074)
 *
 * Tests for full render job lifecycle:
 * - Create render job via API
 * - Poll status endpoint
 * - Verify job steps progress
 * - Verify completion and export creation
 * - Test cancellation flow
 * - Test retry flow
 *
 * Prerequisites:
 * - Test database running
 * - Test user authenticated
 * - Supabase client configured
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// Use service role key for integration tests (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

describe('Render Job Flow Integration Tests', () => {
  let testUserId: string;
  let testProjectId: string;
  let authToken: string;

  beforeAll(async () => {
    // Create test user
    const { data: userData, error: userError } = await supabase.auth.signUp({
      email: `test-${Date.now()}@example.com`,
      password: 'testpassword123',
    });

    if (userError || !userData.user) {
      throw new Error(`Failed to create test user: ${userError?.message}`);
    }

    testUserId = userData.user.id;
    authToken = userData.session?.access_token || '';

    // Create test project
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: testUserId,
        topic: 'Integration Test Project',
        platform: 'shorts',
        video_type: 'Explainer',
        target_duration: 30,
        storyboard_script_version: 1,
        voice_id: 'en-US-Neural2-A',
        current_script_version: 1,
      })
      .select()
      .single();

    if (projectError || !projectData) {
      throw new Error(`Failed to create test project: ${projectError?.message}`);
    }

    testProjectId = projectData.id;

    // Create test scenes
    const { error: scenesError } = await supabase.from('scenes').insert([
      {
        project_id: testProjectId,
        scene_number: 1,
        narration_text: 'This is scene one',
        visual_description: 'Test visual 1',
      },
      {
        project_id: testProjectId,
        scene_number: 2,
        narration_text: 'This is scene two',
        visual_description: 'Test visual 2',
      },
      {
        project_id: testProjectId,
        scene_number: 3,
        narration_text: 'This is scene three',
        visual_description: 'Test visual 3',
      },
    ]);

    if (scenesError) {
      throw new Error(`Failed to create test scenes: ${scenesError.message}`);
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase.from('scenes').delete().eq('project_id', testProjectId);
    await supabase.from('render_jobs').delete().eq('project_id', testProjectId);
    await supabase.from('projects').delete().eq('id', testProjectId);
    await supabase.auth.admin.deleteUser(testUserId);
  });

  describe('Full Render Job Lifecycle', () => {
    it('should create render job and initialize steps', async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/render-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          projectId: testProjectId,
        }),
      });

      expect(response.status).toBe(201);

      const { jobId, status, currentStep, progress } = await response.json();

      expect(jobId).toBeDefined();
      expect(status).toBe('queued');
      expect(currentStep).toBe('tts_generation');
      expect(progress).toBe(0);

      // Verify job was created in database
      const { data: jobData, error: jobError } = await supabase
        .from('render_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      expect(jobError).toBeNull();
      expect(jobData).toBeTruthy();
      expect(jobData.status).toBe('queued');

      // Verify 4 job steps were created
      const { data: stepsData, error: stepsError } = await supabase
        .from('job_steps')
        .select('*')
        .eq('render_job_id', jobId);

      expect(stepsError).toBeNull();
      expect(stepsData).toHaveLength(4);

      // Verify step names
      const stepNames = stepsData!.map((s) => s.step_name).sort();
      expect(stepNames).toEqual([
        'media_fetch',
        'render_composite',
        'subtitle_generation',
        'tts_generation',
      ]);

      // Verify all steps are initially pending
      stepsData!.forEach((step) => {
        expect(step.status).toBe('pending');
      });
    });

    it('should capture snapshots correctly (T017)', async () => {
      // Create render job
      const createResponse = await fetch(`${SUPABASE_URL}/functions/v1/render-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          projectId: testProjectId,
        }),
      });

      const { jobId } = await createResponse.json();

      // Fetch job from database
      const { data: jobData } = await supabase
        .from('render_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      expect(jobData).toBeTruthy();

      // Verify snapshots were captured
      expect(jobData!.storyboard_script_version_snapshot).toBe(1);
      expect(jobData!.voice_id_snapshot).toBe('en-US-Neural2-A');
      expect(jobData!.script_version_snapshot).toBe(1);
    });

    it('should poll job status and get updated progress', async () => {
      // Create render job
      const createResponse = await fetch(`${SUPABASE_URL}/functions/v1/render-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          projectId: testProjectId,
        }),
      });

      const { jobId } = await createResponse.json();

      // Poll status endpoint
      const statusResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/render-jobs/${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(statusResponse.status).toBe(200);

      const { jobSteps, progress, updatedAt } = await statusResponse.json();

      expect(jobSteps).toHaveLength(4);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
      expect(updatedAt).toBeDefined();

      // Verify jobSteps structure
      jobSteps.forEach((step: any) => {
        expect(step).toHaveProperty('id');
        expect(step).toHaveProperty('step_name');
        expect(step).toHaveProperty('status');
        expect(step).toHaveProperty('started_at');
        expect(step).toHaveProperty('ended_at');
      });
    });

    it('should calculate progress correctly (T013)', async () => {
      // Create render job
      const createResponse = await fetch(`${SUPABASE_URL}/functions/v1/render-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          projectId: testProjectId,
        }),
      });

      const { jobId } = await createResponse.json();

      // Manually update first step to 'done'
      await supabase
        .from('job_steps')
        .update({
          status: 'done',
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
        })
        .eq('render_job_id', jobId)
        .eq('step_name', 'tts_generation');

      // Poll status
      const statusResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/render-jobs/${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const { progress } = await statusResponse.json();

      // With 1/4 steps done, progress should be 25%
      expect(progress).toBe(25);
    });
  });

  describe('Cancellation Flow', () => {
    it('should cancel queued job', async () => {
      // Create render job
      const createResponse = await fetch(`${SUPABASE_URL}/functions/v1/render-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          projectId: testProjectId,
        }),
      });

      const { jobId } = await createResponse.json();

      // Cancel job
      const cancelResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/render-jobs/${jobId}/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(cancelResponse.status).toBe(200);

      const { status, completedAt } = await cancelResponse.json();

      expect(status).toBe('canceled');
      expect(completedAt).toBeDefined();

      // Verify in database
      const { data: jobData } = await supabase
        .from('render_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      expect(jobData!.status).toBe('canceled');
      expect(jobData!.completed_at).not.toBeNull();
    });

    it('should not allow canceling succeeded job', async () => {
      // Create and complete a job
      const createResponse = await fetch(`${SUPABASE_URL}/functions/v1/render-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          projectId: testProjectId,
        }),
      });

      const { jobId } = await createResponse.json();

      // Manually update to succeeded
      await supabase
        .from('render_jobs')
        .update({
          status: 'succeeded',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      // Try to cancel
      const cancelResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/render-jobs/${jobId}/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(cancelResponse.status).toBe(400);
    });
  });

  describe('Retry Flow (T015)', () => {
    it('should retry failed job from failed step', async () => {
      // Create render job
      const createResponse = await fetch(`${SUPABASE_URL}/functions/v1/render-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          projectId: testProjectId,
        }),
      });

      const { jobId } = await createResponse.json();

      // Mark first 2 steps as done, 3rd step as failed
      await supabase
        .from('job_steps')
        .update({
          status: 'done',
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
        })
        .eq('render_job_id', jobId)
        .in('step_name', ['tts_generation', 'subtitle_generation']);

      await supabase
        .from('job_steps')
        .update({
          status: 'failed',
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          log: 'Media download failed',
        })
        .eq('render_job_id', jobId)
        .eq('step_name', 'media_fetch');

      // Update job to failed
      await supabase
        .from('render_jobs')
        .update({
          status: 'failed',
          error_code: 'MEDIA_TIMEOUT',
          error_message: 'Media download timed out',
        })
        .eq('id', jobId);

      // Retry job
      const retryResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/render-jobs/${jobId}/retry`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(retryResponse.status).toBe(200);

      const { status, retryCount } = await retryResponse.json();

      expect(status).toBe('queued');
      expect(retryCount).toBe(1);

      // Verify failed step and subsequent steps were reset to pending
      const { data: stepsData } = await supabase
        .from('job_steps')
        .select('*')
        .eq('render_job_id', jobId)
        .order('step_name');

      expect(stepsData).toHaveLength(4);

      // First 2 steps should still be done
      expect(stepsData![0].status).toBe('done'); // tts_generation
      expect(stepsData![1].status).toBe('done'); // subtitle_generation

      // Failed step and next step should be pending
      expect(stepsData![2].status).toBe('pending'); // media_fetch (was failed)
      expect(stepsData![3].status).toBe('pending'); // render_composite
    });

    it('should not retry non-failed job', async () => {
      // Create render job
      const createResponse = await fetch(`${SUPABASE_URL}/functions/v1/render-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          projectId: testProjectId,
        }),
      });

      const { jobId } = await createResponse.json();

      // Try to retry queued job
      const retryResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/render-jobs/${jobId}/retry`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(retryResponse.status).toBe(400);
    });
  });

  describe('Error Handling (T019)', () => {
    it('should return actionable error messages', async () => {
      // Create render job
      const createResponse = await fetch(`${SUPABASE_URL}/functions/v1/render-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          projectId: testProjectId,
        }),
      });

      const { jobId } = await createResponse.json();

      // Mark job as failed with error code
      await supabase
        .from('render_jobs')
        .update({
          status: 'failed',
          error_code: 'TTS_FAILED',
          error_message: 'Voiceover generation failed',
        })
        .eq('id', jobId);

      // Poll status
      const statusResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/render-jobs/${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const { errorCode, errorMessage } = await statusResponse.json();

      expect(errorCode).toBe('TTS_FAILED');
      expect(errorMessage).toMatch(/Voiceover generation failed/);
    });
  });
});
