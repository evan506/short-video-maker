# Research Findings: Script & Storyboard Editor

**Feature**: 001-script-storyboard-editor
**Phase**: 0 (Technical Research)
**Date**: 2026-01-02
**Status**: Complete

## Overview

This document captures technical research findings for the Script & Storyboard Editor feature. Research focused on three key areas: LLM integration patterns, Supabase setup for multi-table schemas with RLS, and scene splitting/merging algorithms for video storyboards.

## Research Topics

### Topic 1: OpenRouter API Integration

**Question**: How to integrate OpenRouter API for script generation with proper error handling, retry logic, and timeout management?

**Decision**: Use OpenRouter REST API with server-side proxy pattern

**Rationale**:
- OpenRouter provides unified API for multiple LLM providers (OpenAI, Anthropic, etc.)
- Server-side integration keeps API key secure (never exposed to frontend)
- REST API is simpler than WebSocket for request/response pattern
- Model selection via environment variable provides flexibility

**Implementation Approach**:
```
Backend Service (src/server/services/llm-service.ts):
├── OpenRouter API client (axios/fetch)
├── Prompt templates for script generation
├── Prompt templates for quick-edit operations
├── Retry logic with exponential backoff
├── Timeout handling (60s default)
└── Cost/token logging (if available from API)

API Endpoints (Express Router):
├── POST /api/v1/editor/projects/:projectId/scripts/generate
├── POST /api/v1/editor/scripts/:scriptId/edit/shorten
├── POST /api/v1/editor/scripts/:scriptId/edit/lengthen
├── POST /api/v1/editor/scripts/:scriptId/edit/rephrase
└── POST /api/v1/editor/scripts/:scriptId/edit/tone
```

**Alternatives Considered**:
- ❌ Direct frontend integration: Security risk (API key exposure)
- ❌ WebSocket over REST: Unnecessary complexity for request/response
- ❌ Multiple provider SDKs: Vendor lock-in, increased maintenance

**Key Technical Details**:
- **Base URL**: `https://openrouter.ai/api/v1`
- **Authentication**: Bearer token in `Authorization: Bearer $OPENROUTER_API_KEY`
- **Model selection**: `model` parameter in request body (default via `DEFAULT_LLM_MODEL` env var)
- **Timeout**: 60 seconds (abort controller)
- **Retry**: 3 attempts with exponential backoff (1s, 2s, 4s)
- **Error handling**: Graceful degradation with user-friendly messages

**Contract Testing Strategy**:
- Mock OpenRouter API using Nock for contract tests
- Verify request format (headers, body structure)
- Verify response parsing and error handling
- No real API calls in CI/CD pipeline

**References**:
- OpenRouter API Docs: https://openrouter.ai/docs
- Axios retry pattern: https://axios-http.io/docs/interceptors
---

### Topic 2: Supabase Multi-Table Schema with RLS

**Question**: How to structure Supabase database with related tables (projects, scripts, scenes) and enforce Row Level Security (RLS) for user isolation?

**Decision**: Use foreign key relationships with cascading deletes and RLS policies using `auth.uid()`

**Rationale**:
- Foreign keys ensure referential integrity (script → project, scene → project)
- Cascading deletes prevent orphaned records
- RLS policies enforce `user_id = auth.uid()` for all user-owned tables
- Supabase Auth integration provides built-in user management

**Database Schema**:
```sql
-- Projects table (root entity)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('shorts', 'tiktok', 'reels')),
  video_type TEXT NOT NULL CHECK (video_type IN ('Explainer', 'Marketing', 'Tutorial', 'Recipe', 'Story')),
  target_duration INTEGER NOT NULL CHECK (target_duration IN (15, 30, 60)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'rendering', 'done', 'failed')),
  current_script_version INTEGER,
  storyboard_script_version INTEGER,
  voice_id TEXT, -- Reserved for Phase 2
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scripts table (versioned narration)
CREATE TABLE scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('llm', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, version) -- One version per project per version number
);

-- Scenes table (storyboard scenes)
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  narration_text TEXT NOT NULL,
  duration_sec_draft INTEGER NOT NULL CHECK (duration_sec_draft >= 1),
  duration_sec_final INTEGER, -- Determined after TTS (Phase 2)
  primary_keyword TEXT NOT NULL,
  subtitle_style_preset_id INTEGER NOT NULL DEFAULT 1 REFERENCES subtitle_presets(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, order_index) -- One scene per project per position
);

-- Subtitle presets (reference data)
CREATE TABLE subtitle_presets (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  config JSONB NOT NULL -- Preset configuration (font, color, animation, etc.)
);

-- RLS Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (user_id = auth.uid());

-- Similar policies for scripts and scenes (join with projects to check user_id)
CREATE POLICY "Users can view own scripts" ON scripts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = scripts.project_id AND projects.user_id = auth.uid())
  );

-- (Repeat pattern for scripts INSERT/UPDATE/DELETE and scenes SELECT/INSERT/UPDATE/DELETE)
```

