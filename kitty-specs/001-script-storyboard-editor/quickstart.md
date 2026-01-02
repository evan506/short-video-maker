# Quickstart Guide: Script & Storyboard Editor

**Feature**: 001-script-storyboard-editor
**Phase**: 1 (Design & Contracts)
**Audience**: Developers joining this project
**Last Updated**: 2026-01-02

## Overview

This guide helps you get started with developing and testing the Script & Storyboard Editor feature.

## Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase CLI (`npm install -g supabase`)
- Docker Desktop (for local Supabase)
- Git

## Local Development Setup

### 1. Install Dependencies

```bash
# From worktree root
pnpm install
```

### 2. Start Supabase Local Database

```bash
# Start Supabase local instance (Docker)
supabase start

# This will output:
# - API URL: http://localhost:54321
# - DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# - Studio UI: http://localhost:54323
```

### 3. Run Database Migrations

```bash
# Apply all migrations
supabase db reset

# Seed subtitle presets
supabase db seed
```

### 4. Configure Environment Variables

Create `.env.local` in the project root:

```bash
# Supabase
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-anon-key-from-supabase-start
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase-start

# OpenRouter
OPENROUTER_API_KEY=your-openrouter-api-key
DEFAULT_LLM_MODEL=anthropic/claude-3-haiku

# Server
PORT=3000
NODE_ENV=development
```

**Note**: Get the keys from `supabase start` output or `.env.example`.

### 5. Start Development Servers

```bash
# Terminal 1: Backend (Express + TypeScript watch)
pnpm dev

# Terminal 2: Frontend (Vite dev server)
pnpm ui:dev
```

**Access URLs**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Supabase Studio: http://localhost:54323

## Database Schema

### Tables

```sql
-- Projects (root entity)
projects (id, user_id, title, topic, platform, video_type, target_duration, status, ...)

-- Scripts (versioned narration)
scripts (id, project_id, version, content, source, created_at)

-- Scenes (storyboard scenes)
scenes (id, project_id, order_index, narration_text, duration_sec_draft, primary_keyword, ...)

-- Subtitle presets (reference data)
subtitle_presets (id, name, description, config)
```

### Key Relationships

- `projects.user_id` → `auth.users(id)` (Supabase Auth)
- `scripts.project_id` → `projects(id)` (CASCADE DELETE)
- `scenes.project_id` → `projects(id)` (CASCADE DELETE)
- `scenes.subtitle_style_preset_id` → `subtitle_presets(id)`

### Row Level Security (RLS)

All tables have RLS policies: `user_id = auth.uid()`

## Testing

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Watch mode
pnpm test --watch

# Coverage
pnpm test --coverage
```

### Integration Tests

```bash
# Requires running Supabase local instance
supabase start  # If not already running
pnpm test tests/integration
```

### E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
pnpm test tests/e2e

# Run with UI
npx playwright test --ui
```

### Test Users

E2E tests use a dedicated test account (configured via `.env.test`):

```bash
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
```

## API Usage

### Authentication

All API requests require Supabase Auth JWT token:

```bash
# Login via Supabase Auth
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Use returned token in subsequent requests
curl -X GET http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example Workflows

#### 1. Create Project and Generate Script

```bash
# 1. Create project
PROJECT_RESPONSE=$(curl -X POST http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "AI productivity tips for remote workers",
    "platform": "shorts",
    "video_type": "Explainer",
    "target_duration": 30
  }')

PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r '.id')

# 2. Generate script
curl -X POST http://localhost:3000/api/v1/projects/$PROJECT_ID/scripts/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

#### 2. Quick-Edit Script

```bash
# Shorten script
curl -X POST http://localhost:3000/api/v1/scripts/$SCRIPT_ID/edit/shorten \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Apply preview
curl -X POST http://localhost:3000/api/v1/scripts/$SCRIPT_ID/apply-preview \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"preview_content": "Shortened script here..."}'
```

#### 3. Generate and Edit Scenes

```bash
# 1. Generate scenes from script
curl -X POST http://localhost:3000/api/v1/projects/$PROJECT_ID/scenes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# 2. Update scene duration
curl -X PATCH http://localhost:3000/api/v1/scenes/$SCENE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"duration_sec_draft": 5}'

# 3. Reorder scenes
curl -X POST http://localhost:3000/api/v1/projects/$PROJECT_ID/scenes/reorder \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scene_ids": ["scene-3", "scene-1", "scene-2"]}'
```

