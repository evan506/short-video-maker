---
work_package_id: "WP05"
subtasks: ["T071", "T072", "T073", "T074", "T075", "T076", "T077", "T078", "T079", "T080", "T081", "T082", "T083", "T084", "T085", "T086", "T087", "T088", "T089", "T090"]
lane: "planned"
title: "Integration, Testing & Polish"
history:
  - timestamp: "2026-01-02T00:00:00Z"
    author: "Claude (AI Task Generation Agent)"
    event: "created"
---

# Work Package: Integration, Testing & Polish

**ID**: WP05
**Title**: Integration, Testing & Polish
**Priority**: P1 (Required for feature completion)
**Estimated Subtasks**: 20

## Objective

Integrate all components, write comprehensive tests (unit, integration, contract, E2E), fix bugs, improve accessibility/performance, and prepare for production.

## Context

This work package completes the feature by ensuring all components work together correctly, tests cover critical workflows, UX is polished, and code is production-ready.

**Key Requirements from Spec**:
- All functional requirements (FR-001 to FR-063)
- All success criteria (SC-001 to SC-010)
- Test-driven quality (Constitution principle III)

**Key Documents**:
- Spec: `kitty-specs/001-script-storyboard-editor/spec.md` (Success Criteria)
- Plan: `kitty-specs/001-script-storyboard-editor/plan.md` (Testing strategy)
- Quickstart: `kitty-specs/001-script-storyboard-editor/quickstart.md` (to be completed)

## Subtasks (Summarized)

**T071-T075**: Unit/Integration/Contract Tests
- T071: Unit tests for scene-utils.ts (splitting, merging, keyword extraction)
- T072: Unit tests for script-service.ts (versioning logic)
- T073: Integration tests for script generation API (mocked OpenRouter)
- T074: Integration tests for scene generation API
- T075: Contract tests for OpenRouter API (mock with Nock)

**T076-T080**: E2E & Security Tests
- T076: E2E test for happy path (topic → script → storyboard → edit scenes)
- T077: E2E test for script quick-edit flow
- T078: E2E test for scene reordering
- T079: E2E test for project reload and persistence
- T080: RLS policy testing with multiple user accounts

**T081-T086**: Polish & Optimization
- T081: Fix critical bugs found during testing
- T082: Add loading states for all async operations
- T083: Add error boundaries and graceful error handling
- T084: Improve accessibility (ARIA labels, keyboard navigation, screen reader)
- T085: Add responsive design tweaks (mobile layout)
- T086: Performance optimization (lazy loading, code splitting, query optimization)

**T087-T090**: Documentation & Handoff
- T087: Update quickstart.md with developer onboarding
- T088: Verify API contracts match implementation (OpenAPI validation)
- T089: Clean up console logs and debug statements
- T090: Final code review and refactoring

## Implementation Notes

**Unit Tests** (T071-T072):
- Use Vitest for unit testing
- Test scene splitting: scripts with 15s, 30s, 60s durations, verify scene count and durations
- Test scene merging: edge cases (1 scene, 25 scenes), verify auto-merge to ≤20
- Test script versioning: increment, restore, source tracking

**Integration Tests** (T073-T074):
- Use Supabase test database (separate from dev)
- Seed test data before each test, reset after
- Test script generation with mocked OpenRouter (Nock)
- Test scene generation with real script data

**Contract Tests** (T075):
- Mock OpenRouter API with Nock
- Verify request format (headers, body structure, model parameter)
- Verify response parsing and error handling
- No real API calls in CI/CD

**E2E Tests** (T076-T079):
- Use Playwright with dedicated test account
- Test happy path: create project → generate script → generate scenes → edit scene → reload → verify persistence
- Test quick-edit flow: generate script → click Shorten → apply → verify new version created
- Test scene reordering: drag scene to new position → reload → verify order persists
- Test persistence: create project → close browser → reopen → verify all data present

**RLS Testing** (T080):
- Create two test users (userA@example.com, userB@example.com)
- User A creates project, verify user B cannot access (SELECT/UPDATE/DELETE)
- Test all tables: projects, scripts, scenes

