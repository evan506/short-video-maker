<!--
KO VIEW (Non-SoT)
- Source of Truth: plan.md (English)
- If conflicts exist, English SoT wins.
- Last synced: 2026-01-02
-->

# 구현 계획: Script & Storyboard Editor

**Branch**: `001-script-storyboard-editor` | **Date**: 2026-01-02 | **Spec**: [spec.md](spec.md)
**Input**: `kitty-specs/001-script-storyboard-editor/spec.md`의 기능 명세서

**Note**: 이 계획은 Script & Storyboard Editor 기능의 Phase 1에 대한 구현 접근 방식을 담고 있습니다. 모든 계획 관련 질문은 해결되었으며 아래에 문서화되었습니다.

## 요약 (Summary)

**주요 요구사항 (Primary Requirement)**: 크리에이터가 LLM을 사용하여 주제 설명에서 비디오 스크립트를 생성하고, quick-edit(빠른 편집) 도구로 스크립트를 다듬으며, 세밀한 제어 기능을 통해 스토리보드 장면을 생성/편집할 수 있는 웹 기반 에디터를 구축합니다.

**기술적 접근 (Technical Approach)**:

- **Frontend**: 새로운 `/editor/new` 및 `/editor/:projectId` 라우트(기존 VideoCreator와 분리됨)를 갖춘 React 기반 UI
- **Backend**: 프로젝트, 스크립트, 장면을 위한 `/api/v1/*` 엔드포인트로 기존 Express REST API 확장
- **Data**: SQL 마이그레이션을 통해 관리되는 새로운 스키마를 갖춘 Supabase (PostgreSQL)
- **LLM**: 백엔드 API 엔드포인트를 통한 OpenRouter 통합 (서버 측 API key만 사용)
- **State Management**: 서버 상태를 위한 TanStack Query, 일시적인 UI를 위한 로컬 React state
- **Phase 1 Scope**: 동기식 API (작업 대기열 인프라 없음)

## 기술적 컨텍스트 (Technical Context)

**언어/버전 (Language/Version)**:

- Frontend: TypeScript 5.8+ 및 React 19.1
- Backend: Node.js 및 TypeScript 5.8+, Express 4.18

**주요 의존성 (Primary Dependencies)**:

- Frontend: React 19.1, Material-UI 5.15, TanStack Query 5.18, React Router 7.5, Zod 3.24
- Backend: Express 4.18, Zod 3.24, Supabase JS Client 2.x
- Database: Supabase (PostgreSQL + Auth + RLS)
- LLM: OpenRouter API (env를 통해 모델 구성 가능)

**스토리지 (Storage)**:

- Row Level Security (RLS)가 적용된 Supabase PostgreSQL
- Supabase CLI를 통해 SQL 마이그레이션으로 관리되는 스키마
- 테이블: `projects`, `scripts`, `scenes`, `subtitle_presets` (Phase 1)
- Phase 2를 위해 예약됨: `render_jobs`, `job_steps` (스펙 전용)

**테스트 (Testing)**:

- Unit: 비즈니스 로직을 위한 Vitest
- Integration: Supabase 테스트 데이터베이스를 이용한 API 통합 테스트
- E2E: 전용 테스트 계정(이메일/비밀번호)을 이용한 Playwright
- Contract: Mock OpenRouter API (CI에서 실제 LLM 호출 없음)

**타겟 플랫폼 (Target Platform)**:

- Phase 1: 로컬 개발 + 단일 서버 배포
- Frontend: Vite 개발 서버 (localhost:5173)
- Backend: Express 서버 (localhost:3000)

**프로젝트 유형 (Project Type)**: 웹 애플리케이션 (공유 TypeScript를 사용하는 모노레포)

**성능 목표 (Performance Goals)**:

- 스크립트 생성: 하드 타임아웃 60초 (FR-008). 스크립트 생성 및 quick-edit에 대한 지연 시간 지표(p50/p90) 기록; UI는 즉각적인 로딩 피드백을 보여주어야 함
- 장면 생성: 일반적인 60초 비디오의 경우 5초 미만
- API 응답: CRUD 작업의 경우 500ms 미만
- 페이지 로드: 에디터 페이지의 경우 2초 미만