**Alternatives Considered**:
- ❌ No foreign keys (app-layer joins): Less performant, no referential integrity
- ❌ Separate user tables (duplicate user_id): Denormalized, harder to maintain
- ❌ No RLS (app-layer auth): Less secure, violates defense-in-depth

**Key Technical Details**:
- **Migration management**: Supabase CLI (`supabase migration new`)
- **Local development**: `supabase start` (Docker-based local Postgres)
- **Testing**: Separate test database (`supabase db reset` for cleanup)
- **Foreign key cascades**: `ON DELETE CASCADE` ensures cleanup
- **RLS performance**: Index on `user_id` in all tables for policy performance

**Testing Strategy**:
- Integration tests use Supabase test database
- Seed test user and mock data before each test
- Reset database between test runs
- Verify RLS policies prevent cross-user data access

**References**:
- Supabase RLS Docs: https://supabase.com/docs/guides/auth/row-level-security
- Supabase Migrations: https://supabase.com/docs/guides/cli/local-development
---

### Topic 3: Scene Splitting and Merging Algorithms

**Question**: How to automatically split a script into scenes with target durations (2-6 seconds), and merge scenes if count exceeds 20?

**Decision**: Use NLP-based sentence segmentation with duration estimation, followed by greedy merge algorithm

**Rationale**:
- Sentence boundaries provide natural scene breaks
- Duration estimation based on word count (approximate 2.5 words/second for narration)
- Greedy merge ensures optimal scene count while preserving readability
- Auto-merge threshold prevents overcrowded storyboard

**Algorithm Design**:

**Step 1: Scene Splitting**
```typescript
interface SceneDraft {
  narration: string;
  durationSec: number;
  primaryKeyword: string;
}

function splitScriptIntoScenes(
  scriptContent: string,
  targetDuration: number, // Overall video target (15/30/60)
  densityPreset: 'normal' | 'dense' | 'sparse' = 'normal'
): SceneDraft[] {
  // 1. Split into sentences using NLP tokenizer
  const sentences = tokenizeSentences(scriptContent);

  // 2. Calculate target scene duration based on preset
  const targetSceneDuration = {
    sparse: 5,    // 4-6 seconds per scene
    normal: 4,    // 2-6 seconds per scene (default)
    dense: 2.5    // 1-4 seconds per scene
  }[densityPreset];

  // 3. Group sentences into scenes based on word count estimation
  const scenes: SceneDraft[] = [];
  let currentScene: string[] = [];
  let currentWordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = countWords(sentence);
    const estimatedDuration = sentenceWords / WORDS_PER_SECOND; // 2.5 wps default

    if (currentWordCount + sentenceWords > targetSceneDuration * WORDS_PER_SECOND
        && currentScene.length > 0) {
      // Flush current scene
      scenes.push(createScene(currentScene.join(' ')));
      currentScene = [sentence];
      currentWordCount = sentenceWords;
    } else {
      currentScene.push(sentence);
      currentWordCount += sentenceWords;
    }
  }

  // Flush final scene
  if (currentScene.length > 0) {
    scenes.push(createScene(currentScene.join(' ')));
  }

  // 4. Extract primary keyword from each scene
  return scenes.map(scene => extractKeyword(scene));
}

function createScene(narration: string): SceneDraft {
  const wordCount = countWords(narration);
  const durationSec = Math.ceil(wordCount / WORDS_PER_SECOND); // Round up
  return {
    narration,
    durationSec,
    primaryKeyword: '' // Will be extracted below
  };
}

function extractKeyword(scene: SceneDraft): SceneDraft {
  // Simple NLP: Extract first noun phrase or most important noun
  const keywords = extractNouns(scene.narration);
  scene.primaryKeyword = keywords[0] || 'general';
  return scene;
}
```

