> 목적: short-video-maker(오픈소스)를 포크해 “Pictory 스타일 반자동 숏폼 제작”을 구현한다.  
> 핵심가치 3: **대본 빠른 편집** / **씬 스토리보드 편집** / **진행·대기 UX(복구 가능)**

---

## 1. 한 줄 요약
Topic 입력 → 스크립트 자동 생성 → 버튼으로 빠른 편집(짧게/길게/톤/자연화) → **스토리보드 진입 시 1회 씬 생성** → 씬 카드(스토리보드)에서 미디어 교체/길이/자막 프리셋 편집 → **Voice(목소리) 선택 + 샘플/씬 프리뷰** → 비동기 렌더링(단계별 진행/재시도/대체경로) → 다운로드.

---

## 2. 배경 및 문제
### 2.1 현재 오픈소스(포크 대상)의 한계
- 스크립트/검색 키워드를 사용자가 직접 많이 입력해야 함
- 스톡 미디어가 “내용과 안 맞는 씬”이 잦아 결과물이 쉽게 망함
- 생성 시간이 길어도 “지금 뭐 하고 있는지/실패 시 어떻게 복구하는지” UX가 약함

### 2.2 우리가 해결할 핵심 문제
1) **AI가 써준 대본이 어색** → 버튼 몇 번으로 내 톤으로 바꾸고 싶다  
2) **몇 개 씬만 망해도 전체가 망함** → 문제 씬만 바꿔서 살리고 싶다  
3) **렌더가 오래 걸릴 때 불안** → 진행/실패원인/재시도·대체경로가 필요

---

## 3. 목표 / 비목표
### 3.1 목표(MVP)
- Topic 입력 기반 **스크립트 생성**
- **대본 빠른 편집**: Shorten / Lengthen / Rephrase / Change Tone(프리셋 아이콘) + 직접 수정
- **스토리보드(씬 카드) 편집**: (선택)순서 / 길이 / 자막 프리셋 / 미디어 교체
- 미디어 소스: **Pexels + Pixabay**
- **Voice 선택**: Voice Library에서 목소리 선택 + 샘플 재생 + (옵션)씬 단위 TTS 프리뷰
- 렌더링: **비동기 Job** + 단계별 진행 + 실패 복구(재시도·대체경로)
- Next.js + Supabase(Auth/DB/Storage/RLS) 조합
- 운영(권장): Vercel(웹/UI) + AWS(Docker 워커)

### 3.2 비목표(초기 제외)
- 생성형 영상(Sora/Runway류) 자체 생성
- 실시간 협업 편집(멀티유저 동시 편집)
- 템플릿 마켓/팀 플랜/결제(Phase 이후)
- 고급 편집(키프레임, 세밀 컷 편집 등)
- (Phase 2) 씬 추가/삭제/분할/병합

---

## 4. 사용자 / JTBD
### 4.1 타깃
- 개인 크리에이터(초점): “완전 자동”보다 **빠르게 고치면서 결과를 만드는** 사용자
- (Phase 2+) 마케터/소규모 브랜드

### 4.2 JTBD
- “아이디어만 넣고 5분 안에 초안을 만들고 싶다.”
- “망한 씬만 교체해서 살리고 싶다.”
- “목소리를 미리 들어보고 고르고 싶다.”
- “오래 걸려도 상태가 보이고, 실패하면 복구하고 싶다.”

---

## 5. 제품 플로우(UX)
1) **Topic 입력**(플랫폼/길이/타입 선택)  
2) **Script 생성**  
3) **빠른 편집** 버튼으로 재작성/톤 변경 + 직접 수정  
4) **스토리보드 진입 시 1회 씬 생성**(씬 텍스트/길이/키워드 생성)  
5) **스토리보드**에서 씬 카드 편집 + 미디어 교체  
6) **Voice 선택**(샘플 재생) + (옵션) **씬 프리뷰 TTS**  
7) **Render 시작** → 비동기 Job 생성  
8) **Progress 화면**(단계별 진행/로그/재시도·대체경로)  
9) 완료 → **다운로드/저장**

---

## 6. 요구사항(기능) + 수용 기준(AC)

### FR-0 Auth (MVP 권장)
- Supabase Auth:
  - Google OAuth(우선)
  - Email OTP(매직링크) 병행(권장)

