# ATREX-BOOK 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`.
로컬 실행: `python3 -m http.server 8000` → http://localhost:8000/chapters/overview.html
`file://` 로 열어도 동작하게 classic script 만 사용한다. ES module 은 쓰지 않는다.

## 범위

이 책은 방어와 학습 목적의 해설서다. 아키텍처, 상태 관리, 안전장치, 복원력, 운영, 방어 관점을 다룬다.
공격 절차, 에이전트 프롬프트 원문, 페이로드, 우회 방법은 싣지 않는다. 기준은 01장의 "해설서의 선"이다.

## 원칙

- 한국어로 쓴다. 영어 원어는 처음 나올 때 병기한다.
- 수치는 분석한 커밋에서 직접 센 값만 쓴다. 근거 커밋을 본문에 밝힌다. 시뮬레이터는 "단순화 모델"임을 밝힌다.
- 외부 라이브러리는 KaTeX 0.16.9 와 three.js r147 두 가지만 허용한다. 이미지 파일 대신 인라인 SVG 와 canvas 로 그린다.
- three.js 는 3D 가 실제로 필요한 페이지에만 넣는다. `MB.three` 가 전역 `THREE` 와 `THREE.OrbitControls` 를 전제로 하므로 전역 빌드(UMD)가 있는 r147 에 고정한다. 버전을 올리면 로드 방식을 바꿔야 한다.
- 색은 하드코딩하지 말고 CSS 변수(`var(--accent)` 등)나 `MB.palette()` 를 쓴다. 라이트와 다크 모두 읽혀야 한다. 3D 재질색만 고정색을 허용한다.
- 폭 360px 에서 가로 스크롤이 생기면 안 된다. SVG 는 `viewBox` 만 주고 width · height 속성은 생략한다.
- CDN 로드에 실패해도 페이지가 읽혀야 한다. `MB.three` 는 라이브러리나 WebGL 이 없으면 안내문을 넣고 `null` 을 반환하므로 호출부에서 `null` 을 처리한다.

## head 템플릿

KaTeX 는 모든 챕터에 넣고, three.js 두 줄은 3D 페이지에만 넣는다. 나머지 메타 태그는 `chapters/overview.html` 의 블록을 복사해 URL · 제목 · 설명만 바꾼다.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<link rel="stylesheet" href="../css/style.css">
<script src="../js/common.js"></script>
<!-- 3D 가 필요한 페이지만 -->
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js"></script>
```

`common.js` 는 `<head>` 에서 `defer` 없이 로드하고, 페이지별 스크립트는 `</body>` 직전에 둔다.
수식 구분자는 디스플레이 `$$..$$`, 인라인 `\(..\)` 이다. 수식 처리를 피할 영역에는 `no-math` 클래스를 준다.

## 3D 시뮬레이터

```html
<div class="sim" id="sim-example">
  <div class="sim-head"><span class="sim-tag three">3D</span><h3>제목</h3></div>
  <div class="sim-body"><div class="sim-view three" id="v3d"></div></div>
</div>
<script>
  const T = MB.three("#v3d", { camera: [6, 5, 8], target: [0, 0, 0], autoRotate: false });
  if (T) { /* T.scene, T.camera, T.onFrame(...), T.label("텍스트", [x, y, z]) */ }
</script>
```

## 챕터 추가

1. `chapters/<slug>.html` 을 만들고 `<body data-chapter="<slug>">` 를 지정한다. 구조는 `chapters/overview.html` 을 따른다.
2. `js/common.js` 의 `CHAPTERS` 배열에 `slug · num · title · desc · tags` 를 등록한다. 상단바, 챕터 서랍, 우측 목차, 이전/다음, 검색은 이 배열을 기준으로 자동 생성된다.
3. 3D 를 쓰면 `tags` 에 `"3d"` 를 넣고 위 head 템플릿의 three.js 두 줄을 추가한다.
4. 장 파일을 올릴 때 `CHAPTERS` 의 해당 항목에 `ready: true` 를 추가한다. 이 값이 공개 여부의 단일 출처이며, 상단 서랍, 이전/다음, 검색, 홈의 챕터 카드와 읽는 순서가 모두 이를 따른다. `ready` 가 없는 장은 링크 없이 "준비 중"으로 표시된다.
5. 본문에서 다른 장을 가리킬 때는 `<a data-ch="graphs"></a>` 처럼 쓴다. 공개된 장은 링크와 장 번호로, 아직 없는 장은 링크 없는 장 번호로 바뀌므로 404 링크가 생기지 않는다. 장 파일명을 직접 `href` 로 쓰지 않는다.

## 배포 전 검증

github.io 는 `/ATREX-BOOK/` 접두 아래에서 서빙되므로 루트(`/`)가 아니라 같은 접두로 확인한다. 임시 디렉터리에 저장소를 `ATREX-BOOK` 이름으로 링크하고 그 부모를 서빙한다. 새 장을 올리기 전에 홈에서 시작해 렌더링된 DOM 의 모든 같은 출처 링크를 따라가 200 이 아닌 응답, 자바스크립트 오류, 가로 스크롤이 없는지 확인한다.

## 알려진 공백

- `og.png` 는 챕터 공유 미리보기용 정적 이미지다. 제목을 바꾸면 다시 만들어야 한다.
- 이 책의 본문과 그림에 적용할 라이선스는 아직 정해지지 않았다([NOTICE.md](NOTICE.md) 참고).
- 저장소가 비공개일 때 외부 독자는 저장소 링크를 열 수 없으므로 사이트 본문과 푸터에는 저장소 링크를 두지 않는다.

## 라이선스

출처와 고지는 [NOTICE.md](NOTICE.md) 와 [LICENSE-MIT](LICENSE-MIT) 를 따른다. 외부 자료를 추가할 때는 원저작자 · 출처 · 라이선스를 명시한다.