**제약 사항 (Constraints)**:

- 최대 비디오 길이: 60초 (숏폼 콘텐츠)
- 장면 수 목표: 10-15개 장면 (20개 초과 시 자동 병합)
- 스크립트 생성 타임아웃: 60초
- LLM API 비용: 구성 가능한 모델 선택, env var를 통한 기본값 설정

**규모/범위 (Scale/Scope)**:

- Phase 1: 단일 서버 배포
- 동시 사용자: 서버 리소스에 의해 제한됨 (수평적 확장 없음)
- 데이터 볼륨: RLS 격리가 적용된 사용자 소유 프로젝트
- 스크립트 버전: 프로젝트별 이력 (무제한 버전)

## 헌법 점검 (Constitution Check)

_GATE: Phase 0 조사 전에 반드시 통과해야 함. Phase 1 설계 후 재확인됨._

### I. 사용자 경험 우선 (User Experience First)

**상태**: ✅ PASS

**준수 사항**:

- 모든 LLM 작업은 로딩 표시기를 보여줌 (FR-007, FR-010-013)
- 실패한 작업은 Retry 버튼과 함께 사용자 친화적인 에러 메시지를 표시함 (FR-008, FR-009)
- 장면 편집은 즉각적인 시각적 확인을 제공함 (FR-046)
- 명확한 복구 작업(FR-033, FR-034)과 함께 스크립트 버전 불일치 경고 제공 (FR-032)

**구현 노트**:

- Phase 1: 로딩 스피너가 있는 동기식 API 호출
- Phase 2: 비동기 작업 대기열을 위한 진행 상황 추적 (설계되었으나 구현되지 않음)

### II. 스냅샷 기반 일관성 (Snapshot-Based Consistency)

**상태**: ✅ PASS

**준수 사항**:

- 스크립트는 증가하는 정수로 버전 관리됨 (FR-016, FR-019)
- 장면은 생성 시점에 `storyboard_script_version`을 참조함 (FR-024)
- 버전 불일치 감지 시 사용자에게 경고함 (FR-032)
- 명시적인 "Regenerate scenes" 작업이 필요함 (FR-033)

**구현 노트**:

- `projects.storyboard_script_version`은 현재 장면을 생성한 스크립트 버전을 추적함
- `projects.current_script_version`은 최신 스크립트 버전을 추적함
- 불일치 시 "Regenerate" 대 "Keep existing" 옵션이 있는 경고 배너를 트리거함

### III. 테스트 주도 품질 (Test-Driven Quality)

**상태**: ✅ PASS

**준수 사항**:

- OpenRouter API에 대한 Contract 테스트 (CI에서 mock 처리됨)
- 중요 여정(주제 → 스크립트 → 스토리보드)에 대한 통합 테스트
- 비즈니스 로직(장면 분할, 길이 계산, 키워드 생성)에 대한 단위 테스트
- CI/CD 파이프라인에서 테스트 실행

**구현 노트**:

- Contract 테스트를 위해 Nock을 사용하여 OpenRouter를 mock 처리
- 통합 테스트를 위한 Supabase 테스트 데이터베이스
- 전용 테스트 계정을 사용한 Playwright E2E 테스트

### IV. 비동기 작업 탄력성 (Async Job Resilience)

**상태**: ⚠️ PHASE 2 ONLY (스펙 완료)

**준수 사항**:

- Phase 1: 동기식 API만 존재 (작업 대기열 없음)
- Phase 2: 스펙에 정의된 작업 상태 모델 (FR-056 ~ FR-063)
- 미래의 비동기 작업을 지원하도록 설계된 데이터 모델

**구현 노트**:

- FR-056–FR-063은 Phase 2를 위한 문서 전용 상태 모델입니다; Phase 1은 작업 대기열/워커 인프라를 구현하지 않습니다.
- `render_jobs` 및 `job_steps` 테이블은 설계되었으나 Phase 1에서 생성되지 않음
- 스펙에 문서화된 상태 전이 규칙 (queued → running → succeeded/failed/canceled)
- Phase 1 구현은 스크립트/스토리보드 편집에 중점을 둠 (렌더링 없음)

