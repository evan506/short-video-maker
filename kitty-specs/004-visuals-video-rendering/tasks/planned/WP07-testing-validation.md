# Work Package: WP07 - Testing & Validation

**Work Package ID**: WP07
**Feature**: 004-visuals-video-rendering
**Status**: planned
**Created**: 2026-01-08

---

## Objective

Write comprehensive tests (unit, integration, E2E) and validate performance benchmarks from success criteria (SC-001 to SC-010).

**Subtasks**:
- T071: Write unit tests for render service (job creation, snapshot capture)
- T072: Write unit tests for Google Cloud TTS service (timing parser, fallback)
- T073: Write unit tests for Remotion subtitle components
- T074: Write integration tests for render job flow (create → poll → complete)
- T075: Write Playwright E2E test for render workflow
- T076: Validate performance benchmarks (SC-001 to SC-010)
- T077: Test quickstart.md scenarios (8 validation scenarios)
- T078: Load test worker with 5 concurrent renders
- T079: Test retry from failed step logic
- T080: Document test results and performance metrics

---

## Context

Comprehensive testing ensures quality and validates performance targets. All 10 success criteria must be met before release.

**Performance Benchmarks**:
- SC-001: Job creation <2 seconds
- SC-002: Worker pickup <10 seconds
- SC-003: Progress UI updates <3 seconds
- SC-004: Render 60s video <120 seconds
- SC-005: MP4 upload success >99%
- SC-006: Download link generation <500ms
- SC-007: Karaoke sync ±100ms accuracy
- SC-008: Retry from failed step works
- SC-009: Stalled job reaper accurate (>15 min)
- SC-010: Single worker handles 5 concurrent renders

---

## Subtask Guidance

### T071-T073: Unit Tests
Test render service, Google Cloud TTS service, and Remotion components with mocked dependencies.

### T074-T075: Integration & E2E Tests
Test full render job flow: create job via API, poll status, verify completion. Write Playwright test for UI workflow.

### T076-T077: Performance & Scenario Validation
Measure each benchmark with console.time. Test all 8 quickstart scenarios from quickstart.md.

### T078-T080: Load Testing & Documentation
Submit 5 concurrent renders, verify all complete. Test retry logic. Document results in checklists/testing-results.md.

---

## Definition of Done

- [ ] Unit tests pass (>80% coverage)
- [ ] Integration tests cover full render job flow
- [ ] E2E test passes consistently
- [ ] All 10 performance benchmarks met
- [ ] All 8 quickstart scenarios pass
- [ ] Load test verifies 5 concurrent renders
- [ ] Test results documented

---

## Risks

**Risk**: Benchmarks not met → Optimize Remotion components or increase worker resources
**Risk**: Tests flaky due to timing → Add explicit waits and retries
**Risk**: TTS quota exceeded → Use mock responses for unit tests