**AC**
- 로그인 화면에 “Continue with Google”과 “Email로 로그인 링크 보내기”가 모두 노출된다.
- Google 로그인 실패/거부 시에도 Email 로그인으로 계속 진행 가능하다.
- 로그인 후 RLS가 `auth.uid()` 기준으로 정상 적용된다.

---

### FR-1 Topic 입력
- 입력: topic text
- 옵션:
  - platform: `shorts | tiktok | reels` (MVP는 UI만, 출력 규격 기본값은 공통으로 시작 가능)
  - target duration: `15 | 30 | 60`(최대 60)
  - video type preset: `Explainer | Marketing | Tutorial | Recipe | Story`

**AC**
- topic 필수
- duration 60초 초과 불가(MVP 목표가 ‘숏폼’이므로 최대치 제한)
- 프로젝트 생성 시 draft 상태로 저장

---

### FR-2 스크립트 생성(LLM)
- OpenRouter 통해 LLM 호출(모델은 설정 가능)
- 출력: narration 스크립트(plain text) + 옵션으로 hook 강화

**AC**
- 생성 성공 시 scripts(version=1) 저장
- 실패 시:
  - 오류 메시지(사용자 친화) + “재시도” 버튼
  - 타임아웃 시 “다시 시도 / 모델 변경(옵션)” 안내
- 성능 목표(Goal): “체감 빠른 응답” (※ SLA로 5초 보장 표기 금지, LLM은 시간변동 크므로)

---

### FR-3 대본 빠른 편집(핵심가치 1)
- 버튼:
  - Shorten / Lengthen
  - Rephrase(자연화)
  - Change Tone(프리셋: Casual/Professional/Funny/Inspirational 등 아이콘)
- 직접 편집(textarea)

**정책**
- **스크립트 변경은 스토리보드(씬)를 자동으로 변경하지 않는다.**
- **Render 시작 전에는 스크립트를 언제든 수정 가능**하다.
- **스토리보드(씬) 생성 이후 Render의 기준(SoT)은 scenes**이다.
  - 스크립트는 “생성/편집 UX”의 입력이며, 스토리보드 진입 시 1회 scenes를 만든다.
  - Render는 “Render 시작 시점의 scenes 스냅샷”을 기준으로 TTS/자막/타이밍을 만든다.
- **Render 시작 시점의 스냅샷**을 고정하고, 이후 생성되는 TTS/자막은 그 스냅샷 기준으로 처리한다.

**AC**
- 버튼 클릭 → 새 스크립트 생성 → 사용자가 “적용”하면 scripts version 증가
- 직접 수정 후 “적용” 시 scripts version 증가
- 스크립트 적용 후, 사용자가 스토리보드에 들어가기 전이라면 ‘스토리보드로 이동’ CTA를 노출한다.
- Render job이 `running`이면 스크립트 편집은 비활성화(또는 “Cancel 후 수정” 안내).

---

### FR-4 씬 생성(자동 분할) + 키워드 생성
- 트리거: **스크립트 → 스토리보드로 처음 넘어갈 때 1회** scenes[] 생성
- 입력: `scripts.latest_version` (최신 스크립트)
- 씬 필드(최소):
  - `narration_text`
  - `duration_sec_draft` (초안/사용자 편집값)
  - `primary_keyword` (단일 키워드 1개)
- (옵션, MVP) 분할 프리셋:
  - `scene_density = dense | normal` (예: dense=2~4초, normal=3~6초)
- (Phase 2 예약)
  - `secondary_keywords` (fallback 용)
  - 직접 편집: 씬 추가/삭제/분할/병합

**정책**
- 스토리보드는 “씬 카드 편집/교체 UX”가 핵심이며, **MVP에서 사용자는 분할점(컷 포인트)을 직접 편집하지 않는다.**
- 사용자가 분할에 관여하는 방식은:
  1. **스토리보드 진입 전 스크립트 수정(간접)**
  2. (옵션) **분할 프리셋 선택(간접)**

**AC (씬 생성 1회)**
- “스토리보드로 이동” 클릭 시, scenes가 없으면 **생성**한다.
- 생성 시 `projects.storyboard_script_version = scripts.latest_version`로 저장한다.
- scenes가 이미 존재하면 **재생성하지 않고 기존 scenes 로드**한다.
  - 예: 프로젝트 목록에서 기존 프로젝트를 다시 열어 스토리보드로 들어가는 경우