### V. 미디어 소스 유연성 (Media Source Flexibility)

**상태**: ⚠️ OUT OF SCOPE (Phase 1)

**준수 사항**:

- Phase 1: 키워드 필드만 존재 (미디어 가져오기 없음)
- Phase 2: Pexels/Pixabay 통합 계획됨
- 미래의 `media_assets` 테이블을 지원하는 데이터 모델

**구현 노트**:

- `scenes.primary_keyword`는 미래의 미디어 매칭을 위한 검색어를 저장함
- Phase 1에는 미디어 API 통합 없음
- Phase 2에 사용자 업로드 기능 계획됨

### VI. 음성 선택 및 미리보기 (Voice Selection & Preview)

**상태**: ⚠️ OUT OF SCOPE (Phase 1)

**준수 사항**:

- Phase 1: 음성 선택 또는 TTS 없음
- Phase 2: 미리보기 캐싱이 포함된 음성 라이브러리 계획됨
- `projects.voice_id` 필드를 지원하는 데이터 모델

**구현 노트**:

- `projects.voice_id` 컬럼은 예약되었으나 Phase 1에서 사용되지 않음
- Phase 2에 TTS API 통합 계획됨

### VII. 점진적 스토리보드 편집 (Incremental Storyboard Editing)

**상태**: ✅ PASS

**준수 사항**:

- 장면 카드 표시: 썸네일 플레이스홀더, 내레이션, 길이, 키워드 (FR-035)
- 클릭하여 편집 및 즉시 저장 (FR-036, FR-044)
- 길이, 키워드, 자막 프리셋을 독립적으로 편집 (FR-037-040, FR-042)
- 드래그 앤 드롭을 통한 장면 순서 변경 (FR-042, FR-043)

**구현 노트**:

- 낙관적 업데이트(optimistic updates)를 사용하는 TanStack Query mutations
- 저장 후 시각적 확인(체크표시) (FR-046)
- @dnd-kit 또는 react-beautiful-dnd를 통한 드래그 앤 드롭

### UTF-8 인코딩 표준 (UTF-8 Encoding Standards)

**상태**: ✅ PASS

**준수 사항**:

- 모든 YAML/JSON/CLI 인자는 ASCII-safe 문자만 사용
- Markdown 본문은 일반 유니코드(한국어, 중국어 등) 포함 가능
- 커밋 전 유효성 검사

**구현 노트**:

- Supabase 마이그레이션: UTF-8 safe
- API 응답: UTF-8 인코딩된 JSON
- OpenRouter 프롬프트: ASCII-safe 구조화된 데이터

### 성능 표준 (Performance Standards)

**상태**: ✅ PASS

**준수 사항**:

- 목표 길이: 최대 60초 (FR-003)
- 장면 수: 10-15개 목표, 20개 초과 시 자동 병합 (FR-027)
- 장면 길이: 장면당 2-6초 (FR-025)
- Phase 1에서 동시 렌더링 없음 (단일 서버)

**구현 노트**:

- 장면 분할 알고리즘은 2-6초 장면을 목표로 함
- 자동 병합 로직은 총 20개 이하가 될 때까지 2초 미만의 장면을 결합함
- LLM 타임아웃: 60초 (FR-008)

### 보안 및 규정 준수 (Security & Compliance)

**상태**: ✅ PASS

**준수 사항**:

- 모든 사용자 데이터에 Supabase RLS 강제 적용 (FR-055, 헌법)
- 환경 변수의 API keys (OPENROUTER_API_KEY)
- 사용자 격리: RLS 정책에서 `user_id = auth.uid()`

**구현 노트**:

- OpenRouter API key는 서버 측 전용 (프론트엔드에 절대 노출되지 않음)
- 이메일/비밀번호를 사용하는 Supabase Auth (Phase 1에서 확인 절차 필요 없음)
- `projects`, `scripts`, `scenes`, `subtitle_presets`에 대한 RLS 정책

