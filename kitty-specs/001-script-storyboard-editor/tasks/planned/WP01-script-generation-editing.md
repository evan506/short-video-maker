---
work_package_id: "WP01"
subtasks: ["T011", "T012", "T013", "T014", "T015", "T016", "T017", "T018", "T019", "T020", "T021", "T022", "T023", "T024", "T025", "T026", "T027"]
lane: "planned"
title: "Script Generation & Editing"
history:
  - timestamp: "2026-01-02T00:00:00Z"
    author: "Claude (AI Task Generation Agent)"
    event: "created"
---

# Work Package: Script Generation & Editing

**ID**: WP01
**Title**: Script Generation & Editing (User Story 1 & 2)
**Priority**: P1 (Core value proposition #1)
**Estimated Subtasks**: 17

## Objective

Enable creators to generate video scripts from simple topic descriptions using LLM (OpenRouter), and provide quick-edit tools (Shorten, Lengthen, Rephrase, Change Tone) to rapidly refine scripts with version tracking.

## Context

This work package implements the core script generation and editing functionality, which is the foundation for all video creation workflows. Users enter a topic with configuration (platform, duration, video type), and the system generates a complete narration script optimized for their chosen format. Quick-edit tools allow rapid iteration without manual rewriting.

**Key Requirements from Spec**:
- FR-001 to FR-021: Script generation and editing functional requirements
- User Story 1: Topic to script generation in <60 seconds
- User Story 2: Quick-edit tools with version tracking
- Success Criteria SC-001, SC-002, SC-003

**Key Documents**:
- Spec: `kitty-specs/001-script-storyboard-editor/spec.md` (User Stories 1 & 2, FR-001 to FR-021)
- Research: `kitty-specs/001-script-storyboard-editor/research.md` (OpenRouter integration)
- Data Model: `kitty-specs/001-script-storyboard-editor/data-model.md` (Script entity)
- API Contracts: `kitty-specs/001-script-storyboard-editor/contracts/openapi.yaml`

## Subtasks

### T011: Create `src/server/services/llm-service.ts` with OpenRouter API integration

**File**: `src/server/services/llm-service.ts`

**Actions**:
1. Create new file `src/server/services/llm-service.ts`
2. Implement OpenRouter API client:
   - Base URL: `https://openrouter.ai/api/v1/chat/completions`
   - Auth: `Authorization: Bearer ${process.env.OPENROUTER_API_KEY}`
   - Model: `process.env.DEFAULT_LLM_MODEL || 'openai/gpt-4-turbo'`
3. Implement retry logic with exponential backoff (3 attempts: 1s, 2s, 4s delays)
4. Implement timeout using AbortController (60 seconds)
5. Implement error handling:
   - Network errors: retry with backoff
   - API errors (4xx, 5xx): return user-friendly message
   - Timeout: return "Generation timed out. Please retry or try a shorter topic."
6. Add cost/token logging if available from API response
7. Export functions: `generateScript()`, `shortenScript()`, `lengthenScript()`, `rephraseScript()`, `changeTone()`

**Validation**:
- API client successfully calls OpenRouter
- Retry logic works on failure
- Timeout aborts request after 60s
- Error messages are user-friendly

---

### T012: Implement script generation prompt template

**Actions**:
1. Design prompt template for topic → script generation:
   - Include context: platform (shorts/tiktok/reels), target duration (15/30/60s), video type (Explainer/Marketing/Tutorial/Recipe/Story)
   - Include instructions: "Generate a narration script for a [DURATION] second [VIDEO_TYPE] video for [PLATFORM]. Topic: [TOPIC]. Script should be engaging, concise, and optimized for the target platform."
   - Include output format: "Return the script as plain text without markdown formatting or section headers."
2. Add validation: generated script must be ≥50 characters
3. Store prompt template as constant string or template function
4. Test with various topic/duration/type combinations

**Validation**:
- Generated scripts match target duration (word count estimation: 2.5 words/second)
- Scripts are appropriate for video type (e.g., Tutorial includes steps, Story has narrative)
- No markdown formatting in output

---

### T013: Implement prompt templates for quick-edit operations

**Actions**:
1. Create prompt templates for each quick-edit operation:
   - **Shorten**: "Condense this script to 70% of its original length while preserving key points and main ideas. Keep the most important information. Script: [SCRIPT]"
   - **Lengthen**: "Expand this script to 130% of its original length by adding more detail, examples, and elaboration. Maintain the original structure. Script: [SCRIPT]"
   - **Rephrase**: "Rewrite this script in more natural, conversational language while keeping the same meaning and key points. Script: [SCRIPT]"
   - **Change Tone**: "Rewrite this script in a [TONE] style. [TONE] characteristics: [DESCRIPTION]. Script: [SCRIPT]" (tone options: Casual, Professional, Funny, Inspirational)
2. Each template should return plain text script without formatting
3. Test with sample scripts and verify output quality

**Validation**:
- Shortened scripts are ~70% of original length
- Lengthened scripts are ~130% of original length
- Rephrased scripts have different wording but same meaning
- Tone changes reflect requested style (Casual: slang/informal, Professional: formal language, Funny: humor/jokes, Inspirational: motivational)

---

### T014: Create `POST /api/v1/editor/projects/:projectId/scripts/generate` endpoint

**File**: `src/server/routers/rest.ts` or `src/server/routers/editor-router.ts`

**Actions**:
1. Implement route handler for script generation
2. Validate project exists and belongs to authenticated user (check `project.user_id === req.user.id`)
3. Validate `project.current_script_version` is null or update existing (allow regeneration)
4. Call `llmService.generateScript()` with project topic, platform, duration, type
5. Save generated script to database:
   - Create new script record with `project_id`, `version=1` (or increment if exists), `content`, `source='llm'`
   - Update `project.current_script_version` to new version number
6. Return created script with 201 status
7. Handle errors: LLM timeout, API errors, validation errors

**Validation**:
- Endpoint creates script record in database
- `project.current_script_version` is updated
- Script source is 'llm'
- Error handling returns user-friendly messages

---

### T015: Create `POST /api/v1/editor/scripts/:scriptId/edit/{operation}` endpoints

**Files**: `src/server/routers/editor-router.ts`

**Actions**:
1. Implement 4 endpoints: `/edit/shorten`, `/edit/lengthen`, `/edit/rephrase`, `/edit/tone`
2. Each endpoint:
   - Validate script exists and user has access (via project ownership)
   - Call appropriate LLM service function: `shortenScript()`, `lengthenScript()`, `rephraseScript()`, `changeTone()`
   - Generate preview version (do not save yet)
   - Return preview with 200 status: `{ previewContent: string, operation: string }`
3. For `/edit/tone`, accept request body: `{ tone: 'Casual' | 'Professional' | 'Funny' | 'Inspirational' }`
4. Add Zod validation for tone parameter

**Validation**:
- Each endpoint returns preview content
- Preview is not saved to database
- Tone parameter validated (enum)
- Error handling for LLM failures

---

### T016: Create `POST /api/v1/editor/scripts` endpoint (manual save/new version)

**File**: `src/server/routers/editor-router.ts`

**Actions**:
1. Implement endpoint for creating new script version
2. Accept request body: `{ project_id, content, source }`
3. Validate with Zod schema (`createScriptSchema`)
4. Determine next version number: `max(existing versions) + 1`
5. Create script record with calculated version, provided content, source ('user' for manual edits)
6. Update `project.current_script_version` to new version
7. Return created script with 201 status

**Validation**:
- Version number increments correctly
- Manual edits have source='user'
- `project.current_script_version` updated
- Validation ensures content ≥50 characters

---

### T017: Create `GET /api/v1/editor/projects/:projectId/scripts` endpoint

**File**: `src/server/routers/editor-router.ts`

**Actions**:
1. Implement endpoint to list all script versions for a project
2. Validate project exists and user has access
3. Query scripts table: `SELECT * FROM scripts WHERE project_id = $1 ORDER BY version DESC`
4. Return array of scripts with 200 status
5. Include version metadata: version, source, created_at

**Validation**:
- Returns all script versions for project
- Sorted by version DESC (latest first)
- Only returns scripts for user's own projects

---

### T018: Create `POST /api/v1/editor/scripts/:scriptId/restore` endpoint

**File**: `src/server/routers/editor-router.ts`

**Actions**:
1. Implement endpoint to restore a previous script version
2. Validate script exists and user has access
3. Get script content and project_id from target version
4. Create new script version with restored content:
   - Copy content from target version
   - Set source='user' (restoration is a user action)
   - Calculate new version number: `max(existing) + 1`
5. Update `project.current_script_version` to new version
6. Return created script with 201 status

**Validation**:
- Creates new version (does not overwrite)
- Restored content matches target version
- Source is 'user'
- Original version remains in history

---

### T019: Create `src/ui/components/editor/ScriptEditor.tsx` component

**File**: `src/ui/components/editor/ScriptEditor.tsx`

**Actions**:
1. Create new component `ScriptEditor.tsx`
2. Implement tabbed interface:
   - Tab 1: "Topic Input" - form to enter topic and select options
   - Tab 2: "Script Editor" - display generated script with quick-edit tools
3. Topic Input tab:
   - TextField for topic (multiline, min 10 chars, max 500 chars)
   - Select for platform (shorts/tiktok/reels)
   - Select for duration (15/30/60 seconds)
   - Select for video type (Explainer/Marketing/Tutorial/Recipe/Story)
   - "Generate Script" button (LoadingButton with spinner)
4. Script Editor tab:
   - Textarea to display/edit script content (read-only when viewing LLM version, editable when user manually edits)
   - Quick-edit buttons: "Shorten", "Lengthen", "Rephrase", "Change Tone" dropdown
   - "Save as New Version" button for manual edits
   - Version history sidebar (list all versions with timestamps and source badges)
   - "Go to Storyboard" CTA button (enabled when script exists)
5. Use Material-UI components (TextField, Select, Button, Dialog, LoadingButton)
6. Implement state management with React hooks (useState for form fields, UI state)

**Validation**:
- Component renders without errors
- Form validation works (topic min length, required fields)
- Buttons enable/disable appropriately
- Layout is responsive

---

### T020: Implement topic input form with selectors

**Actions**:
1. In ScriptEditor component, implement topic input form
2. Add validation:
   - Topic: required, min 10 chars, max 500 chars
   - Platform: required, enum values
   - Duration: required, enum [15, 30, 60]
   - Video type: required, enum values
3. Display inline validation errors (e.g., "Topic must be at least 10 characters")
4. "Generate Script" button disabled when form is invalid
5. On submit, call `generateScript(projectId, topic, platform, duration, videoType)`

**Validation**:
- Validation prevents invalid form submission
- Error messages clear and helpful
- Button state updates correctly (disabled/enabled)

---

### T021: Implement script display area with version history sidebar

**Actions**:
1. In ScriptEditor component, create script display area:
   - Large textarea or div to display current script content
   - Show metadata: version number, source (llm/user badge), created timestamp
2. Create version history sidebar:
   - List all script versions (from `getScripts` API)
   - Show version number, source badge, created date, first 50 chars of content
   - Highlight active version (matches `project.current_script_version`)
   - Click to restore version (calls restore endpoint)
3. Add "Version History" toggle button to show/hide sidebar

**Validation**:
- All versions displayed in correct order (newest first)
- Active version highlighted
- Clicking version restores it (creates new version with restored content)
- Sidebar toggle works

---

### T022: Implement quick-edit buttons with preview modal

**Actions**:
1. Add quick-edit buttons to ScriptEditor:
   - "Shorten" button
   - "Lengthen" button
   - "Rephrase" button
   - "Change Tone" dropdown with options: Casual, Professional, Funny, Inspirational
2. On button click:
   - Call appropriate quick-edit endpoint (T015)
   - Show loading spinner during LLM call
   - Display preview modal with generated content
3. Preview modal:
   - Show side-by-side comparison: original content vs. preview content
   - "Apply" button: saves new version (T016)
   - "Cancel" button: discards preview
   - "Regenerate" button: call LLM again (in case of poor output)
4. Use Material-UI Dialog component for modal

**Validation**:
- Quick-edit endpoints called correctly
- Preview modal displays both versions
- Apply saves new version
- Cancel discards preview
- Regenerate calls LLM again

---

### T023: Implement manual script editing textarea

**Actions**:
1. Add editable mode to script display textarea
2. Add "Edit" button to enable editing (changes textarea from read-only to editable)
3. Add "Save as New Version" button (visible when editing)
4. On save:
   - Validate content ≥50 characters
   - Call `createScript` endpoint with `source='user'`
   - Update current script display
   - Disable editing mode
5. Add "Cancel" button to discard changes
6. Show character count and validation errors

**Validation**:
- Textarea toggles between read-only and editable
- Save creates new version with source='user'
- Validation prevents saving short content (<50 chars)
- Cancel reverts to original content

---

### T024: Implement loading states for LLM operations

**Actions**:
1. Add loading indicators for all async operations:
   - Script generation: show CircularProgress or LoadingButton spinner
   - Quick-edit operations: show spinner on button
   - Script saving: show "Saving..." text
2. Add progress text: "Generating script...", "Shortening script...", "Saving version..."
3. Disable buttons during loading (prevent duplicate requests)
4. Show loading overlay or skeleton for script display area

**Validation**:
- Loading states visible to user
- Buttons disabled during API calls
- Progress text is descriptive
- No UI freezes or hangs

---

### T025: Implement error handling with retry buttons

**Actions**:
1. Add error handling for all LLM operations:
   - Catch API errors and display user-friendly messages
   - Show error message in red or with error icon
   - Add "Retry" button to retry failed operation
   - Add "Cancel" button to dismiss error
2. Handle specific errors:
   - Timeout: "Generation timed out. Please retry or try a shorter topic."
   - API error: "Failed to generate script. Please try again."
   - Validation error: "Topic must be at least 10 characters."
3. Use Material-UI Alert or Snackbar for error display
4. Log errors to console for debugging (with structured logging)

**Validation**:
- Error messages clear and actionable
- Retry button repeats failed operation
- Cancel button dismisses error
- Errors logged for debugging

---

### T026: Create `src/ui/hooks/use-script.ts` for script CRUD operations

**File**: `src/ui/hooks/use-script.ts`

**Actions**:
1. Create custom hook `use-script.ts`
2. Use TanStack Query (useMutation, useQuery):
   - `useGenerateScript()`: mutation for script generation
   - `useQuickEdit()`: mutation for quick-edit operations
   - `useCreateScript()`: mutation for manual script save
   - `useRestoreScript()`: mutation for version restoration
   - `useScripts(projectId)`: query to fetch all script versions
3. Implement optimistic updates where appropriate (e.g., update cache immediately on save)
4. Handle loading, error, and success states
5. Return hook object with: `{ data, isLoading, error, generateScript, quickEdit, createScript, restoreScript }`

**Validation**:
- Hook provides all script CRUD operations
- TanStack Query cache manages server state
- Optimistic updates improve perceived performance
- Loading/error states accessible from hook

---

### T027: Add "Go to Storyboard" CTA button

**Actions**:
1. In ScriptEditor component, add "Go to Storyboard" button
2. Button location: below script display area, prominent style (Material-UI Button with variant="contained", color="primary")
3. Button enabled only when script exists (`project.current_script_version !== null`)
4. On click, navigate to storyboard view: `navigate('/editor/:projectId?tab=storyboard')` or open storyboard tab
5. Add icon (e.g., ArrowForward icon from Material-UI)

**Validation**:
- Button appears when script exists
- Navigation works correctly
- URL updates to include ?tab=storyboard parameter

## Test Strategy

**Manual Testing**:
1. Create project, enter topic, select options, generate script - verify script appears in <60s
2. Apply quick-edit operation (Shorten) - verify preview modal shows, apply saves new version
3. Manually edit script - verify saves as new version with source='user'
4. View version history - verify all versions listed, can restore previous version
5. Test error handling: disconnect network, generate script - verify error message and retry button

**Integration Testing** (if tests implemented):
1. Test script generation with mocked OpenRouter API
2. Test version increment logic
3. Test quick-edit prompt templates
4. Test RLS enforcement (user cannot access another user's scripts)

## Definition of Done

- [ ] All 17 subtasks completed
- [ ] Script generation works end-to-end (topic → LLM → database → UI)
- [ ] Quick-edit operations generate previews and save new versions
- [ ] Manual editing saves new versions with source='user'
- [ ] Version history displays all versions correctly
- [ ] Version restoration creates new version with restored content
- [ ] Loading states display for all async operations
- [ ] Error handling shows user-friendly messages with retry option
- [ ] "Go to Storyboard" button navigates correctly
- [ ] LLM service integrates with OpenRouter API
- [ ] Retry logic and timeout handling work correctly
- [ ] RLS policies enforced (users can only access own scripts)
- [ ] No TypeScript errors
- [ ] No console errors on frontend

## Risks

1. **OpenRouter API performance**: LLM calls may be slow (>60s). Timeout handling prevents hanging requests.
2. **LLM output quality**: Generated scripts may vary in quality. Provide "Regenerate" option for poor outputs.
3. **Cost management**: OpenRouter charges per token. Monitor usage and implement caching if needed.
4. **Version conflicts**: Concurrent edits may cause version conflicts. Consider optimistic locking or last-write-wins.
5. **Prompt injection**: Malicious user input in topic field. Sanitize input and validate length.

## Reviewer Guidance

When reviewing this work package, verify:

1. **OpenRouter integration**: Check API client, retry logic, timeout handling. Test with real API key.
2. **Prompt templates**: Test with various inputs, verify output quality and length targets.
3. **Version management**: Verify version numbers increment correctly, no gaps in sequence.
4. **Quick-edit flow**: Test each operation, verify preview modal, apply/cancel/regenerate work.
5. **Manual editing**: Verify saves new version with source='user', validation works.
6. **Version history**: Check that all versions listed, active version highlighted, restoration works.
7. **Error handling**: Test with network failures, API errors, invalid input. Verify messages are user-friendly.
8. **RLS enforcement**: Test with two users, verify user A cannot access user B's scripts.
9. **UI/UX**: Check loading states, button states, validation messages, layout responsiveness.
10. **Navigation**: Verify "Go to Storyboard" button navigates correctly, URL updates.

**Integration Check**: After WP1 is complete, users should be able to:
- Create a project and generate a script in <60 seconds
- Apply quick-edit operations to refine script
- Manually edit script and save versions
- View version history and restore previous versions
- Navigate to storyboard view