**AC (씬 개수 상한 + 자동 병합 규칙)**
- 목표 씬 길이 가이드: `scene_density` 기준으로 2~6초 범위의 `duration_sec_draft`를 부여한다.
- 생성 결과 씬이 과도하게 많아 **가독성이 떨어지는 경우**(예: 60초 기준 **20씬 초과**) 자동 병합을 수행한다.
- 자동 병합 규칙(단순/명확, MVP):
  1. `duration_sec_draft`가 **2초 미만**인 씬이 있으면, **바로 다음 씬**과 병합한다. (마지막이면 이전 씬과 병합)
  2. 위 과정을 반복해도 씬 수가 상한을 넘으면, **가장 짧은 씬부터 인접 씬과 병합**하여 상한 이하가 될 때까지 반복한다.
- 병합 시:
  - `narration_text`는 공백/문장부호를 유지해 이어붙인다.
  - `duration_sec_draft`는 합산한다.
  - `primary_keyword`는 **첫 씬 기준 유지**(Phase 2에서 재계산 가능)

**AC (키워드)**
- 씬마다 `primary_keyword` 1개를 생성한다.
- 키워드 생성 실패 시 fallback: `topic` 또는 해당 씬 `narration_text`에서 상위 명사 1개 추출(간단 규칙)

---

### FR-5 스토리보드(씬 카드) 편집(핵심가치 2)
- 씬 카드 표시: 썸네일 / 문장 / 길이 / 자막 프리셋 / 키워드
- (MVP) 제공:
  - 드래그 정렬(선택)
  - 길이 조정
  - 자막 프리셋 변경
  - 미디어 교체(핵심)

**Phase 2**
- 씬 추가/삭제/분할/병합
- 씬 텍스트 단위 편집 고도화

**AC**
- 씬 단위로 수정 가능하며 전체 재생성 없이 “문제 씬만” 교체 가능
- 변경 사항은 즉시 저장(optimistic UI 가능)
- MVP에서 씬 **추가/삭제/분할/병합은 제공하지 않는다**(Phase 2).

---

### FR-6 미디어 검색/교체 UX (MVP Core)
- 소스: Pexels + Pixabay
- 교체 UX: **씬 썸네일 클릭 → 우측 패널 오픈 → 자동 검색 → 결과 클릭 즉시 교체 → Undo**
- 검색 기본값: `primary_keyword` 자동 채움
- 결과 그리드: 3x2(6개) 또는 3x3(9개)

**AC (MVP)**
- 썸네일 클릭 시 패널이 열리고 `primary_keyword`로 자동 검색이 실행된다.
- 결과 클릭 즉시 해당 씬의 `media_asset_id`가 교체된다(확인 단계 없음).
- Undo(직전 1회)로 직전 교체를 되돌릴 수 있다.
- provider 탭 전환(Pexels/Pixabay)이 가능하다.
- 검색 실패/레이트리밋 시, 사용자에게 원인 안내 + 다른 provider로 전환 CTA가 노출된다.

**AC (간단한 할당량/약관 방어, v3.8)**
- 검색 입력은 디바운스(예: 300ms)를 적용한다.
- 캐시 정책은 provider별 요구를 따른다:
  - **Pexels**: 동일 `provider + type + keyword` 검색은 **TTL 10분 캐시**를 적용한다.
  - **Pixabay**: API 응답은 **24시간 캐시**한다(동일 요청 반복 방지).
- 자동/수동 provider fallback이 가능해야 한다:
  - 기본: primary provider로 검색 → 실패/레이트리밋 시 “다른 provider로 전환” CTA
  - 사용자가 탭을 전환하면 해당 provider로 동일 키워드로 즉시 재검색 가능

---

### FR-7 자막 스타일(프리셋)
- 프리셋 아이콘 선택(예: Minimal/Highlight/Karaoke 등)
- (MVP) 씬 단위 적용 + 전체 적용 버튼

**AC**
- 프리셋 변경 시 씬에 즉시 반영(렌더 재생성 필요 상태 표시)
- 최소 3개 프리셋 제공

---

### FR-7.5 Voice 선택 + TTS 프리뷰 (MVP)
**목표**
- 사용자가 “최종 렌더에 적용될 목소리”를 사전에 선택/검증할 수 있게 한다.
- 렌더링 단계에서 전체 TTS를 생성/합성하되, 스토리보드 단계에서 **짧은 미리듣기**를 제공한다.