**Accessibility** (T084):
- Add ARIA labels to all interactive elements (buttons, inputs, dialogs)
- Test keyboard navigation (Tab, Enter, Escape, arrow keys)
- Test screen reader (VoiceOver/NVDA) compatibility
- Ensure color contrast ratios meet WCAG AA standards
- Add focus indicators to all interactive elements

**Performance** (T086):
- Use React.lazy() for code splitting editor pages
- Lazy-load images and components
- Optimize database queries (add indexes, avoid N+1 queries)
- Use TanStack Query caching effectively
- Monitor bundle size (use webpack-bundle-analyzer)

**Documentation** (T087):
- Update quickstart.md with:
  - Local setup steps (Supabase, environment variables)
  - How to run migrations (`supabase db reset`)
  - How to run tests (`npm test`, `npm run test:e2e`)
  - How to start dev servers (`npm run dev`)
  - Troubleshooting common issues

**Code Review** (T090):
- Check TypeScript strict mode compliance
- Run ESLint and fix warnings
- Format code with Prettier
- Remove console.log statements
- Add proper logging (winston or pino) if needed
- Refactor complex functions, add comments for clarity

## Test Strategy

**Test Coverage Goals**:
- Unit tests: 80%+ coverage for business logic (scene-utils, script-service, llm-service)
- Integration tests: All API endpoints tested
- Contract tests: OpenRouter API fully mocked
- E2E tests: Critical user journeys covered
- RLS tests: All tables tested with multiple users

**Test Execution**:
- Run unit tests in PR: `npm test`
- Run integration tests in PR: `npm run test:integration`
- Run E2E tests before merge: `npm run test:e2e`
- Run contract tests in CI: `npm run test:contract`

## Definition of Done

- [ ] All unit tests pass (scene-utils, script-service, llm-service)
- [ ] All integration tests pass (script generation, scene generation)
- [ ] All contract tests pass (OpenRouter API)
- [ ] All E2E tests pass (happy path, quick-edit, reorder, persistence)
- [ ] RLS policies tested and enforced
- [ ] Critical bugs fixed
- [ ] Loading states for all async operations
- [ ] Error boundaries implemented
- [ ] Accessibility improvements (ARIA labels, keyboard nav)
- [ ] Responsive design works on mobile (375px width)
- [ ] Performance optimizations (lazy loading, code splitting)
- [ ] quickstart.md updated with setup instructions
- [ ] API contracts validated against implementation
- [ ] Console logs cleaned up
- [ ] Code review completed, no outstanding issues
- [ ] TypeScript strict mode compliance
- [ ] ESLint warnings resolved
- [ ] Code formatted with Prettier
- [ ] Success criteria SC-001 to SC-010 met

## Risks

1. **E2E test flakiness**: Add proper waits and assertions, avoid hard-coded delays.
2. **OpenRouter contract test failures**: API may change, update mocks accordingly.
3. **RLS policy vulnerabilities**: Test thoroughly with multiple users before production.
4. **Performance issues**: Bundle size, query optimization may require architecture changes.
5. **Browser compatibility**: Test on Chrome, Firefox, Safari, Edge.

## Reviewer Guidance

Verify:
1. All tests pass (unit, integration, contract, E2E)
2. Test coverage is adequate (80%+ for business logic)
3. E2E tests cover critical user journeys
4. RLS policies prevent cross-user data access
5. Loading states display for all async operations
6. Error boundaries catch and display errors gracefully
7. Keyboard navigation works (Tab, Enter, Escape)
8. Screen reader announces actions correctly
9. Mobile layout works (375px width)
10. Page load time <2 seconds for editor pages
11. quickstart.md is clear and complete
12. OpenAPI spec matches implementation
13. No console errors or warnings
14. Code follows TypeScript strict mode
15. ESLint and Prettier rules applied
16. Success criteria SC-001 to SC-010 verified

**Integration Check**: After WP5 is complete, feature should be:
- Fully integrated (script → storyboard → editing → persistence)
- Comprehensively tested (unit, integration, E2E, security)
- Production-ready (accessibility, performance, error handling)
- Well-documented (quickstart.md, API contracts)
- Bug-free and polished (UX refined, code clean)
