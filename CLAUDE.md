# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개요

아이용 수학 놀이 웹앱. 빌드 시스템·의존성·테스트 없음 — 정적 HTML 파일 3개가 전부다. 한국어 UI.

- `index.html` — 게임 선택 런처(직접 손으로 작성한 파일). 두 게임으로 링크.
- `treasure-map-math.html` — "수학 보물 지도"(초등 1~2학년: 덧셈/뺄셈/구구단/시계).
- `fairy-land-math.html` — "수학 요정나라"(7살 유아: 수세기/더하기/모양·색).

## 실행

빌드 불필요. 로컬에서 확인하려면 정적 서버로 띄운다:

```
python -m http.server 8000   # http://localhost:8000/index.html (배포본)
```

**편집 소스 프리뷰**: `src/*.dc.html`은 `window.React`가 있어야 렌더된다(Design 환경이 주입). 로컬 확인은:

```
node src/make-preview.mjs      # React 18 UMD 주입한 사본 → preview/*.html
node src/difficulty.test.mjs   # 난이도 로직 셀프체크
# http://localhost:8000/preview/treasure.html
```

## 아키텍처 — 게임 파일이 편집 불가능한 번들인 점이 핵심

`treasure-map-math.html`, `fairy-land-math.html`은 **손으로 작성한 소스가 아니라 Claude Artifact를 단일 파일로 export한 번들**이다(각 ~7MB). 구조:

- 상단 `<script>`가 로더. 페이지 로드 시 `<script type="__bundler/manifest">`(리소스 UUID→base64, gzip)와 `<script type="__bundler/template">`(실제 HTML을 JSON 문자열로 인코딩, 파일 끝 근처 한 줄)를 파싱해 Blob으로 재구성한다.
- template 안의 실제 앱은 **React 18 + Babel(JSX) 앱**으로, `<x-dc>` 래퍼에 폰트/스크립트가 UUID 참조로 인라인되어 있다.

따라서 repo 루트의 두 `.html` 배포본은 **손으로 수정하지 말 것.** 편집은 `src/*.dc.html`(Claude Design 소스)에서 하고, 배포본을 갱신하려면 그 `.dc.html`을 Claude Design에 다시 import → 재export해 루트 파일을 교체한다. `index.html`(런처)은 일반 HTML이라 자유롭게 편집 가능.

### 게임 로직 위치 (treasure-map)

`src/treasure-map-math.dc.html`의 `<script data-dc-script>` 안 `class Component`가 전부다. 상태는 `localStorage` 이름별 저장: `mathmap_users`={이름:{progress,history}}, `mathmap_user`=현재 이름. `progress[섬]`=깬 최고 단계(지도 해금), `history`=판별 기록(append-only). 문제는 `generateQuestion`이 매번 랜덤 생성하며, `topicDiff`(최근 성적 가중평균)→`adjRange`로 add/sub/mul 숫자 범위를 자동 조절한다. "🔄 새 모험"(`newAdventure`)은 progress만 리셋하고 history는 유지.

`src/fairy-land-math.dc.html`(요정나라)도 **동일 구조·동일 기능**이 적용돼 있다. 다른 점만: localStorage 키 `fairymath_users`/`fairymath_user`, 주제 count/add/sub/compare(자동조절 대상)+shape(레벨만). 두 파일의 `topicDiff`/`adjRange`는 동일하며 셀프체크는 `src/difficulty.test.mjs` 하나로 커버.

## 참고

- 진행 기록은 브라우저 localStorage에 아이 이름별로 저장(런처 안내 문구 기준).
- README는 사실상 비어 있음.