## Frontend Development

### Adding New Editor Routes

```typescript
// src/ui/App.tsx
import { createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter([
  // ... existing routes
  {
    path: '/editor/new',
    element: <EditorNew />,
  },
  {
    path: '/editor/:projectId',
    element: <EditorProject />,
  },
]);
```

### Using TanStack Query

```typescript
// src/ui/hooks/use-project.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetch(`/api/v1/projects/${projectId}`).then(r => r.json()),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: Partial<Project> }) =>
      fetch(`/api/v1/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['project', variables.projectId], data);
    },
  });
}
```

## Backend Development

### Adding New API Endpoints

```typescript
// src/server/routers/rest.ts (extend existing router)
import express from 'express';
import { z } from 'zod';

const router = express.Router();

// Validation schema
const createProjectSchema = z.object({
  topic: z.string().min(10).max(500),
  platform: z.enum(['shorts', 'tiktok', 'reels']),
  // ...
});

// Endpoint
router.post('/projects', async (req, res) => {
  const validatedData = createProjectSchema.parse(req.body);
  // ... implementation
  res.status(201).json(project);
});
```

### Using Supabase Client

```typescript
// src/server/services/project-service.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function createProject(userId: string, data: CreateProjectInput) {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      title: data.topic.slice(0, 50), // Auto-generate title
      ...data,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

## Troubleshooting

### Common Issues

**Issue**: Supabase migrations fail
```bash
# Reset database completely
supabase db reset --debug
```

**Issue**: OpenRouter API timeout
- Check `OPENROUTER_API_KEY` in `.env.local`
- Try shorter topic text
- Check network connectivity to openrouter.ai

**Issue**: RLS policies blocking access
- Verify user is authenticated: `auth.uid()` returns user ID
- Check `user_id` matches `auth.uid()` in policy
- Use Supabase Studio to inspect RLS policy results

**Issue**: Scene generation creates too many scenes
- Scene splitting algorithm auto-merges if > 20 scenes
- Check scene duration estimation (WORDS_PER_SECOND constant)
- Adjust density preset in service configuration

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* pnpm dev

# Supabase logs
supabase logs

# Check database
supabase db studio  # Opens Studio UI
```

## Useful Commands

```bash
# Database
supabase start              # Start local Supabase
supabase stop               # Stop local Supabase
supabase db reset           # Reset database
supabase db studio          # Open Studio UI
supabase migration new create_projects_table  # New migration

# Development
pnpm dev                    # Start backend dev server
pnpm ui:dev                 # Start frontend dev server
pnpm build                  # Build for production
pnpm test                   # Run tests

# Git
git status                  # Check worktree status
git checkout main           # Switch to main branch
cd ../.worktrees/001-*      # Navigate to worktree
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/server/routers/rest.ts` | API endpoints (extend with `/api/v1/*`) |
| `src/server/services/llm-service.ts` | OpenRouter integration |
| `src/server/services/scene-service.ts` | Scene splitting/merging logic |
| `src/ui/pages/EditorNew.tsx` | Create project page |
| `src/ui/pages/EditorProject.tsx` | Edit project page |
| `src/ui/components/editor/ScriptEditor.tsx` | Script generation + quick edit |
| `src/ui/components/editor/StoryboardView.tsx` | Scene cards grid/list |
| `src/types/editor.ts` | TypeScript types for editor domain |
| `supabase/migrations/*.sql` | Database schema migrations |

## Next Steps

1. ✅ Read [spec.md](./spec.md) for feature requirements
2. ✅ Read [plan.md](./plan.md) for implementation plan
3. ✅ Read [research.md](./research.md) for technical decisions
4. ✅ Read [data-model.md](./data-model.md) for database schema
5. ✅ Import [contracts/postman-collection.json](./contracts/postman-collection.json) into Postman
6. ⏭️ Start implementing tasks (run `/spec-kitty.tasks` to generate work packages)

## Support

- **Spec questions**: See [spec.md](./spec.md)
- **Database issues**: Check [data-model.md](./data-model.md)
- **API contract**: See [contracts/openapi.yaml](./contracts/openapi.yaml)
- **Constitution**: See `.kittify/memory/constitution.md`

---

**Happy coding!** 🚀