### 개발 워크플로우 (Development Workflow)

**상태**: ✅ PASS

**준수 사항**:

- 기능 브랜치 형식: `001-script-storyboard-editor` ✅
- Git 규율: 설명적인 커밋, 히스토리 재작성 금지
- 코드 품질: TypeScript strict mode, ESLint, Prettier

**구현 노트**:

- 기존 `src/server/routers/rest.ts`에 대한 점진적 변경
- 기존 VideoCreator와 분리된 새로운 프론트엔드 라우트
- 기존 패턴 준수 (Material-UI, TanStack Query, Zod)

### 프로젝트 권한 (Project Authority)

**상태**: ✅ PASS

**준수 사항**:

- PRD 단일 진실 공급원(SSOT): `docs/AutoShorts_PRD.md`
- 모든 결정은 PRD 요구사항과 일치함
- 범위 외 항목은 명시적으로 문서화됨

**구현 노트**:

- Phase 1: 스크립트 생성, 빠른 편집, 장면 생성/편집
- 범위 제외: 미디어 가져오기, TTS, 렌더링 (Phase 2)
- 스펙 전반에 걸쳐 PRD 참조

**전체 헌법 상태**: ✅ PASS

모든 Phase 1 요구사항은 헌법 원칙을 준수합니다. Phase 2 기능(비동기 작업, 미디어 가져오기, 음성 선택)은 향후 구현을 위해 설계되었으나 Phase 1에서는 실행되지 않습니다.

## 프로젝트 구조 (Project Structure)

### Documentation (이 기능)

```
kitty-specs/001-script-storyboard-editor/
├── spec.md              # 기능 명세서 (사용자 스토리, FRs, SCs)
├── plan.md              # 이 파일 (구현 계획)
├── research.md          # Phase 0: 기술 조사 결과
├── data-model.md        # Phase 1: 데이터베이스 스키마 및 엔티티 관계
├── quickstart.md        # Phase 1: 개발자 온보딩 가이드
├── contracts/           # Phase 1: API 계약 (OpenAPI/Postman)
│   ├── openapi.yaml     # 모든 REST 엔드포인트를 위한 OpenAPI 3.1 스펙
│   └── postman-collection.json # 수동 테스트를 위한 Postman import
└── tasks/               # Phase 2: 작업 패키지 (/spec-kitty.tasks에 의해 생성됨)

```

### Source Code (저장소 루트)

```
src/
├── server/
│   ├── routers/
│   │   ├── rest.ts              # 새로운 /api/v1/* 엔드포인트로 확장됨
│   │   └── editor-router.ts     # NEW: Editor 전용 라우트
│   ├── services/
│   │   ├── llm-service.ts       # NEW: OpenRouter 통합
│   │   ├── scene-service.ts     # NEW: 장면 분할/병합 로직
│   │   └── script-service.ts    # NEW: 스크립트 버전 관리 로직
│   ├── middleware/
│   │   └── supabase-auth.ts     # NEW: Supabase 인증 미들웨어
│   └── validators/
│       └── editor-validators.ts # NEW: Editor API를 위한 Zod 스키마
│
├── ui/
│   ├── pages/
│   │   ├── EditorNew.tsx        # NEW: /editor/new (프로젝트 생성)
│   │   └── EditorProject.tsx    # NEW: /editor/:projectId (프로젝트 편집)
│   ├── components/
│   │   ├── editor/
│   │   │   ├── ScriptEditor.tsx       # NEW: 스크립트 생성 + 빠른 편집
│   │   │   ├── StoryboardView.tsx     # NEW: 장면 카드 그리드/리스트
│   │   │   ├── SceneCard.tsx          # NEW: 개별 장면 카드
│   │   │   ├── SceneEditDialog.tsx    # NEW: 장면 편집 모달
│   │   │   └── ProjectDashboard.tsx   # NEW: 프로젝트 목록/관리
│   │   └── common/
│   │       └── LoadingButton.tsx      # NEW: 재사용 가능한 로딩 버튼
│   ├── hooks/
│   │   ├── use-script.ts        # NEW: 스크립트 CRUD + 버전
│   │   ├── use-scenes.ts        # NEW: 장면 CRUD + 순서 변경
│   │   └── use-project.ts       # NEW: 프로젝트 CRUD
│   └── services/
│       └── editor-api.ts        # NEW: Editor 엔드포인트를 위한 API 클라이언트
│
├── types/
│   └── editor.ts                # NEW: Editor 도메인을 위한 TypeScript 타입
│
└── lib/
    └── scene-utils.ts           # NEW: 장면 분할/병합 유틸리티

supabase/
├── migrations/
│   ├── 20250102_create_projects_table.sql         # NEW
│   ├── 20250102_create_scripts_table.sql          # NEW
│   ├── 20250102_create_scenes_table.sql           # NEW
│   ├── 20250102_create_subtitle_presets_table.sql # NEW
│   └── 20250102_enable_rls_policies.sql           # NEW
└── seeds/
    └── subtitle_presets_seed.sql                  # NEW

tests/
├── unit/
│   ├── scene-utils.test.ts      # 장면 분할/병합 로직
│   └── script-service.test.ts   # 스크립트 버전 관리 로직
├── integration/
│   └── editor-api.test.ts       # API 통합 테스트
├── contract/
│   └── openrouter.test.ts       # OpenRouter API 계약 테스트 (mocked)
└── e2e/
    ├── editor-flow.spec.ts      # E2E: 주제 → 스크립트 → 스토리보드
    └── scene-editing.spec.ts    # E2E: 장면 CRUD + 순서 변경

```

