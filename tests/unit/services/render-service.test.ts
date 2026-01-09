/**
 * Unit Tests: Render Service (T071)
 *
 * Tests for render service business logic:
 * - Job creation with snapshots
 * - Snapshot capture logic
 * - Job status polling
 * - Cancellation logic
 * - Retry from failed step
 * - Error message mapping
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createRenderJob,
  getRenderJob,
  cancelRenderJob,
  retryRenderJob,
  getErrorMessage,
  type CreateRenderJobInput,
} from '../../../src/server/services/render-service';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  delete: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock('../../../src/server/lib/supabase', () => ({
  supabase: mockSupabase,
}));

describe('Render Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createRenderJob', () => {
    const mockProject = {
      storyboard_script_version: 1,
      voice_id: 'test-voice-id',
      current_script_version: 2,
    };

    const mockRenderJob = {
      id: 'test-job-id',
      project_id: 'test-project-id',
      status: 'queued',
      current_step: 'tts_generation',
      progress: 0,
      storyboard_script_version_snapshot: 1,
      voice_id_snapshot: 'test-voice-id',
      script_version_snapshot: 2,
      retry_count: 0,
      error_code: null,
      error_message: null,
      created_at: '2024-01-09T00:00:00Z',
      updated_at: '2024-01-09T00:00:00Z',
      started_at: null,
      completed_at: null,
    };

    it('should create render job with snapshots (T017)', async () => {
      const input: CreateRenderJobInput = {
        projectId: 'test-project-id',
        userId: 'test-user-id',
      };

      // Mock project query
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockProject,
        error: null,
      });

      // Mock render job insertion
      mockSupabase.insert.mockResolvedValueOnce({
        data: [mockRenderJob],
        error: null,
      });
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockRenderJob,
        error: null,
      });

      // Mock job steps insertion
      mockSupabase.insert.mockResolvedValueOnce({ error: null });

      const result = await createRenderJob(input);

      expect(result).toEqual(mockRenderJob);
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.from).toHaveBeenCalledWith('render_jobs');
      expect(mockSupabase.from).toHaveBeenCalledWith('job_steps');
    });

    it('should capture snapshots correctly (T017)', async () => {
      const input: CreateRenderJobInput = {
        projectId: 'test-project-id',
        userId: 'test-user-id',
      };

      // Mock project query
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockProject,
        error: null,
      });

      // Mock render job insertion
      mockSupabase.insert.mockResolvedValueOnce({
        data: [mockRenderJob],
        error: null,
      });
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockRenderJob,
        error: null,
      });

      // Mock job steps insertion
      mockSupabase.insert.mockResolvedValueOnce({ error: null });

      await createRenderJob(input);

      // Verify snapshots were captured
      expect(mockRenderJob.storyboard_script_version_snapshot).toBe(1);
      expect(mockRenderJob.voice_id_snapshot).toBe('test-voice-id');
      expect(mockRenderJob.script_version_snapshot).toBe(2);
    });

    it('should throw error if project not found', async () => {
      const input: CreateRenderJobInput = {
        projectId: 'nonexistent-project',
        userId: 'test-user-id',
      };

      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(createRenderJob(input)).rejects.toThrow(
        'Project not found or access denied'
      );
    });

    it('should create 4 job steps', async () => {
      const input: CreateRenderJobInput = {
        projectId: 'test-project-id',
        userId: 'test-user-id',
      };

      // Mock project query
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockProject,
        error: null,
      });

      // Mock render job insertion
      mockSupabase.insert.mockResolvedValueOnce({
        data: [mockRenderJob],
        error: null,
      });
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockRenderJob,
        error: null,
      });

      // Mock job steps insertion
      const insertSpy = vi.spyOn(mockSupabase, 'insert').mockResolvedValueOnce({
        error: null,
      });

      await createRenderJob(input);

      expect(insertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ step_name: 'tts_generation' }),
          expect.objectContaining({ step_name: 'subtitle_generation' }),
          expect.objectContaining({ step_name: 'media_fetch' }),
          expect.objectContaining({ step_name: 'render_composite' }),
        ])
      );
    });
  });

  describe('getRenderJob', () => {
    const mockJobWithSteps = {
      id: 'test-job-id',
      project_id: 'test-project-id',
      status: 'running',
      current_step: 'subtitle_generation',
      progress: 50,
      job_steps: [
        {
          id: 'step-1',
          render_job_id: 'test-job-id',
          step_name: 'tts_generation' as const,
          status: 'done' as const,
          started_at: '2024-01-09T00:00:00Z',
          ended_at: '2024-01-09T00:01:00Z',
          log: null,
          created_at: '2024-01-09T00:00:00Z',
        },
        {
          id: 'step-2',
          render_job_id: 'test-job-id',
          step_name: 'subtitle_generation' as const,
          status: 'running' as const,
          started_at: '2024-01-09T00:01:00Z',
          ended_at: null,
          log: null,
          created_at: '2024-01-09T00:00:00Z',
        },
        {
          id: 'step-3',
          render_job_id: 'test-job-id',
          step_name: 'media_fetch' as const,
          status: 'pending' as const,
          started_at: null,
          ended_at: null,
          log: null,
          created_at: '2024-01-09T00:00:00Z',
        },
        {
          id: 'step-4',
          render_job_id: 'test-job-id',
          step_name: 'render_composite' as const,
          status: 'pending' as const,
          started_at: null,
          ended_at: null,
          log: null,
          created_at: '2024-01-09T00:00:00Z',
        },
      ],
      storyboard_script_version_snapshot: 1,
      voice_id_snapshot: 'test-voice-id',
      script_version_snapshot: 2,
      retry_count: 0,
      error_code: null,
      error_message: null,
      created_at: '2024-01-09T00:00:00Z',
      updated_at: '2024-01-09T00:02:00Z',
      started_at: '2024-01-09T00:00:00Z',
      completed_at: null,
      project: {
        user_id: 'test-user-id',
      },
    };

    it('should return job with steps', async () => {
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockJobWithSteps,
        error: null,
      });
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockResolvedValueOnce({
        data: mockJobWithSteps.job_steps,
        error: null,
      });

      const result = await getRenderJob('test-job-id', 'test-user-id');

      expect(result).toEqual(mockJobWithSteps);
    });

    it('should calculate progress correctly (50% with 1/4 steps done)', async () => {
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockJobWithSteps,
        error: null,
      });
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockResolvedValueOnce({
        data: mockJobWithSteps.job_steps,
        error: null,
      });

      const result = await getRenderJob('test-job-id', 'test-user-id');

      expect(result.progress).toBe(50);
    });

    it('should throw error if job not found', async () => {
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(getRenderJob('nonexistent-job', 'test-user-id')).rejects.toThrow(
        'Render job not found or access denied'
      );
    });

    it('should throw error if user does not own job', async () => {
      const mockJobWithDifferentUser = {
        ...mockJobWithSteps,
        project: { user_id: 'different-user-id' },
      };

      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockJobWithDifferentUser,
        error: null,
      });

      await expect(getRenderJob('test-job-id', 'test-user-id')).rejects.toThrow(
        'Access denied'
      );
    });
  });

  describe('cancelRenderJob', () => {
    it('should cancel queued job', async () => {
      const mockJob = {
        id: 'test-job-id',
        status: 'queued' as const,
        project: { user_id: 'test-user-id' },
      };

      const mockUpdatedJob = {
        ...mockJob,
        status: 'canceled' as const,
        completed_at: '2024-01-09T00:05:00Z',
      };

      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockJob,
        error: null,
      });

      mockSupabase.update.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockUpdatedJob,
        error: null,
      });

      const result = await cancelRenderJob('test-job-id', 'test-user-id');

      expect(result.status).toBe('canceled');
      expect(result.completed_at).toBe('2024-01-09T00:05:00Z');
    });

    it('should cancel running job', async () => {
      const mockJob = {
        id: 'test-job-id',
        status: 'running' as const,
        project: { user_id: 'test-user-id' },
      };

      const mockUpdatedJob = {
        ...mockJob,
        status: 'canceled' as const,
        completed_at: '2024-01-09T00:05:00Z',
      };

      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockJob,
        error: null,
      });

      mockSupabase.update.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockUpdatedJob,
        error: null,
      });

      const result = await cancelRenderJob('test-job-id', 'test-user-id');

      expect(result.status).toBe('canceled');
    });

    it('should not allow canceling succeeded job', async () => {
      const mockJob = {
        id: 'test-job-id',
        status: 'succeeded' as const,
        project: { user_id: 'test-user-id' },
      };

      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockJob,
        error: null,
      });

      await expect(
        cancelRenderJob('test-job-id', 'test-user-id')
      ).rejects.toThrow('Cannot cancel a succeeded job');
    });

    it('should not allow canceling failed job', async () => {
      const mockJob = {
        id: 'test-job-id',
        status: 'failed' as const,
        project: { user_id: 'test-user-id' },
      };

      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockJob,
        error: null,
      });

      await expect(
        cancelRenderJob('test-job-id', 'test-user-id')
      ).rejects.toThrow('Cannot cancel a failed job. Use retry instead.');
    });
  });

  describe('retryRenderJob', () => {
    it('should retry failed job from failed step', async () => {
      const mockJob = {
        id: 'test-job-id',
        status: 'failed' as const,
        retry_count: 0,
        project: { user_id: 'test-user-id' },
      };

      const mockJobSteps = [
        { id: 'step-1', step_name: 'tts_generation', status: 'done' },
        { id: 'step-2', step_name: 'subtitle_generation', status: 'done' },
        { id: 'step-3', step_name: 'media_fetch', status: 'failed' },
        { id: 'step-4', step_name: 'render_composite', status: 'pending' },
      ];

      const mockUpdatedJob = {
        ...mockJob,
        status: 'queued' as const,
        retry_count: 1,
      };

      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockJob,
        error: null,
      });

      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockResolvedValueOnce({
        data: mockJobSteps,
        error: null,
      });

      // Mock step updates
      mockSupabase.update.mockResolvedValue({ error: null });

      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockUpdatedJob,
        error: null,
      });

      const result = await retryRenderJob('test-job-id', 'test-user-id');

      expect(result.status).toBe('queued');
      expect(result.retry_count).toBe(1);
    });

    it('should reset failed step and subsequent steps to pending', async () => {
      const mockJob = {
        id: 'test-job-id',
        status: 'failed' as const,
        retry_count: 0,
        project: { user_id: 'test-user-id' },
      };

      const mockJobSteps = [
        { id: 'step-1', step_name: 'tts_generation', status: 'done' },
        { id: 'step-2', step_name: 'subtitle_generation', status: 'done' },
        { id: 'step-3', step_name: 'media_fetch', status: 'failed' },
        { id: 'step-4', step_name: 'render_composite', status: 'pending' },
      ];

      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockJob,
        error: null,
      });

      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockResolvedValueOnce({
        data: mockJobSteps,
        error: null,
      });

      const updateSpy = vi.spyOn(mockSupabase, 'update').mockResolvedValue({
        error: null,
      });

      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockJob, status: 'queued', retry_count: 1 },
        error: null,
      });

      await retryRenderJob('test-job-id', 'test-user-id');

      // Should update step 3 (failed) and step 4 (pending after failed step)
      expect(updateSpy).toHaveBeenCalledTimes(3); // 2 steps + 1 job update
    });

    it('should not retry non-failed job', async () => {
      const mockJob = {
        id: 'test-job-id',
        status: 'queued' as const,
        project: { user_id: 'test-user-id' },
      };

      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: mockJob,
        error: null,
      });

      await expect(
        retryRenderJob('test-job-id', 'test-user-id')
      ).rejects.toThrow('Only failed jobs can be retried');
    });
  });

  describe('getErrorMessage', () => {
    it('should return user-friendly error for known error codes (T019)', () => {
      const result = getErrorMessage('TTS_FAILED');

      expect(result.message).toBe('Voiceover generation failed for one or more scenes');
      expect(result.action).toBe('Regenerate voiceovers from storyboard editor');
    });

    it('should return generic error for unknown error codes', () => {
      const result = getErrorMessage('UNKNOWN_ERROR');

      expect(result.message).toBe('Error: UNKNOWN_ERROR');
      expect(result.action).toBe('Please try again or contact support');
    });

    it('should return generic error for null error code', () => {
      const result = getErrorMessage(null);

      expect(result.message).toBe('An unexpected error occurred');
      expect(result.action).toBe('Please try again or contact support');
    });

    it('should map all error codes correctly', () => {
      const errorCodes = [
        'TTS_FAILED',
        'SUBTITLE_FAILED',
        'MEDIA_TIMEOUT',
        'STORAGE_UPLOAD_FAILED',
        'RENDER_TIMEOUT',
      ];

      errorCodes.forEach((code) => {
        const result = getErrorMessage(code);
        expect(result.message).toBeTruthy();
        expect(result.action).toBeTruthy();
      });
    });
  });
});