**정책**
- Voice 선택은 `projects.voice_id`로 저장된다.
- (중요) **Render는 시작 시점에 선택된 voice를 스냅샷으로 고정**한다. (Render 중 voice 변경 불가)
- TTS Provider 전략:
  - MVP: Google Cloud TTS 우선
  - 런칭: ElevenLabs 전환 또는 병행

**AC (Voice Library, 필수)**
- Voice 리스트(카드)가 제공된다. (예: Warm / Energetic / Calm 등)
- 각 voice는 **샘플 문장 오디오**를 즉시 재생할 수 있다. (정적 파일 또는 캐시된 파일)
- 사용자가 voice를 선택하면 프로젝트에 저장되고, UI에 선택 상태가 명확히 보인다.

**AC (Scene TTS Preview, 옵션: MVP에 포함 가능)**
- 씬 카드에서 “Voice Preview”를 누르면, 해당 씬의 `narration_text`로 **짧은 TTS 프리뷰**를 생성/재생할 수 있다.
- 프리뷰 생성이 오래 걸리면 로딩 상태가 보이고, 실패 시 재시도 제공.
- 동일 씬/동일 voice/동일 텍스트의 프리뷰는 TTL 캐시(예: 10분) 또는 저장(선택)한다.

**스코프 경계**
- “인삿말/클로징 문구 템플릿을 영상에 삽입”은 Phase 2로 둔다.  
  (MVP의 샘플 문구는 **목소리 비교용**이며, 실제 스크립트를 바꾸지 않는다.)

---

### FR-8 비동기 렌더링 + 진행·대기 UX (MVP)
**핵심 원칙**
- Render의 기준(SoT)은 **scenes**이다.
- Render 시작 시점에 scenes를 스냅샷으로 고정하고, 해당 스냅샷을 기준으로 TTS/자막/미디어/렌더를 수행한다.
  - 구현 선택지: (a) scenes_snapshot 테이블/JSONB (b) scenes에 version/lock (c) job_steps에 입력 스냅샷 저장
  - MVP에서는 “실행 시점의 scenes를 읽어 고정(잠금)” 방식으로 시작 가능

**AC (기본)**
- Render 시작 시 `render_job`이 생성되고 상태가 `queued → running`으로 변경된다.
- Render 시작 시점에 아래 스냅샷이 고정된다:
  - `storyboard_script_version_snapshot` = projects.storyboard_script_version
  - `voice_id_snapshot` = projects.voice_id
  - (옵션) `script_version_snapshot` = scripts.latest_version  # 감사/추적용
- UI는 다음을 표시한다:
  - 현재 단계(current_step)
  - 단계별 상태(예: done/running/failed)
  - “마지막 업데이트 시간”(updated_at 기반)
- 실패 시 UI는 다음을 제공한다:
  - **Retry from failed step** 버튼
  - 실패 원인 요약(사용자 친화 문구) + error_code(옵션: 개발자용)

**AC (정합성 안내)**
- `scripts.latest_version != projects.storyboard_script_version`이면,
  - UI에 “현재 스토리보드 텍스트(씬)는 최신 스크립트와 다를 수 있음” 안내를 표시한다.
  - 사용자가 Render를 진행하려면 해당 안내를 확인할 수 있어야 한다. (예: 배너 + “확인”)

**AC (대체 경로/실패 처리)**
- STOCK_FETCH 실패 시:
  - (1) **다른 provider로 자동 재시도**(Pexels↔Pixabay) 또는 사용자에게 “다른 provider로 전환” CTA 제공
  - (2) 실패한 씬은 사용자가 **직접 업로드**로 대체 가능해야 한다.
  - (3) (옵션) 이미지 생성 API를 통해 해당 씬을 이미지로 대체 가능(Phase 이후 또는 옵션)
- TTS 실패 시:
  - 재시도(최대 N회) 제공(모델/voice 변경이 가능한 경우 옵션 제공)
  - 최종 실패 시: “실패 이유 + 다음 행동(재시도/voice 변경/나중에 다시)” 안내를 사용자에게 제공

**AC (초안 프리뷰)**
- Render job이 진행 중이어도 사용자는 스토리보드 화면에서:
  - 씬 카드/타임라인 기반 “초안 프리뷰”(정적/간이 재생)를 즉시 볼 수 있다.
- 최종 export는 완료 시 다운로드/재생 링크로 제공된다.