**구조 결정 (Structure Decision)**: 웹 애플리케이션 패턴 (기존 스택)

- Backend: 새로운 라우트 및 서비스로 기존 `src/server/` 확장
- Frontend: `src/ui/pages/` 하위의 새로운 에디터 페이지, `src/ui/components/editor/` 하위의 공유 컴포넌트
- Database: 새로운 `supabase/` 디렉토리 내의 Supabase 마이그레이션
- Tests: `tests/` 하위에 소스 구조 미러링

**서비스 책임 분리**
- `llm-service.ts`: OpenRouter API 호출 전담 (timeout/retry 로직). DB 작업이나 버전 관리 로직 없음.
- `script-service.ts`: Script CRUD 작업 및 버전 관리 로직 전담. 새 버전 생성 시 `llm-service.ts` 호출.

**통합 지점 (Integration Points)**:

- 새로운 `/api/v1/*` 엔드포인트로 `src/server/routers/rest.ts` 확장 (clean v1 namespace)
- `src/server/server.ts`에 등록된 새로운 라우트
- React Router를 통한 프론트엔드 라우팅 (기존 VideoCreator와 독립적인 새로운 라우트)
- 데이터 fetching을 위한 TanStack Query (기존 패턴 따름)

## 복잡성 추적 (Complexity Tracking)

_정당화가 필요한 헌법 위반 사항 없음._

**노트**:

- 모든 기능은 기존 아키텍처 패턴과 일치함
- 새로운 프레임워크나 패러다임이 도입되지 않음
- 기존 코드베이스에 대한 점진적 추가

## 병렬 작업 분석 (Parallel Work Analysis)

### 의존성 그래프 (Dependency Graph)

