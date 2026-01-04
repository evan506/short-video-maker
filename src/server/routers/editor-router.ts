/**
 * Editor API Router
 *
 * This router handles all endpoints for the Script & Storyboard Editor feature.
 * All routes are prefixed with /api/v1/editor and require authentication.
 *
 * NOTE: This is a scaffold with placeholder implementations.
 * Full implementations will be added in subsequent work packages (WP1-WP4).
 *
 * Routes:
 *   POST   /api/v1/editor/projects                          - Create project
 *   GET    /api/v1/editor/projects                          - List user's projects
 *   GET    /api/v1/editor/projects/:projectId               - Get single project
 *   PATCH  /api/v1/editor/projects/:projectId               - Update project
 *   DELETE /api/v1/editor/projects/:projectId               - Delete project
 *   POST   /api/v1/editor/projects/:projectId/scripts/generate - Generate script (LLM)
 *   GET    /api/v1/editor/projects/:projectId/scripts       - List script versions
 *   POST   /api/v1/editor/scripts                           - Create script manually
 *   POST   /api/v1/editor/scripts/:scriptId/edit/:operation - Quick edit (shorten, lengthen, etc.)
 *   POST   /api/v1/editor/scripts/:scriptId/restore         - restore script version
 *   POST   /api/v1/editor/projects/:projectId/scenes/generate - Generate scenes from script
 *   GET    /api/v1/editor/projects/:projectId/scenes        - List scenes
 *   DELETE /api/v1/editor/projects/:projectId/scenes        - Delete all scenes
 *   PATCH  /api/v1/editor/scenes/:sceneId                   - Update single scene
 *   PATCH  /api/v1/editor/scenes/batch                      - Batch update scenes
 *   POST   /api/v1/editor/projects/:projectId/scenes/reorder - Reorder scenes
 */

import express from 'express';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { supabaseAuthMiddleware } from '../middleware/supabase-auth';

export class EditorRouter {
  public router: express.Router;

  constructor() {
    this.router = express.Router();

    // Apply authentication middleware to all routes
    this.router.use(supabaseAuthMiddleware);

    // Parse JSON bodies
    this.router.use(express.json());

    this.setupRoutes();
  }