**AC (취소/재시도 정책)**
- 사용자는 render job을 **Cancel**할 수 있다.
- 재시도는 `retry_count`를 증가시키고, 실패 단계부터 다시 실행된다.

> ETA(남은 시간)는 MVP 필수 아님. 제공하더라도 “추정치(옵션)”로만 취급한다.

---

## 7. 기술 아키텍처

### 7.1 구성요소
- **Next.js (App Router)**: UI + API Routes
- **Supabase**
  - Auth: Google + Email OTP(권장)
  - Postgres(DB)
  - Storage: 업로드/캐시/결과물 + (선택)TTS 프리뷰 캐시
  - Realtime(선택): job 상태 스트림(Phase 2)
- **Web Hosting(권장)**: Vercel
  - 웹/UI와 “짧은 API” 배포에 적합(장시간 렌더는 워커로 분리)
- **Renderer Worker(권장)**: AWS (Docker)
  - short-video-maker 포크 또는 해당 파이프라인을 워커에서 실행
  - ffmpeg/remotion 등 렌더 수행
- **TTS Provider**
  - MVP: Google Cloud TTS
  - Launch: ElevenLabs 전환/병행
- **Stock Provider**
  - Pexels + Pixabay (+ upload)

### 7.2 Job 큐 전략(단계적) + 동시성 안전
- MVP: **DB 기반 큐**
  - render_jobs 테이블에 queued 생성
  - 워커가 poll/lock으로 가져가 실행
- Scale(Phase 2+): **BullMQ + Redis**
  - 대기열/재시도/병렬 처리 강화

**(MVP 권장) Dequeue 쿼리 패턴(중복 실행 방지)**
```sql
UPDATE render_jobs
SET status = 'running', updated_at = NOW()
WHERE id = (
  SELECT id
  FROM render_jobs
  WHERE status = 'queued'
  ORDER BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING *;
```

**(MVP 권장) Stalled Job Reaper**
- `status='running'` 이지만 `updated_at`이 일정 시간(예: 15분) 이상 갱신되지 않으면 `queued`로 되돌리거나 `failed`로 전환(정책 선택).
- reaper는 cron/worker loop로 주기 실행.

---

## 8. 데이터 모델(Supabase)

### 8.1 tables

#### projects
- id (uuid, pk)
- user_id (uuid, fk auth.users)
- title
- topic
- platform (`shorts|tiktok|reels`)
- video_type
- target_duration_sec (<=60)
- script_version (int)  # 최신 스크립트 버전(참조/표시용)
- storyboard_script_version (int) # scenes 생성 당시의 scripts version
- voice_id (text, nullable) # 선택한 voice (ex. provider voice id)
- status (`draft|rendering|done|failed`)
- created_at, updated_at

#### scripts
- id
- project_id
- version
- content (text)
- source (`llm|user`)
- created_at

#### scenes
- id
- project_id
- order_index
- narration_text
- duration_sec_draft (int)
- duration_sec_final (int, nullable)
- audio_duration_ms (int, nullable)
- primary_keyword (text)
- secondary_keywords (jsonb, nullable) # Phase 2
- subtitle_style_preset_id (nullable)
- transition_effect (`none|fade|wipe|dissolve`) # Phase 4
- media_asset_id (nullable)
- created_at, updated_at

#### media_assets
- id
- owner_user_id
- provider (`pexels|pixabay|upload`)
- provider_asset_id (nullable)
- type (`video|image`)
- url_original
- url_cached (nullable)
- thumb_url
- metadata (jsonb)
- created_at

#### tts_previews (선택: Scene TTS Preview를 MVP에 넣을 때)
- id
- project_id
- scene_id
- voice_id
- text_hash
- audio_url (storage path)
- created_at, expires_at (nullable)

#### render_jobs
- id
- project_id
- status (`queued|running|failed|succeeded|canceled`)
- current_step (`tts|subtitle|media|render`)  # script 생성은 사전 단계로 취급 가능
- progress (0~100)
- eta_sec (nullable) # 옵션(추정치)
- error_code (nullable)
- error_message (nullable)
- retry_count
- storyboard_script_version_snapshot (int) # Render 시작 시점의 storyboard 기준
- script_version_snapshot (int, nullable) # 옵션(감사/추적용)
- voice_id_snapshot (text, nullable) # Render 시작 시점 고정
- created_at, updated_at

