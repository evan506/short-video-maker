/**
 * Render Router
 *
 * API endpoints for async video rendering job lifecycle:
 * - T011-T015: Create, poll status, cancel, retry render jobs
 * - T018: Project ownership validation
 * - T019: Actionable error messages
 *
 * Endpoints:
 * - POST   /api/v1/render/jobs                    - Create render job
 * - GET    /api/v1/render/jobs/:jobId             - Get job status and progress
 * - POST   /api/v1/render/jobs/:jobId/cancel      - Cancel running job
 * - POST   /api/v1/render/jobs/:jobId/retry       - Retry failed job
 */

import express, { type Request, type Response } from 'express';
import {
  createRenderJob,
  getRenderJob,
  cancelRenderJob,
  retryRenderJob,
  getErrorMessage,
} from '../services/render-service';
import { supabase } from '../lib/supabase';

const router = express.Router();

// Middleware to extract user from auth token (T018)
interface AuthRequest extends Request {
  userId?: string;
}

const extractUserId = async (req: AuthRequest, res: Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase Auth
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }

    req.userId = data.user.id;
    next();
  } catch (error) {
    console.error('[RenderRouter] Auth error:', error);
    res.status(401).json({ error: 'Unauthorized: Token validation failed' });
  }
};

// Apply auth middleware to all routes
router.use(extractUserId);

/**
 * POST /api/v1/render/jobs
 *
 * Create a new render job (T012)
 *
 * Request body:
 * {
 *   "projectId": string
 * }
 *
 * Response (201):
 * {
 *   "jobId": string,
 *   "status": "queued",
 *   "currentStep": "tts_generation",
 *   "progress": 0,
 *   "createdAt": string
 * }
 */
router.post('/jobs', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.body;
    const userId = req.userId!;

    // Validate input
    if (!projectId) {
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'projectId is required',
          action: 'Provide a valid project ID in request body',
        },
      });
      return;
    }

    // Verify project ownership (T018)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'Project not found or access denied',
          action: 'Verify you own this project',
        },
      });
      return;
    }

    // Create render job
    const renderJob = await createRenderJob({ projectId, userId });

    res.status(201).json({
      jobId: renderJob.id,
      status: renderJob.status,
      currentStep: renderJob.current_step,
      progress: renderJob.progress,
      createdAt: renderJob.created_at,
    });
  } catch (error: any) {
    console.error('[RenderRouter] Failed to create render job:', error);

    // Return actionable error message (T019)
    res.status(500).json({
      error: {
        code: 'JOB_CREATION_FAILED',
        message: error.message || 'Failed to create render job',
        action: 'Please try again or check project configuration',
      },
    });
  }
});

/**
 * GET /api/v1/render/jobs/:jobId
 *
 * Get render job status and progress (T013)
 *
 * Response (200):
 * {
 *   "jobId": string,
 *   "status": "queued" | "running" | "succeeded" | "failed" | "canceled",
 *   "currentStep": string | null,
 *   "progress": number,
 *   "jobSteps": [...],
 *   "updatedAt": string,
 *   "error": { ... } | null  // Only if status is 'failed'
 * }
 */
router.get('/jobs/:jobId', async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = req.userId!;

    const renderJob = await getRenderJob(jobId, userId);

    // Build response
    const response: any = {
      jobId: renderJob.id,
      status: renderJob.status,
      currentStep: renderJob.current_step,
      progress: renderJob.progress,
      jobSteps: renderJob.job_steps,
      updatedAt: renderJob.updated_at,
    };

    // Include error details if job failed
    if (renderJob.status === 'failed' && renderJob.error_code) {
      const errorDetails = getErrorMessage(renderJob.error_code);
      response.error = {
        code: renderJob.error_code,
        ...errorDetails,
      };
    }

    res.status(200).json(response);
  } catch (error: any) {
    console.error('[RenderRouter] Failed to fetch render job:', error);

    if (error.message === 'Render job not found or access denied') {
      res.status(404).json({
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Render job not found or access denied',
          action: 'Verify the job ID and your access permissions',
        },
      });
      return;
    }

    if (error.message === 'Access denied') {
      res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to access this job',
          action: 'Verify you own this project',
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'FETCH_JOB_FAILED',
        message: error.message || 'Failed to fetch render job',
        action: 'Please try again',
      },
    });
  }
});

/**
 * POST /api/v1/render/jobs/:jobId/cancel
 *
 * Cancel a running or queued render job (T014)
 *
 * Response (200):
 * {
 *   "jobId": string,
 *   "status": "canceled"
 * }
 */
router.post('/jobs/:jobId/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = req.userId!;

    const updatedJob = await cancelRenderJob(jobId, userId);

    res.status(200).json({
      jobId: updatedJob.id,
      status: updatedJob.status,
    });
  } catch (error: any) {
    console.error('[RenderRouter] Failed to cancel render job:', error);

    if (error.message === 'Render job not found or access denied') {
      res.status(404).json({
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Render job not found or access denied',
          action: 'Verify the job ID and your access permissions',
        },
      });
      return;
    }

    if (error.message === 'Access denied') {
      res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to cancel this job',
          action: 'Verify you own this project',
        },
      });
      return;
    }

    // Handle cancellation not allowed scenarios
    if (error.message.includes('Cannot cancel')) {
      res.status(400).json({
        error: {
          code: 'CANCELLATION_NOT_ALLOWED',
          message: error.message,
          action: error.message.includes('succeeded')
            ? 'Job already completed successfully'
            : error.message.includes('failed')
            ? 'Use retry endpoint instead'
            : 'Please try again',
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'CANCEL_JOB_FAILED',
        message: error.message || 'Failed to cancel render job',
        action: 'Please try again',
      },
    });
  }
});

/**
 * POST /api/v1/render/jobs/:jobId/retry
 *
 * Retry a failed render job from the failed step (T015)
 *
 * Response (200):
 * {
 *   "jobId": string,
 *   "status": "queued",
 *   "retryCount": number,
 *   "currentStep": string
 * }
 */
router.post('/jobs/:jobId/retry', async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = req.userId!;

    const updatedJob = await retryRenderJob(jobId, userId);

    res.status(200).json({
      jobId: updatedJob.id,
      status: updatedJob.status,
      retryCount: updatedJob.retry_count,
      currentStep: updatedJob.current_step,
    });
  } catch (error: any) {
    console.error('[RenderRouter] Failed to retry render job:', error);

    if (error.message === 'Render job not found or access denied') {
      res.status(404).json({
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Render job not found or access denied',
          action: 'Verify the job ID and your access permissions',
        },
      });
      return;
    }

    if (error.message === 'Access denied') {
      res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to retry this job',
          action: 'Verify you own this project',
        },
      });
      return;
    }

    // Handle retry not allowed scenarios
    if (error.message.includes('Only failed jobs can be retried')) {
      res.status(400).json({
        error: {
          code: 'RETRY_NOT_ALLOWED',
          message: error.message,
          action: 'Retry is only available for failed jobs',
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'RETRY_JOB_FAILED',
        message: error.message || 'Failed to retry render job',
        action: 'Please try again',
      },
    });
  }
});

export default router;