  private setupRoutes() {
    // ==================== PROJECT ROUTES ====================

    /**
     * POST /api/v1/editor/projects
     * Create a new project
     * Implementation: WP4 (T056)
     */
    this.router.post(
      '/projects',
      async (req: ExpressRequest, res: ExpressResponse) => {
        res.status(501).json({
          message: 'Not implemented yet',
          route: 'POST /api/v1/editor/projects'
        });
      }
    );

    /**
     * GET /api/v1/editor/projects
     * List all projects for authenticated user
     * Implementation: WP4 (T057)
     */
    this.router.get(
      '/projects',
      async (req: ExpressRequest, res: ExpressResponse) => {
        res.status(501).json({
          message: 'Not implemented yet',
          route: 'GET /api/v1/editor/projects'
        });
      }
    );

    /**
     * GET /api/v1/editor/projects/:projectId
     * Get a single project with script and scenes
     * Implementation: WP4 (T058)
     */
    this.router.get(
      '/projects/:projectId',
      async (req: ExpressRequest, res: ExpressResponse) => {
        res.status(501).json({
          message: 'Not implemented yet',
          route: 'GET /api/v1/editor/projects/:projectId'
        });
      }
    );

    /**
     * PATCH /api/v1/editor/projects/:projectId
     * Update project metadata
     * Implementation: WP4 (T059)
     */
    this.router.patch(
      '/projects/:projectId',
      async (req: ExpressRequest, res: ExpressResponse) => {
        res.status(501).json({
          message: 'Not implemented yet',
          route: 'PATCH /api/v1/editor/projects/:projectId'
        });
      }
    );

    /**
     * DELETE /api/v1/editor/projects/:projectId
     * Delete a project (cascades to scripts and scenes)
     * Implementation: WP4 (T060) - DEFERRED TO PHASE 2
     */
    this.router.delete(
      '/projects/:projectId',
      async (req: ExpressRequest, res: ExpressResponse) => {
        res.status(501).json({
          message: 'Not implemented yet - deferred to Phase 2',
          route: 'DELETE /api/v1/editor/projects/:projectId'
        });
      }
    );

    // ==================== SCRIPT ROUTES ====================

    /**
     * POST /api/v1/editor/projects/:projectId/scripts/generate
     * Generate a new script using LLM
     * Implementation: WP1 (T014)
     */
    this.router.post(
      '/projects/:projectId/scripts/generate',
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const { projectId } = req.params;
          const userId = req.user?.id;

          if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
          }

          // Import service dynamically
          const { generateScriptVersion } = await import('../services/script-service');

          // TODO: Validate project exists and belongs to user
          // For now, proceed with generation

          // Get project details from request body or query
          const topic = req.body.topic;
          const platform = req.body.platform;
          const targetDuration = req.body.target_duration;
          const videoType = req.body.video_type;

          if (!topic || !platform || !targetDuration || !videoType) {
            return res.status(400).json({
              error: 'Missing required fields: topic, platform, target_duration, video_type'
            });
          }

          const script = await generateScriptVersion({
            projectId,
            topic,
            platform,
            targetDuration,
            videoType
          });

          res.status(201).json(script);
        } catch (error: any) {
          console.error('Error generating script:', error);
          res.status(500).json({
            error: error.message || 'Failed to generate script'
          });
        }
      }
    );

    /**
     * GET /api/v1/editor/projects/:projectId/scripts
     * List all script versions for a project
     * Implementation: WP1 (T017)
     */
    this.router.get(
      '/projects/:projectId/scripts',
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const { projectId } = req.params;
          const userId = req.user?.id;

          if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
          }

          // Import service
          const { getScriptsByProject } = await import('../services/script-service');

          // Get all scripts for project
          const scripts = await getScriptsByProject(projectId);

          res.status(200).json(scripts);
        } catch (error: any) {
          console.error('Error fetching scripts:', error);
          res.status(500).json({
            error: error.message || 'Failed to fetch scripts'
          });
        }
      }
    );

    /**
     * POST /api/v1/editor/scripts
     * Create a new script manually (save or new version)
     * Implementation: WP1 (T016)
     */
    this.router.post(
      '/scripts',
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const { project_id, content, source } = req.body;
          const userId = req.user?.id;

          if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
          }

          // Validate required fields
          if (!project_id || !content || !source) {
            return res.status(400).json({
              error: 'Missing required fields: project_id, content, source'
            });
          }

          // Validate content length
          if (content.length < 50) {
            return res.status(400).json({
              error: 'Script content must be at least 50 characters'
            });
          }

          // Validate source
          if (!['llm', 'user'].includes(source)) {
            return res.status(400).json({
              error: 'Source must be either "llm" or "user"'
            });
          }

          // Import service
          const { createScriptVersion } = await import('../services/script-service');

          // Create script version
          const script = await createScriptVersion({
            projectId: project_id,
            content,
            source
          });

          res.status(201).json(script);
        } catch (error: any) {
          console.error('Error creating script:', error);
          res.status(500).json({
            error: error.message || 'Failed to create script'
          });
        }
      }
    );

    /**
     * POST /api/v1/editor/scripts/:scriptId/edit/:operation
     * Quick edit operations: shorten, lengthen, rephrase, tone
     * Implementation: WP1 (T015)
     */
    this.router.post(
      '/scripts/:scriptId/edit/:operation',
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const { scriptId } = req.params;
          const { operation } = req.params;
          const { tone } = req.body;
          const userId = req.user?.id;

          if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
          }

          // Validate operation
          const validOperations = ['shorten', 'lengthen', 'rephrase', 'tone'];
          if (!validOperations.includes(operation)) {
            return res.status(400).json({
              error: `Invalid operation. Must be one of: ${validOperations.join(', ')}`
            });
          }

          // Validate tone for tone operation
          if (operation === 'tone') {
            const validTones = ['Casual', 'Professional', 'Funny', 'Inspirational'];
            if (!tone || !validTones.includes(tone)) {
              return res.status(400).json({
                error: `Invalid tone. Must be one of: ${validTones.join(', ')}`
              });
            }
          }

          // Import services
          const { getScriptById } = await import('../services/script-service');
          const llmService = await import('../services/llm-service');

          // Get script
          const script = await getScriptById(scriptId);

          // TODO: Verify user has access to this script via project ownership
          // For now, proceed with preview generation

          let previewContent: string;

          switch (operation) {
            case 'shorten':
              const shortenResult = await llmService.shortenScript(script.content);
              previewContent = shortenResult.content;
              break;
            case 'lengthen':
              const lengthenResult = await llmService.lengthenScript(script.content);
              previewContent = lengthenResult.content;
              break;
            case 'rephrase':
              const rephraseResult = await llmService.rephraseScript(script.content);
              previewContent = rephraseResult.content;
              break;
            case 'tone':
              const toneResult = await llmService.changeTone(script.content, tone);
              previewContent = toneResult.content;
              break;
            default:
              return res.status(400).json({ error: 'Invalid operation' });
          }

          // Return preview (do not save)
          res.status(200).json({
            previewContent,
            operation,
            originalContent: script.content
          });
        } catch (error: any) {
          console.error('Error in quick edit:', error);
          res.status(500).json({
            error: error.message || 'Failed to generate preview'
          });
        }
      }
    );

    /**
     * POST /api/v1/editor/scripts/:scriptId/restore
     * Restore a previous script version
     * Implementation: WP1 (T018)
     */
    this.router.post(
      '/scripts/:scriptId/restore',
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const { scriptId } = req.params;
          const userId = req.user?.id;

          if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
          }

          // Import service
          const { restoreScriptVersion } = await import('../services/script-service');

          // Restore script (creates new version with restored content)
          const restoredScript = await restoreScriptVersion(scriptId);

          res.status(201).json(restoredScript);
        } catch (error: any) {
          console.error('Error restoring script:', error);
          res.status(500).json({
            error: error.message || 'Failed to restore script'
          });
        }
      }
    );

    // ==================== SCENE ROUTES ====================

    /**
     * POST /api/v1/editor/projects/:projectId/scenes/generate
     * Generate scenes from the latest script
     * Implementation: WP2 (T033)
     */
    this.router.post(
      '/projects/:projectId/scenes/generate',
      async (req: ExpressRequest, res: ExpressResponse) => {
        res.status(501).json({
          message: 'Not implemented yet',
          route: 'POST /api/v1/editor/projects/:projectId/scenes/generate'
        });
      }
    );

    /**
     * GET /api/v1/editor/projects/:projectId/scenes
     * List all scenes for a project
     * Implementation: WP2 (T034)
     */
    this.router.get(
      '/projects/:projectId/scenes',
      async (req: ExpressRequest, res: ExpressResponse) => {
        res.status(501).json({
          message: 'Not implemented yet',
          route: 'GET /api/v1/editor/projects/:projectId/scenes'
        });
      }
    );

    /**
     * DELETE /api/v1/editor/projects/:projectId/scenes
     * Delete all scenes for a project (prepare for regeneration)
     * Implementation: WP2 (T035)
     */
    this.router.delete(
      '/projects/:projectId/scenes',
      async (req: ExpressRequest, res: ExpressResponse) => {
        res.status(501).json({
          message: 'Not implemented yet',
          route: 'DELETE /api/v1/editor/projects/:projectId/scenes'
        });
      }
    );

    /**
     * PATCH /api/v1/editor/scenes/:sceneId
     * Update a single scene
     * Implementation: WP3 (T045)
     */
    this.router.patch(
      '/scenes/:sceneId',
      async (req: ExpressRequest, res: ExpressResponse) => {
        res.status(501).json({
          message: 'Not implemented yet',
          route: 'PATCH /api/v1/editor/scenes/:sceneId'
        });
      }
    );

    /**
     * PATCH /api/v1/editor/scenes/batch
     * Batch update multiple scenes (e.g., "Apply to all")
     * Implementation: WP3 (T046)
     */
    this.router.patch(
      '/scenes/batch',
      async (req: ExpressRequest, res: ExpressResponse) => {
        res.status(501).json({
          message: 'Not implemented yet',
          route: 'PATCH /api/v1/editor/scenes/batch'
        });
      }
    );

    /**
     * POST /api/v1/editor/projects/:projectId/scenes/reorder
     * Reorder scenes (drag-and-drop)
     * Implementation: WP3 (T047)
     */
    this.router.post(
      '/projects/:projectId/scenes/reorder',
      async (req: ExpressRequest, res: ExpressResponse) => {
        res.status(501).json({
          message: 'Not implemented yet',
          route: 'POST /api/v1/editor/projects/:projectId/scenes/reorder'
        });
      }
    );
  }
}