#### job_steps
- id
- render_job_id
- step_name
- status (`pending|running|failed|done`)
- started_at, ended_at
- log (text or jsonb)

#### exports
- id
- project_id
- render_job_id
- video_url
- duration_sec
- created_at

### 8.2 RLS(최소)
- 모든 주요 테이블: `user_id = auth.uid()` 기반 접근 제한
- exports/media_assets/tts_previews: 소유자만 접근

---

## 9. API (제안)

### 프로젝트/스크립트
- POST `/api/projects`
- POST `/api/projects/:id/script/generate`
- POST `/api/projects/:id/script/rewrite`

### 씬 생성
- POST `/api/projects/:id/scenes/generate`

### Voice / TTS Preview
- GET  `/api/voices`  # Voice Library 목록(고정/캐시 가능)
- PATCH `/api/projects/:id/voice` `{voice_id}`
- POST `/api/scenes/:sceneId/tts/preview` `{voice_id}`  # 옵션(MVP 선택)

### 씬 편집/스톡
- PATCH `/api/scenes/:sceneId`
- GET `/api/stock/search?...` # cache: provider policy (Pexels 10m / Pixabay 24h)
- POST `/api/scenes/:sceneId/media/select`
- POST `/api/scenes/:sceneId/media/undo`
- POST `/api/scenes/:sceneId/media/upload`  # 사용자 업로드(권장: MVP)

### 렌더
- POST `/api/projects/:id/render/start`
- GET  `/api/render/jobs/:jobId`
- POST `/api/render/jobs/:jobId/retry`
- POST `/api/render/jobs/:jobId/cancel`

---

## 10. 성공 지표(MVP)
- Topic → Script 생성 성공률
- Script → Storyboard 진입률
- Storyboard → Render 시작률
- Render 완료율
- 씬 교체 사용률 / 평균 교체 횟수(씬당)
- 문제 씬 교체 평균 소요시간(Goal: 씬당 10초 내)
- Voice 선택 완료율(프로젝트당)
- (옵션) Scene TTS Preview 사용률 / 프리뷰 생성 성공률
- 단계별 실패율(TTS/stock/render)

---

## 11. 단계별 로드맵
### M0 (Foundation)
- Next.js + Supabase(Auth/DB/RLS/Storage) 골격
- projects/scripts/scenes CRUD + 기본 UI

### M1 (핵심가치 1)
- Script generate + rewrite(4버튼)

### M2 (핵심가치 2)
- Storyboard UI + 교체 패널 UX(원클릭/Undo)
- Pexels+Pixabay 통합/탭 검색
- 검색 디바운스 + provider별 캐시 정책 적용(Pexels 10m / Pixabay 24h)

### M2.5 (Voice, MVP)
- Voice Library + 샘플 재생
- 프로젝트 voice 선택 저장
- (옵션) 씬 단위 TTS 프리뷰 + 캐시

### M3 (핵심가치 3)
- render_jobs + 워커(Dequeue/Skip Locked + Reaper) + 진행/로그
- Duration 정책(TTS 기준) 적용
- 재시도(단계별) + 대체경로(Stock provider fallback, 업로드, (옵션) 이미지 생성)
- exports 다운로드

### M4 (Polish/Phase)
- keep_best_effort(재분할/미디어 보존) 도입 + 관련 UX/지표
- Realtime 업데이트(SSE/Realtime) 옵션
- BullMQ 전환
- secondary_keywords 활용
- Transition 효과
- (Phase 2) 씬 추가/삭제/분할/병합 + 텍스트 편집 고도화

---

## 12. 리스크 & 대응
- 스톡 매칭 부정확: 점수화보다 교체 UX로 해결
- **스크립트-스토리보드 불일치**: storyboard_script_version 저장 + UI 안내 + (Render SoT는 scenes) + Render 시작 시 스냅샷 고정
- TTS 길이 불일치: TTS 기반 duration 확정 후 미디어 컷/루프
- 렌더 실패/지연: 비동기 Job + 단계별 재시도/대체경로 + job_steps + stalled reaper
- 외부 API 레이트리밋/약관: provider별 캐시/디바운스/전환 + 자동화 쿼리 남발 금지
- 비용: MVP는 Google TTS로 비용 예측/절감, 런칭은 ElevenLabs로 품질 강화 + 프리뷰 캐시로 불필요 호출 최소화