**Step 2: Scene Merging (if > 20 scenes)**
```typescript
function mergeScenesIfNeeded(scenes: SceneDraft[], maxScenes: number = 20): SceneDraft[] {
  if (scenes.length <= maxScenes) return scenes;

  // Greedy merge: Combine shortest adjacent scenes until count ≤ maxScenes
  let mergedScenes = [...scenes];

  while (mergedScenes.length > maxScenes) {
    // Find adjacent pair with minimum combined duration
    let minDuration = Infinity;
    let mergeIndex = -1;

    for (let i = 0; i < mergedScenes.length - 1; i++) {
      const combinedDuration = mergedScenes[i].durationSec + mergedScenes[i + 1].durationSec;
      if (combinedDuration < minDuration) {
        minDuration = combinedDuration;
        mergeIndex = i;
      }
    }

    // Merge scenes at mergeIndex and mergeIndex + 1
    const sceneA = mergedScenes[mergeIndex];
    const sceneB = mergedScenes[mergeIndex + 1];
    const merged: SceneDraft = {
      narration: `${sceneA.narration} ${sceneB.narration}`.trim(),
      durationSec: sceneA.durationSec + sceneB.durationSec,
      primaryKeyword: sceneA.primaryKeyword // Keep first scene's keyword
    };

    // Replace two scenes with merged scene
    mergedScenes.splice(mergeIndex, 2, merged);
  }

  return mergedScenes;
}
```

**Alternatives Considered**:
- ❌ Fixed scene count (e.g., 10 scenes for 60s): Inflexible, doesn't adapt to script length
- ❌ Manual scene splitting only: Poor UX, requires user effort
- ❌ Random merge strategy: Unpredictable results, may create awkward scene boundaries

**Key Technical Details**:
- **Word rate**: 2.5 words/second for narration (configurable via env)
- **Min scene duration**: 1 second (validation constraint)
- **Max scene duration**: No maximum (but algorithm targets 2-6 seconds)
- **Merge threshold**: < 2 seconds triggers auto-merge
- **NLP library**: Use simple tokenization for Phase 1 (no heavy NLP dependencies)

**Edge Cases**:
- **Very short scripts**: May produce 1-2 long scenes (acceptable per spec)
- **Very long scripts**: Auto-merge ensures ≤ 20 scenes
- **Sentence fragmentation**: Punctuation-based fallback if NLP tokenizer unavailable

**Testing Strategy**:
- Unit tests for `splitScriptIntoScenes()` with various scripts
- Unit tests for `mergeScenesIfNeeded()` with edge cases (1 scene, 25 scenes, etc.)
- Integration test: Script → Scene generation with real LLM output
- E2E test: User creates project, generates script, verifies scene count

**References**:
- Sentence tokenization: Simple regex or lightweight NLP library (e.g., `compromise`)
- Word count estimation: Standard approximation (150 words/minute for narration)

---

## Phase 0 Summary

**Decisions Made**:
1. ✅ OpenRouter API integration via server-side proxy pattern
2. ✅ Supabase multi-table schema with foreign keys and RLS
3. ✅ NLP-based scene splitting with greedy merge algorithm

**Technology Stack Confirmed**:
- Frontend: React 19.1 + Material-UI + TanStack Query + React Router
- Backend: Express + TypeScript + Zod + Supabase Client
- Database: Supabase PostgreSQL with RLS
- LLM: OpenRouter (configurable model)
- Testing: Vitest + Playwright + Nock (contract tests)

**Next Phase (Phase 1: Design & Contracts)**:
1. Generate `data-model.md` (detailed entity relationships and validation rules)
2. Generate API contracts (`contracts/openapi.yaml`, `contracts/postman-collection.json`)
3. Update agent context files with new technology stack

**Outstanding Research Items**: None (all Phase 0 research complete)

---

**Research Completed By**: Claude (AI Planning Agent)
**Research Date**: 2026-01-02
**Next Action**: Proceed to Phase 1 (Design & Contracts)
