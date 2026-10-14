# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개요

아이용 수학·한글 놀이 웹앱. 패키지 의존성 없음(Node 스크립트 3개는 stdlib만 사용). 한국어 UI. GitHub Pages로 정적 서빙.

- `index.html` — 게임 선택 런처(손으로 쓴 파일). 세 게임으로 링크.
- `treasure-map-math.html` — "수학 보물 지도"(초등 2학년 + 3학년 대비: 덧셈/뺄셈/구구단/네자리/시계/길이/나눗셈/분수, 섬 8개, 섬마다 Lv.1~5).
- `fairy-land-math.html` — "수학 요정나라"(입학 준비: 수세기·10개 묶음/더하기·가르기/빼기/비교·수의 순서/모양·색, Lv.1~3).
- `hangul-fairy-land.html` — "한글 요정나라"(입학 준비: 자모/글자조합/낱말·문장 읽기/첫끝소리/말놀이, Lv.1~3).

## 대상 아이 — 모든 작업은 이 두 아이 맞춤으로

이 앱은 두 아이 전용이다. 난이도·주제·문구를 고칠 때는 아래 아이 기준으로 판단한다. (공개 저장소라 성·정확한 생일은 적지 않는다.)

| | 지한 (첫째, 아들) | 시현 (둘째, 딸) |
|---|---|---|
| 출생 | 2018년 | 2020년 |
| 2026학년도 | 초등 2학년 | 7세반(유치원), 2027년 3월 초등 입학 |
| 게임 | 수학 보물 지도 | 수학 요정나라, 한글 요정나라 |

- 학년은 매년 3월에 올라간다(지한: 2027년 초3, 시현: 2027년 초1). 작업 시점의 날짜로 현재 학년을 계산해 그 학기 교과에 맞춘다.
- 지한: 2학년 2학기 = 네 자리 수, 곱셈구구, 길이 재기(m·cm), 시각과 시간(시간 단위·달력). 다음 목표는 3학년(곱셈·나눗셈, 분수 기초).
- 시현: 입학 준비 = 모으기·가르기(10까지), 50까지의 수, 받침 있는 글자·짧은 낱말 읽기.
- 런처(`index.html`)는 아이별 구역으로 나뉘고 `?name=지한`/`?name=시현`으로 게임에 들어간다. 게임은 이 파라미터로 해당 아이를 바로 선택하고(없으면 생성), 정답 칭찬의 절반은 `callName`으로 이름을 불러 준다(지한→"지한이").

## 실행

빌드 불필요. 로컬에서 확인하려면 정적 서버로 띄운다:

```
python -m http.server 8000   # http://localhost:8000/index.html (배포본)
```

**편집 소스 프리뷰**: `src/*.dc.html`은 `window.React`가 있어야 렌더된다(Design 환경이 주입). 로컬 확인은:

```
node src/make-preview.mjs      # React 18 UMD 주입한 사본 → preview/*.html
node src/difficulty.test.mjs   # 난이도 로직 셀프체크
node src/generators.test.mjs   # 세 게임 실제 클래스로 모든 주제·단계 문제 퍼즈(정답이 보기에 있는지, 등식 성립 등)
# http://localhost:8000/preview/treasure.html
```

## 아키텍처 — 루트 배포본은 생성물이다

`treasure-map-math.html`, `fairy-land-math.html`, `hangul-fairy-land.html`은 **`src/*.dc.html`에서 생성**된다. `src/build-deploy.mjs`가 React 18 UMD(unpkg CDN) `<script>` 두 줄을 주입하고 `src/support.js`를 루트로 복사할 뿐, 나머지는 소스 그대로다.

```
node src/build-deploy.mjs   # src/*.dc.html → 루트 *.html + support.js
```

따라서 루트의 게임 `.html` 세 개와 `support.js`는 **손으로 수정하지 말 것** — 다음 빌드에서 덮어써진다. 편집은 `src/*.dc.html`에서 하고, 커밋 전에 위 빌드를 돌려 루트 배포본을 갱신한다. `index.html`(런처)은 생성물이 아니라 손으로 쓴 파일이라 자유롭게 편집 가능.

`.dc.html`은 Claude Design 소스 포맷이다: `<sc-if>`/`<sc-for>` 템플릿 + `<script data-dc-script>` 안의 `class Component`. `window.React`가 있어야 렌더되므로 로컬 프리뷰는 `make-preview.mjs`를 쓴다(위 "실행" 참고).

### 게임 로직 위치 (treasure-map)

`src/treasure-map-math.dc.html`의 `<script data-dc-script>` 안 `class Component`가 전부다. 섬 목록 `this.stages`는 기록이 섬 번호(index)로 저장되므로 **새 섬은 항상 뒤에 추가**하고 순서를 바꾸지 않는다(지도 좌표 `nodePos`/`nodePosNarrow`도 같은 개수로). 상태는 `localStorage` 이름별 저장: `mathmap_users`={이름:{progress,history}}, `mathmap_user`=현재 이름. `progress[섬]`=깬 최고 단계(지도 해금), `history`=판별 기록(append-only). 문제는 `generateQuestion`이 매번 랜덤 생성하며, `topicDiff`(최근 성적 가중평균)→`adjRange`로 add/sub/mul/div 숫자 범위를 자동 조절한다. "🔄 새 모험"(`newAdventure`)은 progress만 리셋하고 history는 유지.

`src/fairy-land-math.dc.html`(수학 요정나라)도 **동일 구조·동일 기능**이 적용돼 있다. 다른 점만: localStorage 키 `fairymath_users`/`fairymath_user`, 주제 count/add/sub/compare(자동조절 대상)+shape(레벨만).

`src/hangul-fairy-land.dc.html`(한글 요정나라)도 같은 구조다. localStorage 키 `hangulfairy_users`/`hangulfairy_user`, 주제 jamo/combine/word/sound/mean. 숫자 범위 대신 **낱말 풀의 난이도 등급**을 `topicDiff`로 조절한다. 낱말·자모 데이터는 클래스 상수(`WORDS`, `OPPO`, `GROUPS`, `CHAIN`, `LOOKALIKE` 등) 배열이고 문제는 매번 랜덤 생성.

세 파일의 `topicDiff`/`adjRange`는 동일하며 셀프체크는 `src/difficulty.test.mjs` 하나로 커버.

## 참고

- 진행 기록은 브라우저 localStorage에 아이 이름별로 저장(런처 안내 문구 기준).
- README는 사실상 비어 있음.
