<!--
KO VIEW (Non-SoT)
- Source of Truth: tasks.md (English)
- If conflicts exist, English SoT wins.
- Last synced: 2026-01-02
-->

# 구현 작업: 스크립트 & 스토리보드 에디터

**기능**: 001-script-storyboard-editor
**단계**: 1 (Script & Storyboard Editor)
**날짜**: 2026-01-02
**상태**: 구현 준비 완료

이 문서는 Script & Storyboard Editor 기능을 구체적인 작업 패키지와 실행 가능한 하위 작업으로 분해합니다. 각 작업 패키지는 독립적으로 구현 및 테스트 가능합니다.

---

## 작업 패키지 0: 기초 설정 (Foundation Setup)

**목표**: 데이터베이스 스키마, 백엔드 스캐폴드, 프론트엔드 라우팅 인프라 구축

**우선순위**: P0 (반드시 먼저 완료해야 함 - 다른 모든 패키지가 이에 의존함)

**독립 테스트**: RLS 정책이 적용된 데이터베이스 테이블 확인, 인증 없는 백엔드 라우트가 401 반환 확인, 프론트엔드 라우트가 올바르게 이동하는지 확인

**포함된 하위 작업**:

- [ ] T001: `projects` 테이블에 대한 RLS 정책을 포함한 Supabase 마이그레이션 생성
- [ ] T002: `scripts` 테이블에 대한 RLS 정책을 포함한 Supabase 마이그레이션 생성
- [ ] T003: `scenes` 테이블에 대한 RLS 정책을 포함한 Supabase 마이그레이션 생성
- [ ] T004: `subtitle_presets` 테이블에 대한 시드(seed) 데이터를 포함한 Supabase 마이그레이션 생성
- [ ] T005: `src/types/editor.ts`에 TypeScript 타입 생성
- [ ] T006: `src/server/validators/editor-validators.ts`에 Zod 검증기(validators) 생성
- [ ] T007: `/api/v1/editor/*` 엔드포인트 스캐폴드로 Express 라우터 확장
- [ ] T008: React Router에 프론트엔드 라우트 `/editor/new` 및 `/editor/:projectId` 추가
- [ ] T009: `src/ui/services/editor-api.ts`에 TanStack Query 설정 및 API 클라이언트 생성
- [ ] T010: 백엔드 라우트용 Supabase 인증 미들웨어 생성

**구현 스케치**:

1. 각 테이블에 대해 `supabase migration new` 실행, data-model.md에 따라 SQL 스키마 작성
2. `supabase db reset`으로 로컬에 마이그레이션 적용, `supabase db inspect`로 테이블 확인
3. 스키마로부터 TypeScript 타입 생성 (또는 data-model.md와 일치하도록 수동 작성)
4. 스펙(FR-001 ~ FR-063)의 유효성 검사 규칙과 일치하는 Zod 스키마 생성
5. `src/server/routers/rest.ts`를 새 라우터로 확장하고 인증 미들웨어 추가
6. `src/ui/router.tsx` (또는 동등한 파일)의 React Router 설정 업데이트
7. axios/fetch로 API 클라이언트 생성, 기본 URL 및 인증 헤더 처리 추가
8. 사용자 간 데이터 접근을 시도하여 RLS 정책 테스트 (실패해야 함)

**병렬 작업 기회**: 없음 (반드시 순차적으로 완료해야 함)

**의존성**:

- 필요 조건: Supabase CLI 설치됨, 로컬 Supabase 실행 중
- 차단함(Blocks): 이후의 모든 작업 패키지

**위험 요소**:

- RLS 정책에 구문 오류가 있을 수 있음 - `supabase db test`로 테스트 필요
- 외래 키(Foreign key) cascade가 예상대로 작동하지 않을 수 있음 - 수동 삭제 작업으로 확인 필요
- Supabase Auth 통합에 RLS 외 추가 구성이 필요할 수 있음

---

## 작업 패키지 1: 스크립트 생성 & 편집 (사용자 스토리 1 & 2)

**목표**: 크리에이터가 주제로부터 스크립트를 생성하고 빠른 편집(quick-edit) 도구로 다듬을 수 있도록 함