```
Phase 0: Research (Day 1)
├── LLM integration patterns (LLM 통합 패턴)
├── Supabase setup and migration workflow (Supabase 설정 및 마이그레이션 워크플로우)
└── Scene splitting algorithm research (장면 분할 알고리즘 조사)

Phase 1: Foundation (Days 2-3) [SEQUENTIAL]
├── Supabase migrations (projects, scripts, scenes 테이블)
├── Backend scaffold (router, validators, types)
└── Frontend scaffold (routes, layout components)

Phase 2: Core Features (Days 4-6) [PARALLEL STREAMS]
Stream A: Script Generation & Editing
├── LLM service (OpenRouter 통합)
├── Script CRUD API endpoints
├── Script versioning logic
├── Script generation UI
└── Quick-edit tools (Shorten/Lengthen/Rephrase/Change Tone)

Stream B: Storyboard & Scene Management
├── Scene service (분할/병합 로직)
├── Scene CRUD API endpoints
├── Storyboard UI (장면 카드 그리드/리스트)
├── Scene editing dialog
└── Drag-and-drop reordering

Stream C: Project Management & Persistence
├── Project CRUD API endpoints
├── Project dashboard UI
├── Data persistence layer (TanStack Query)
└── Auth integration (Supabase Auth)

Phase 3: Integration & Testing (Days 7-8) [SEQUENTIAL]
├── Integration of all streams (모든 스트림 통합)
├── E2E testing (Playwright)
├── Contract testing (OpenRouter mocks)
└── Bug fixes and refinement

Phase 4: Documentation & Handoff (Day 9) [SEQUENTIAL]
├── quickstart.md completion
├── API contracts (OpenAPI/Postman)
└── Code review and merge

```

### 작업 분배 (Work Distribution)

**순차적 작업 (Sequential Work)** (반드시 먼저 완료되어야 함):

1. Supabase 마이그레이션 (데이터베이스 스키마)
2. 백엔드 라우터 및 validator 설정
3. 프론트엔드 라우트 등록 및 레이아웃
4. TanStack Query 설정 및 API 클라이언트

**병렬 스트림 (Parallel Streams)** (동시에 개발 가능):

- Stream A: 스크립트 생성/편집 (장면 관리와 독립적)
- Stream B: 스토리보드/장면 관리 (스크립트 로직과 독립적)
- Stream C: 프로젝트 관리 (데이터 모델에 대해 A/B에 의존)

**에이전트 할당 (Agent Assignments)** (여러 개발자/에이전트가 있는 경우):

- Agent 1: Stream A (Script 중심) → `src/server/services/script-service.ts`, `src/ui/components/editor/ScriptEditor.tsx`
- Agent 2: Stream B (Storyboard 중심) → `src/server/services/scene-service.ts`, `src/ui/components/editor/StoryboardView.tsx`
- Agent 3: Stream C (Project 중심) → `src/ui/pages/EditorNew.tsx`, `src/ui/pages/EditorProject.tsx`, auth 통합
- Agent 4: Testing → 모든 테스트 파일, contract mocks

**파일 소유권 규칙 (File Ownership Rules)**:

- Services: 서비스 파일당 하나의 에이전트
- Components: 컴포넌트 트리당 하나의 에이전트
- Tests: 코드를 작성한 에이전트가 테스트도 작성
- 통합 지점: merge/pull requests를 통해 조정

### 조정 지점 (Coordination Points)

**동기화 일정 (Sync Schedule)**:

- 메인 기능 브랜치로 병렬 스트림의 일일 병합(Daily merges)
- Phase 2 종료 시: 전체 통합 체크포인트
- Phase 3: 일일 통합 테스트 실행

**통합 테스트 (Integration Tests)**:

- 크로스 스트림 통합: 스크립트 → 장면 생성 흐름
- 데이터 일관성: Project/Script/Scene 버전 정렬
- E2E 커버리지: 주제 → 스크립트 → 스토리보드 → 장면 편집

**커뮤니케이션 채널 (Communication Channels)**:

- 단일 진실 공급원으로서의 공유 API 계약 (contracts/openapi.yaml)
- 인터페이스 계약을 강제하는 `src/types/editor.ts`의 TypeScript 타입
- 런타임 스키마 준수를 보장하는 Zod validators

---

**다음 단계 (Next Steps)**:

1. ✅ 계획 완료 (이 문서)
2. ⏭️ `/spec-kitty.plan` 실행 Phase 0: research.md 생성
3. ⏭️ `/spec-kitty.plan` 실행 Phase 1: data-model.md 및 contracts/ 생성
4. ⏭️ `/spec-kitty.tasks` 실행하여 작업 패키지 생성 (이 명령어에 포함되지 않음)

**STOP HERE**: 이 명령어는 계획 아티팩트 생성 후 종료됩니다. 사용자는 작업을 진행하기 위해 명시적으로 `/spec-kitty.tasks`를 실행해야 합니다.
