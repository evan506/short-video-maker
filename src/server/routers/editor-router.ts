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
        try {
          const userId = req.user?.id;

          if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
          }

          // Extract project data from request body
          const { topic, platform, video_type, target_duration } = req.body;

          // Validate required fields
          if (!topic || !platform || !video_type || !target_duration) {
            return res.status(400).json({
              error: 'Missing required fields: topic, platform, video_type, target_duration'
            });
          }

          // Import project service
          const { createProject } = await import('../services/project-service');

          // Create project with auto-generated title (T068)
          const project = await createProject({
            user_id: userId,
            topic,
            platform,
            video_type,
            target_duration
          });

          res.status(201).json(project);
        } catch (error: any) {
          console.error('Error creating project:', error);
          res.status(500).json({
            error: error.message || 'Failed to create project'
          });
        }
      }
    );

    /**
     * GET /api/v1/editor/projects
     * List all projects for authenticated user
     * Implementation: WP4 (T057, T064)
     * - Sorted by updated_at DESC
     */
    this.router.get(
      '/projects',
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const userId = req.user?.id;

          if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
          }

          // Import project service
          const { listProjects } = await import('../services/project-service');

          // List user's projects sorted by updated_at DESC (T064)
          const projects = await listProjects(userId);

          res.status(200).json({ projects });
        } catch (error: any) {
          console.error('Error listing projects:', error);
          res.status(500).json({
            error: error.message || 'Failed to list projects'
          });
        }
      }
    );

    /**
     * GET /api/v1/editor/projects/:projectId
     * Get a single project with script and scenes
     * Implementation: WP4 (T058)
     * - Fetches FULL state: project + script + scenes
     * - Data consistency checks
     */
    this.router.get(
      '/projects/:projectId',
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const { projectId } = req.params;
          const userId = req.user?.id;

          if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
          }

          // Import project service
          const { getProjectWithFullState } = await import('../services/project-service');

          // Load project with FULL state (script + scenes)
          const project = await getProjectWithFullState(projectId, userId);

          res.status(200).json(project);
        } catch (error: any) {
          console.error('Error loading project:', error);
          res.status(500).json({
            error: error.message || 'Failed to load project'
          });
        }
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
        try {
          const { projectId } = req.params;
          const userId = req.user?.id;

          if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
          }

          // Extract update fields from request body
          const { title, topic, platform, video_type, target_duration } = req.body;

          // Build updates object (only include provided fields)
          const updates: any = {};
          if (title !== undefined) updates.title = title;
          if (topic !== undefined) updates.topic = topic;
          if (platform !== undefined) updates.platform = platform;
          if (video_type !== undefined) updates.video_type = video_type;
          if (target_duration !== undefined) updates.target_duration = target_duration;

          // Import project service
          const { updateProject } = await import('../services/project-service');

          // Update project
          const project = await updateProject(projectId, userId, updates);

          res.status(200).json(project);
        } catch (error: any) {
          console.error('Error updating project:', error);
          res.status(500).json({
            error: error.message || 'Failed to update project'
          });
        }
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
        try {
          const { projectId } = req.params;
          const userId = req.user?.id;

          if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
          }

          // Import scene service
          const { generateScenes, scenesExist } = await import('../services/scene-service');
          const { getCurrentScript } = await import('../services/script-service');

          // Check if scenes already exist (one-time generation policy)
          const existingScenes = await scenesExist(projectId);
          const forceRegenerate = req.body.force_regenerate === true;

          if (existingScenes && !forceRegenerate) {
            return res.status(400).json({
              error: 'Scenes already exist. Set force_regenerate=true to regenerate.',
              scenesAlreadyExist: true
            });
          }

          // Get current script for the project
          const script = await getCurrentScript(projectId);

          if (!script) {
            return res.status(404).json({
              error: 'No script found for this project. Generate a script first.'
            });
          }

          // Generate scenes from script
          const scenes = await generateScenes({
            projectId,
            scriptContent: script.content,
            scriptVersion: script.version
          });

          res.status(201).json(scenes);
        } catch (error: any) {
          console.error('Error generating scenes:', error);
          res.status(500).json({
            error: error.message || 'Failed to generate scenes'
          });
        }
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
        try {
          const { projectId } = req.params;
          const userId = req.user?.id;

          if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
          }

          // Import scene service
          const { getScenesByProject, scenesExist } = await import('../services/scene-service');

          // Check if scenes exist
          const hasScenes = await scenesExist(projectId);

          if (!hasScenes) {
            return res.status(200).json({
              scenes: [],
              scenesExist: false,
              message: 'No scenes found for this project. Generate scenes first.'
            });
          }

          // Get all scenes for project
          const scenes = await getScenesByProject(projectId);

          res.status(200).json({
            scenes,
            scenesExist: true
          });
        } catch (error: any) {
          console.error('Error fetching scenes:', error);
          res.status(500).json({
            error: error.message || 'Failed to fetch scenes'
          });
        }
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
        try {
          const { projectId } = req.params;
          const userId = req.user?.id;

          if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
          }

          // Import scene service
          const { deleteScenes } = await import('../services/scene-service');

          // Delete all scenes for project
          await deleteScenes(projectId);

          res.status(200).json({
            message: 'Scenes deleted successfully',
            deleted: true
          });
        } catch (error: any) {
          console.error('Error deleting scenes:', error);
          res.status(500).json({
            error: error.message || 'Failed to delete scenes'
          });
        }
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
        try {
          const { sceneId } = req.params;
          const userId = req.user?.id;

          if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
          }

          // Extract update fields from request body
          const {
            narration_text,
            duration_sec_draft,
            primary_keyword,
            subtitle_style_preset_id
          } = req.body;

          // Build updates object (only include provided fields)
          const updates: any = {};
          if (narration_text !== undefined) updates.narration_text = narration_text;
          if (duration_sec_draft !== undefined) updates.duration_sec_draft = duration_sec_draft;
          if (primary_keyword !== undefined) updates.primary_keyword = primary_keyword;
          if (subtitle_style_preset_id !== undefined) updates.subtitle_style_preset_id = subtitle_style_preset_id;

          // Validate duration if provided
          if (updates.duration_sec_draft !== undefined) {
            if (updates.duration_sec_draft < 1) {
              return res.status(400).json({
                error: 'Duration must be at least 1 second'
              });
            }
          }

          // Import scene service
          const { updateScene } = await import('../services/scene-service');

          // Update scene
          const updatedScene = await updateScene(sceneId, updates);

          res.status(200).json(updatedScene);
        } catch (error: any) {
          console.error('Error updating scene:', error);
          res.status(500).json({
            error: error.message || 'Failed to update scene'
          });
        }
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
        try {
          const userId = req.user?.id;

          if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
          }

          // Extract batch update parameters
          const { scene_ids, updates } = req.body;

          // Validate request
          if (!Array.isArray(scene_ids) || scene_ids.length === 0) {
            return res.status(400).json({
              error: 'scene_ids must be a non-empty array'
            });
          }

          if (!updates || typeof updates !== 'object') {
            return res.status(400).json({
              error: 'updates must be an object'
            });
          }

          // Validate duration if provided in updates
          if (updates.duration_sec_draft !== undefined) {
            if (updates.duration_sec_draft < 1) {
              return res.status(400).json({
                error: 'Duration must be at least 1 second'
              });
            }
          }

          // Import scene service
          const { batchUpdateScenes } = await import('../services/scene-service');

          // Perform batch update
          const updatedScenes = await batchUpdateScenes(scene_ids, updates);

          res.status(200).json({
            updated: updatedScenes.length,
            scenes: updatedScenes
          });
        } catch (error: any) {
          console.error('Error in batch update:', error);
          res.status(500).json({
            error: error.message || 'Failed to perform batch update'
          });
        }
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
        try {
          const { projectId } = req.params;
          const userId = req.user?.id;

          if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
          }

          // Extract scene IDs array from request body
          const { scene_ids } = req.body;

          // Validate request
          if (!Array.isArray(scene_ids) || scene_ids.length === 0) {
            return res.status(400).json({
              error: 'scene_ids must be a non-empty array'
            });
          }

          // Import scene service
          const { reorderScenes } = await import('../services/scene-service');

          // Reorder scenes (updates order_index for all scenes)
          await reorderScenes(projectId, scene_ids);

          res.status(200).json({
            message: 'Scenes reordered successfully',
            reordered: true
          });
        } catch (error: any) {
          console.error('Error reordering scenes:', error);
          res.status(500).json({
            error: error.message || 'Failed to reorder scenes'
          });
        }
      }
    );
  }
}