**우선순위**: P1 (핵심 가치 제안 #1)

**독립 테스트**: 사용자가 주제를 입력하고, 60초 이내에 스크립트를 생성하고, 빠른 편집(Shorten)을 적용하고, 새 버전이 생성되었는지 확인

**포함된 하위 작업**:

- [ ] T011: OpenRouter API 통합을 포함한 `src/server/services/llm-service.ts` 생성
- [ ] T012: 스크립트 생성 프롬프트 템플릿 구현 (주제 → 내레이션 스크립트)
- [ ] T013: 빠른 편집 작업을 위한 프롬프트 템플릿 구현 (Shorten, Lengthen, Rephrase, Change Tone)
- [ ] T014: `POST /api/v1/editor/projects/:projectId/scripts/generate` 엔드포인트 생성
- [ ] T015: `POST /api/v1/editor/scripts/:scriptId/edit/{operation}` 엔드포인트 생성
- [ ] T016: `POST /api/v1/editor/scripts` 엔드포인트 생성 (수동 저장/새 버전)
- [ ] T017: `GET /api/v1/editor/projects/:projectId/scripts` 엔드포인트 생성 (버전 기록)
- [ ] T018: `POST /api/v1/editor/scripts/:scriptId/restore` 엔드포인트 생성
- [ ] T019: `src/ui/components/editor/ScriptEditor.tsx` 컴포넌트 생성
- [ ] T020: 플랫폼/길이/유형 선택기가 포함된 주제 입력 폼 구현
- [ ] T021: 버전 기록 사이드바가 포함된 스크립트 표시 영역 구현
- [ ] T022: 미리보기 모달이 포함된 빠른 편집 버튼(Shorten, Lengthen, Rephrase, Change Tone) 구현
- [ ] T023: 버전 비교 기능이 있는 수동 스크립트 편집 텍스트 영역(textarea) 구현
- [ ] T024: LLM 작업을 위한 로딩 상태 구현 (스피너, 진행 표시기)
- [ ] T025: 재시도 버튼 및 사용자 친화적인 메시지를 포함한 에러 처리 구현
- [ ] T026: 스크립트 CRUD 작업을 위한 `src/ui/hooks/use-script.ts` 생성
- [ ] T027: 스크립트 적용 후 "Go to Storyboard" CTA 버튼 추가

**구현 스케치**:

1. 타임아웃(60초) 및 재시도 로직(3회 시도)을 포함한 OpenRouter API 클라이언트를 llm-service.ts에 구현
2. LLM에 대한 명확한 지침(플랫폼, 길이, 비디오 유형 컨텍스트 포함)으로 프롬프트 템플릿 설계
3. OpenAPI 계약(contracts/openapi.yaml)에 따라 REST 엔드포인트 생성
4. script-service.ts에 스크립트 버전 관리 로직 구현: 버전 번호 증가, 소스 추적(llm/user), 모든 버전 저장
5. Material-UI(TextField, Select, Button, Dialog, LoadingButton)를 사용하여 ScriptEditor 컴포넌트 구축
6. 빠른 편집 흐름 구현: 버튼 클릭 → 미리보기 생성 → 모달 표시 → 사용자 확인 → 새 버전 저장
7. 즉각적인 UI 피드백을 위해 TanStack Query로 낙관적 업데이트(optimistic updates) 추가
8. 실제 OpenRouter API로 테스트 (.env에 OPENROUTER_API_KEY 설정)

**병렬 작업 기회**:

- [P] T011-T013 (LLM 서비스 및 프롬프트)은 T019-T022 (UI 컴포넌트)와 병렬로 개발 가능
- [P] T014-T018 (API 엔드포인트)은 T026 (React hooks)과 병렬로 개발 가능

**의존성**:

- 필요 조건: WP0 (데이터베이스 스키마, 백엔드 스캐폴드, 프론트엔드 라우트)
- 차단함(Blocks): WP2 (장면 생성은 스크립트 존재 여부에 의존함)

**위험 요소**:

- OpenRouter API가 느리거나 속도 제한에 걸릴 수 있음 - 타임아웃 및 우아한 성능 저하(graceful degradation) 구현
- LLM 출력 품질이 다를 수 있음 - 사용자 피드백 메커니즘 제공 (재생성 옵션)
- 여러 편집이 빠르게 발생할 경우 스크립트 버전 충돌 가능성 - 데이터베이스 트랜잭션 또는 버전 잠금 사용

---

## 작업 패키지 2: 장면 생성 & 관리 (사용자 스토리 3)

**목표**: 스크립트를 자동으로 장면으로 분할하고 버전 추적을 포함한 일회성 생성을 활성화함

**우선순위**: P1 (스토리보드 기능에 필수)

**독립 테스트**: 사용자가 스크립트를 생성하고, "Go to Storyboard"를 클릭하고, 적절한 내레이션/길이/키워드로 10-15개의 장면이 생성되었는지 확인하고, 페이지를 새로고침하여 장면이 유지되는지(일회성 생성) 확인

**포함된 하위 작업**:

- [ ] T028: 문장 토큰화 유틸리티를 포함한 `src/lib/scene-utils.ts` 생성
- [ ] T029: 장면 분할 알고리즘 구현 (문장들을 2-6초 장면으로 그룹화)
- [ ] T030: 장면 내레이션에서 키워드 추출 구현 (간단한 NLP)
- [ ] T031: 장면 병합 알고리즘 구현 (장면이 20개 초과 시 그리디 병합)
- [ ] T032: 장면 생성 로직을 포함한 `src/server/services/scene-service.ts` 생성
- [ ] T033: `POST /api/v1/editor/projects/:projectId/scenes/generate` 엔드포인트 생성
- [ ] T034: `GET /api/v1/editor/projects/:projectId/scenes` 엔드포인트 생성
- [ ] T035: `DELETE /api/v1/editor/projects/:projectId/scenes` 엔드포인트 생성 (재생성)
- [ ] T036: `storyboard_script_version`을 설정하도록 `PATCH /api/v1/editor/projects/:projectId` 업데이트
- [ ] T037: `src/ui/components/editor/StoryboardView.tsx` 컴포넌트 생성
- [ ] T038: SceneCard 컴포넌트를 포함한 장면 그리드 레이아웃 구현
- [ ] T039: 버전 불일치 감지 및 경고 배너 구현
- [ ] T040: 경고가 포함된 "Regenerate scenes" 확인 대화상자 구현
- [ ] T041: 일회성 생성 로직 구현 (생성 전 장면 존재 여부 확인)
- [ ] T042: 장면 CRUD 작업을 위한 `src/ui/hooks/use-scenes.ts` 생성

**구현 스케치**:

1. 문장 토크나이저 구현 (정규식 기반 또는 경량 NLP 라이브러리)
2. 장면당 단어 수 계산, 예상 길이 산출 (초당 2.5단어), 목표 2-6초
3. 내레이션에서 주요 키워드 추출 (첫 번째 명사구 또는 가장 빈번한 명사)
4. 그리디 병합 구현: 최소 결합 길이를 가진 인접 장면을 찾아 20개 이하가 될 때까지 병합
5. 최신 스크립트 버전을 읽고, scene-service.ts를 호출하고, 장면을 DB에 저장하는 장면 생성 엔드포인트 생성
6. 장면 생성 시 `project.storyboard_script_version = project.current_script_version` 설정
7. 일회성 확인 구현: 프로젝트에 장면이 존재하면 재생성 대신 기존 장면 반환
8. 장면 카드를 위한 Material-UI Grid로 StoryboardView 컴포넌트 구축
9. 버전 불일치 감지: `project.current_script_version !== project.storyboard_script_version`인 경우 경고 배너 표시
10. 확인 경고가 포함된 "Regenerate scenes" 버튼 추가 (수동 편집 덮어쓰기에 대해 경고)

**병렬 작업 기회**:

- [P] T028-T031 (장면 알고리즘)은 T037-T038 (UI 컴포넌트)과 병렬로 개발 가능
- [P] T032 (장면 서비스)는 T042 (React hooks)와 병렬로 개발 가능

**의존성**:

- 필요 조건: WP0 (데이터베이스 스키마), WP1 (스크립트 생성)
- 차단함(Blocks): WP3 (장면 편집은 장면 생성에 의존함)

**위험 요소**:

- 장면 분할이 어색한 경계를 생성할 수 있음 - 다양한 스크립트 길이로 테스트 필요
- 자동 병합이 15초를 초과하는 장면을 생성할 수 있음 - 스펙상 허용되지만 UX 가이드 필요할 수 있음
- 버전 불일치 감지가 혼란스러울 수 있음 - 명확한 메시지와 도움말 텍스트 추가
- 키워드 추출 품질이 다를 수 있음 - 추출 실패 시 프로젝트 주제로 폴백(fallback) 제공

---

## 작업 패키지 3: 장면 편집 UI (사용자 스토리 4)

**목표**: 크리에이터가 개별 장면 카드를 편집(길이, 키워드, 자막 프리셋)하고 순서를 재배치할 수 있도록 함

**우선순위**: P2 (핵심 가치 제안 #2)

**독립 테스트**: 사용자가 장면 카드를 클릭하고, 길이를 5초에서 7초로 변경하고, 저장 확인을 검증하고, 페이지를 새로고침하여 변경 사항이 유지되는지 확인하고, 장면을 새 위치로 드래그하여 순서 변경을 확인

**포함된 하위 작업**:

- [ ] T043: `src/ui/components/editor/SceneCard.tsx` 컴포넌트 생성
- [ ] T044: `src/ui/components/editor/SceneEditDialog.tsx` 모달 구현
- [ ] T045: `PATCH /api/v1/editor/scenes/:sceneId` 엔드포인트 생성 (단일 장면 업데이트)
- [ ] T046: `PATCH /api/v1/editor/scenes/batch` 엔드포인트 생성 (일괄 업데이트, "Apply to all")
- [ ] T047: `POST /api/v1/editor/projects/:projectId/scenes/reorder` 엔드포인트 생성
- [ ] T048: 유효성 검사를 포함한 길이 편집 구현 (1초 ≤ duration ≤ min(60초, project.target_duration_seconds), 모든 장면 길이의 합이 project.target_duration_seconds를 초과할 경우 저장 차단)
- [ ] T049: 시각적 확인(체크표시)이 포함된 키워드 편집 구현
- [ ] T050: 자막 프리셋 선택기 구현 (Minimal, Highlight, Karaoke)
- [ ] T051: 자막 프리셋을 위한 "Apply to all scenes" 버튼 구현
- [ ] T052: 장면 드래그 앤 드롭 재배치 구현 (@dnd-kit 또는 react-beautiful-dnd)
- [ ] T053: 장면 편집을 위한 낙관적 업데이트 추가 (즉각적인 UI 피드백)
- [ ] T054: 시각적 저장 확인 구현 (체크표시 아이콘, 토스트 알림)
- [ ] T055: 장면 썸네일 플레이스홀더 추가 (색상 박스 또는 일반 아이콘)

**구현 스케치**:

1. Material-UI Card로 SceneCard 컴포넌트 구축: 썸네일 플레이스홀더, 내레이션 텍스트, 길이 배지, 키워드 태그, 자막 프리셋 아이콘
2. 카드 클릭 → SceneEditDialog 열기 (폼 필드가 있는 Dialog 컴포넌트)
3. 폼 구현: 길이 TextField (숫자 입력), 키워드 TextField, 자막 프리셋 Select, "Apply" 버튼
4. 유효성 검사 추가: 길이는 1초 이상이어야 함, 키워드는 비어있을 수 없음
5. 폼 제출 시 PATCH 엔드포인트 호출, API 호출 중 로딩 상태 표시
6. 성공 시 체크표시 아이콘 또는 토스트 알림 표시, TanStack Query 캐시 업데이트
7. "Apply to all"의 경우, 장면 프리셋 ID로 일괄 업데이트 엔드포인트 호출, 캐시 내 모든 장면 업데이트
8. 드래그 앤 드롭 구현: @dnd-kit 사용, 드래그 종료 시 새로운 장면 ID 순서로 재배치 엔드포인트 호출
9. 백엔드 재배치 엔드포인트는 모든 장면의 `order_index` 업데이트 (0부터 시작하는 순차값)

**병렬 작업 기회**:

- [P] T043-T044 (UI 컴포넌트)는 T045-T047 (API 엔드포인트)과 병렬로 개발 가능
- [P] T048-T051 (폼 필드)은 T052 (드래그 앤 드롭)와 병렬로 개발 가능

**의존성**:

- 필요 조건: WP0 (데이터베이스 스키마), WP2 (장면 생성)
- 차단함(Blocks): 없음 (독립적 기능)

**위험 요소**:

- 드래그 앤 드롭 라이브러리와 React 19 호환성 문제 - @dnd-kit 또는 react-beautiful-dnd 테스트
- 낙관적 업데이트가 서버 상태와 충돌할 수 있음 - 적절한 캐시 무효화 구현
- 여러 사용자에 의한 동시 편집 (가능성은 낮지만 발생 가능) - 충돌 감지 또는 last-write-wins 고려
- 장면 재배치가 order_index에 간격을 만들 수 있음 - 백엔드에서 모든 장면 재인덱싱 필요

---

## 작업 패키지 4: 프로젝트 관리 & 영속성 (사용자 스토리 5)

**목표**: 크리에이터가 프로젝트를 생성하고, 모든 작업을 세션 간에 저장하며, 대시보드에서 다시 불러올 수 있도록 함

**우선순위**: P2 (실제 사용 환경에 필수)

**독립 테스트**: 사용자가 프로젝트를 생성하고, 스크립트를 생성하고, 장면을 만들고, 브라우저를 닫고, 다시 열고, 대시보드로 이동하고, 프로젝트를 클릭하여 모든 데이터가 올바르게 로드되는지 확인

**포함된 하위 작업**:

- [ ] T056: `POST /api/v1/editor/projects` 엔드포인트 생성 (새 프로젝트 생성)
- [ ] T057: `GET /api/v1/editor/projects` 엔드포인트 생성 (사용자 프로젝트 목록)
- [ ] T058: `GET /api/v1/editor/projects/:projectId` 엔드포인트 생성 (단일 프로젝트 로드)
- [ ] T059: `PATCH /api/v1/editor/projects/:projectId` 엔드포인트 생성 (프로젝트 메타데이터 업데이트)
- [ ] T060: `DELETE /api/v1/editor/projects/:projectId` 엔드포인트 생성 (프로젝트 삭제)
- [ ] T061: `src/ui/pages/EditorNew.tsx` 컴포넌트 생성 (프로젝트 생성 페이지)
- [ ] T062: `src/ui/pages/EditorProject.tsx` 컴포넌트 생성 (프로젝트 편집 페이지)
- [ ] T063: `src/ui/components/editor/ProjectDashboard.tsx` 컴포넌트 생성
- [ ] T064: "최종 수정(last modified)" 정렬 기능이 있는 프로젝트 목록 뷰 구현
- [ ] T065: 프로젝트 상태 표시기 구현 (draft/rendering/done/failed)
- [ ] T066: 대시보드에서 프로젝트 다시 불러오기 구현 (`/editor/:projectId`로 이동)
- [ ] T067: 대시보드에 "New Project" 버튼 추가
- [ ] T068: 주제에서 프로젝트 제목 자동 생성 구현
- [ ] T069: 프로젝트 삭제 확인 대화상자 추가
- [ ] T070: 프로젝트 CRUD 작업을 위한 `src/ui/hooks/use-project.ts` 생성

**구현 스케치**:

1. OpenAPI 계약에 따라 프로젝트 CRUD 엔드포인트 생성
2. 유효성 검사(주제 최소 10자, 플랫폼/유형/길이 필수)를 포함한 프로젝트 생성 구현
3. 주제로부터 제목 자동 생성 (처음 50자 또는 사용자 정의)
4. 초기 상태 설정: status="draft", `current_script_version=null`, `storyboard_script_version=null`
5. 목록 엔드포인트는 `updated_at` 내림차순으로 정렬된 모든 사용자의 프로젝트 반환, RLS 강제 (user_id = auth.uid())
6. 로드 엔드포인트는 최신 스크립트 버전과 모든 장면이 포함된 프로젝트 반환
7. EditorNew 페이지 구축: 주제 입력 폼, 플랫폼/길이/유형 선택기, "Create" 버튼, 성공 시 EditorProject로 리다이렉트
8. EditorProject 페이지 구축: 탭 인터페이스 (Script 탭, Storyboard 탭), 마운트 시 프로젝트 데이터 로드
9. ProjectDashboard 컴포넌트 구축: Material-UI Table 또는 Grid와 프로젝트 카드, 상태 배지, "Open" 버튼
10. React Router를 사용하여 대시보드와 에디터 페이지 간 이동 추가
11. 데이터 영속성 테스트: 프로젝트 생성, 변경 수행, 브라우저 닫기, 다시 열기, 모든 데이터 존재 확인

**병렬 작업 기회**:

- [P] T056-T060 (API 엔드포인트)은 T061-T069 (UI 컴포넌트)와 병렬로 개발 가능
- [P] T063-T064 (대시보드 UI)는 T061-T062 (에디터 페이지)와 병렬로 개발 가능

**의존성**:

- 필요 조건: WP0 (데이터베이스 스키마, 인증), WP1 (스크립트 기능), WP2 (장면 기능), WP3 (장면 편집)
- 차단함(Blocks): 없음 (핵심 기능 세트 완료)

**위험 요소**:

- RLS 정책이 사용자 격리를 제대로 강제하지 못할 수 있음 - 여러 테스트 계정으로 테스트 필요
- 대용량 스크립트/장면이 있는 경우 프로젝트 로드가 느릴 수 있음 - 쿼리 성능 최적화, 필요시 페이지네이션 추가
- 삭제된 프로젝트가 고아 스크립트/장면을 남길 수 있음 - cascading delete가 올바르게 작동하는지 확인
- 동시 편집으로 충돌이 발생할 수 있음 - 낙관적 잠금(optimistic locking) 또는 last-write-wins 고려

---

## 작업 패키지 5: 통합, 테스트 & 다듬기 (Integration, Testing & Polish)

**목표**: 모든 컴포넌트를 통합하고, 포괄적인 테스트를 작성하고, 버그를 수정하며, 배포(production)를 준비함

**우선순위**: P1 (기능 완성에 필수)

**독립 테스트**: 모든 E2E 테스트 통과, 계약 테스트가 OpenRouter 통합 검증, RLS 정책 강제됨, 콘솔 에러 없음, UI 반응형 및 접근성 확인

**포함된 하위 작업**:

- [ ] T071: scene-utils.ts에 대한 단위 테스트 작성 (장면 분할, 병합, 키워드 추출)
- [ ] T072: script-service.ts에 대한 단위 테스트 작성 (버전 관리 로직)
- [ ] T073: 스크립트 생성 API에 대한 통합 테스트 작성 (OpenRouter 모킹 포함)
- [ ] T074: 장면 생성 API에 대한 통합 테스트 작성 (실제 스크립트 데이터 사용)
- [ ] T075: OpenRouter API에 대한 계약 테스트 작성 (Nock으로 모킹)
- [ ] T076: 해피 패스(happy path)에 대한 E2E 테스트 작성: 주제 → 스크립트 → 스토리보드 → 장면 편집 (Playwright)
- [ ] T077: 스크립트 빠른 편집 흐름에 대한 E2E 테스트 작성 (Playwright)
- [ ] T078: 장면 재배치에 대한 E2E 테스트 작성 (Playwright)
- [ ] T079: 프로젝트 다시 불러오기 및 영속성에 대한 E2E 테스트 작성 (Playwright)
- [ ] T080: 여러 사용자 계정으로 RLS 정책 테스트 (통합 테스트)
- [ ] T081: 테스트 중 발견된 치명적 버그 수정
- [ ] T082: 모든 비동기 작업에 대한 로딩 상태 추가
- [ ] T083: 에러 바운더리(Error boundaries) 및 우아한 에러 처리 추가
- [ ] T084: 접근성 개선 (ARIA 레이블, 키보드 탐색, 스크린 리더 지원)
- [ ] T085: 반응형 디자인 조정 추가 (모바일 레이아웃 조정)
- [ ] T086: 성능 최적화 (지연 로딩, 코드 분할, 쿼리 최적화)
- [ ] T087: 개발자 온보딩 지침으로 quickstart.md 업데이트
- [ ] T088: API 계약이 구현과 일치하는지 확인 (OpenAPI 스펙 검증)
- [ ] T089: 콘솔 로그 및 디버그 구문 정리
- [ ] T090: 최종 코드 리뷰 및 리팩토링

**구현 스케치**:

1. 단위 테스트를 위해 Vitest 설정, describe/it/assert 패턴 사용
2. 다양한 스크립트 길이(15초, 30초, 60초)로 장면 분할 테스트
3. 엣지 케이스(장면 1개, 25개 등)로 장면 병합 테스트
4. 계약 테스트를 위해 Nock으로 OpenRouter API 모킹, 요청 형식 및 응답 파싱 검증
5. Playwright E2E 테스트 작성: 테스트 계정 생성, 로그인, 전체 워크플로우 수행, 결과 검증
6. RLS 테스트: 두 명의 테스트 사용자를 생성, 사용자 A가 사용자 B의 프로젝트에 접근할 수 없는지 확인
7. 모든 비동기 작업에 Material-UI CircularProgress 또는 LoadingButton 추가
8. 에러를 잡고 우아하게 표시하기 위해 React Error Boundary 컴포넌트 추가
9. 모든 상호작용 요소에 ARIA 레이블 추가, 키보드 탐색(Tab, Enter, Escape) 테스트
10. 모바일 뷰포트(375px 너비)에서 테스트, 필요시 레이아웃 조정
11. 에디터 페이지 코드 분할을 위해 React.lazy() 사용
12. 데이터베이스 쿼리 최적화 (인덱스 추가, N+1 쿼리 방지)
13. quickstart.md 업데이트: 로컬 설정 단계, 환경 변수, 마이그레이션 실행 방법, 테스트 실행 방법
14. 검증 도구를 사용하여 구현에 대해 OpenAPI 스펙 유효성 검사
15. console.log 제거, 필요시 적절한 로깅 추가 (winston 또는 pino)
16. 최종 코드 리뷰 수행: TypeScript 엄격 모드 준수, ESLint 규칙, Prettier 포맷팅 확인

**병렬 작업 기회**:

- [P] T071-T075 (단위/통합/계약 테스트)는 T076-T079 (E2E 테스트)와 병렬로 개발 가능
- [P] T082-T086 (다듬기 작업)은 다른 개발자가 병렬로 수행 가능
- [P] T087-T088 (문서화)은 T089-T090 (정리)과 병렬로 수행 가능

**의존성**:

- 필요 조건: WP1, WP2, WP3, WP4 (모든 기능 완료)
- 차단함(Blocks): 없음 (마지막 작업 패키지)

**위험 요소**:

- 타이밍 문제로 인해 E2E 테스트가 불안정할 수 있음 - 적절한 대기(waits) 및 단언(assertions) 추가
- API 변경 시 OpenRouter 계약 테스트가 실패할 수 있음 - 모의(mocks) 업데이트 필요
- RLS 정책 테스트가 보안 문제를 드러낼 수 있음 - 배포 전 수정
- 성능 문제가 아키텍처 변경을 요구할 수 있음 - 1단계 범위에서는 가능성 낮음
- 브라우저 호환성 문제 - Chrome, Firefox, Safari에서 테스트

---

## 요약 통계 (Summary Statistics)

**총 작업 패키지**: 6
**총 하위 작업**: 90

**작업 패키지당 하위 작업**:

- WP0 (Foundation): 10 하위 작업
- WP1 (Script Gen): 17 하위 작업
- WP2 (Scene Gen): 15 하위 작업
- WP3 (Scene Edit): 13 하위 작업
- WP4 (Project Mgmt): 15 하위 작업
- WP5 (Integration): 20 하위 작업

**병렬화 주요 사항**:

- WP1과 WP2는 WP0 완료 후 **병렬로** 개발 가능 (스크립트 및 장면 로직은 독립적)
- WP3는 WP2 완료 **직후** 시작 가능 (장면 편집은 장면 생성에 의존함)
- WP4는 WP1, WP2, WP3 완료 필요 (모든 기능에 의존함)
- 최대 병렬성: WP0 이후 3명의 개발자가 WP1, WP2, WP4를 동시에 작업 가능

**MVP 범위 권장 사항**: WP0 + WP1 + WP2 (전체 해피 패스 활성화: 주제 → 스크립트 → 스토리보드)

**다음 제안 명령어**:

1. `/spec-kitty.analyze` - 상호 아티팩트 일관성을 위해 tasks.md 검토
2. `/spec-kitty.implement` - 작업 패키지를 순서대로 처리하여 구현 계획 실행

---

**작업 생성자**: Claude (AI Task Generation Agent)
**작업 날짜**: 2026-01-02
**다음 조치**: 작업을 검토한 후, `/spec-kitty.implement`를 실행하여 실행 시작
