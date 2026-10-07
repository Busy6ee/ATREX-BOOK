/* 전역 MB 헬퍼의 구성 방식(레이아웃 자동 생성, canvas·range·seg 헬퍼, three.js 씬 헬퍼)은
   geniuskey/memorybook(MIT, Copyright (c) 2026 geniuskey and MemoryBook contributors)의
   정적 사이트 규약을 따른다. 고지 전문은 ../LICENSE-MIT 와 ../NOTICE.md 에 있다. */
/* ==========================================================================
   ATREX-BOOK 공통 스크립트 — 전역 객체 MB
   - 레이아웃(상단바, 챕터 서랍, 목차, 이전/다음, 푸터, 테마, 검색) 자동 생성
   - 시뮬레이터 헬퍼: canvas, loop, range, seg, stat, rng, 색/포맷
   classic script 만 사용한다(file:// 로 열어도 동작). <head>에서 defer 없이 로드하고
   페이지별 스크립트는 </body> 직전에 둔다.
   ========================================================================== */
(function () {
  "use strict";

  const SOURCE = "https://github.com/jiwoochris/artex-ko";

  // 공개 여부의 단일 출처. ready:true 인 장만 서랍·이전/다음·검색·홈 카드에 링크로 나타난다.
  // 장 파일을 올릴 때 해당 항목에 ready: true 를 추가한다.
  const CHAPTERS = [
    { slug: "overview",  num: "01", title: "전체 구조 한눈에",        desc: "ARTEX 가 풀려는 문제, 패키지 지도, 코드 규모, 기술 스택. 이 책을 읽는 순서.", tags: ["개관", "sim"], ready: true },
    { slug: "graphs",    num: "02", title: "이중 그래프",             desc: "탐색 그래프와 자산 그래프, 그리고 둘을 잇는 앵커. 노드·간선·상태의 설계와 커버리지 정의.", tags: ["데이터", "sim"], ready: true },
    { slug: "agents",    num: "03", title: "에이전트 역할 구성",       desc: "목표 분해 · 계획 · 실행 · 사람 인터페이스. 역할별 도구 권한과 책임 경계.", tags: ["에이전트", "sim"], ready: true },
    { slug: "engine",    num: "04", title: "엔진과 의도 생명주기",     desc: "이벤트 구동 폐곡선, 디바운스와 하트비트, 의도 상태 전이, 재시도와 수습 단계.", tags: ["엔진", "sim"] },
    { slug: "planning",  num: "05", title: "계획 연속성과 기억 압축",  desc: "무상태 세션 위의 공유 할 일 목록, 실행 과정 교환, 콜드 다이제스트 압축.", tags: ["메모리", "sim"] },
    { slug: "tools",     num: "06", title: "도구 · 스킬 · MCP 계층",   desc: "역할별 도구 세트, DB 오버라이드, 지연 로딩 MCP, 패닉 격리.", tags: ["도구", "sim"] },
    { slug: "safety",    num: "07", title: "안전 게이트와 사람 승인",  desc: "훅, 규칙 우선순위, LLM 판정, 사람 승인과 타임아웃 정책, 감사 기록.", tags: ["안전", "sim"] },
    { slug: "evidence",  num: "08", title: "감사 가능성: 기록과 증거", desc: "트래픽 기록, 증거 저장소, 취약점-트래픽 바인딩, 낙관적 버전 잠금.", tags: ["증거", "sim"] },
    { slug: "llm",       num: "09", title: "LLM 풀과 복원력",          desc: "프로파일 체인, 장애 전환 규칙, 회로 차단기, 쿼터 감지, 종료 사유와 수습.", tags: ["복원력", "sim"] },
    { slug: "server",    num: "10", title: "서버 · 데이터 · 운영",     desc: "작업 수명주기, 스케줄러, 알림 채널, 자가 업데이트와 롤백, 49개 테이블 지도.", tags: ["운영", "sim"] },
    { slug: "defense",   num: "11", title: "방어 · 탐지 관점",         desc: "방어자가 관측할 수 있는 지문, Sigma · Suricata 규칙 구성, 하드닝 체크리스트.", tags: ["방어", "sim"] },
    { slug: "glossary",  num: "12", title: "용어집 & 종합 퀴즈",       desc: "핵심 용어 검색과 종합 퀴즈.", tags: ["정리"] },
  ];

  const MB = (window.MB = {});
  MB.CHAPTERS = CHAPTERS;
  MB.SOURCE = SOURCE;

  /* ------------------------------------------------------------ utils */
  MB.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  MB.lerp = (a, b, t) => a + (b - a) * t;
  MB.fmt = function (x, digits = 3) {
    if (!isFinite(x)) return "—";
    if (x === 0) return "0";
    return Number(x.toPrecision(digits)).toLocaleString("en-US", { maximumFractionDigits: 6 });
  };
  /** 시드 고정 난수(mulberry32): 시뮬레이터 결과를 재현 가능하게 한다. */
  MB.rng = function (seed) {
    let a = seed >>> 0;
    const f = function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.reseed = (s) => { a = s >>> 0; };
    return f;
  };
  MB.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  MB.$ = (sel, root) => (root || document).querySelector(sel);
  MB.$$ = (sel, root) => [...(root || document).querySelectorAll(sel)];

  /* ------------------------------------------------------------ theme */
  const themeCbs = [];
  MB.onTheme = (cb) => themeCbs.push(cb);
  MB.isDark = function () {
    const t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  };
  MB.color = (name) => getComputedStyle(document.documentElement).getPropertyValue("--" + name).trim();
  MB.palette = function () {
    const c = MB.color;
    return {
      bg: c("canvas-bg"), text: c("text"), dim: c("text-dim"), faint: c("text-faint"), grid: c("grid"), axis: c("axis"),
      border: c("border"), surface: c("surface"), elev: c("bg-elev"), accent: c("accent"), accent2: c("accent-2"),
      ok: c("ok"), warn: c("warn"), bad: c("bad"),
    };
  };
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme");
    themeCbs.forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });
  }
  try { const saved = localStorage.getItem("atrex-theme"); if (saved) document.documentElement.setAttribute("data-theme", saved); } catch (e) {}
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", () => { if (!document.documentElement.getAttribute("data-theme")) applyTheme(null); });
  }

  /* ------------------------------------------------------------ canvas / loop */
  /** HiDPI 캔버스. 폭은 부모 폭, 높이는 aspect 또는 height. draw(ctx,w,h) 는 리사이즈·테마 변경 시 자동 호출. */
  MB.canvas = function (canvas, draw, opts) {
    opts = opts || {};
    if (typeof canvas === "string") canvas = document.querySelector(canvas);
    const ctx = canvas.getContext("2d");
    const st = { ctx, w: 0, h: 0, canvas, dpr: 1 };
    function resize() {
      const parent = canvas.parentElement;
      const w = Math.max(opts.minWidth || 0, 200, Math.floor(opts.width || parent.clientWidth || 600));
      let h = (typeof opts.height === "function" ? opts.height(w) : opts.height) || Math.round(w * (opts.aspect || 0.5));
      if (opts.minHeight) h = Math.max(h, opts.minHeight);
      if (opts.maxHeight) h = Math.min(h, opts.maxHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.height = h + "px";
      if (opts.minWidth) { canvas.style.width = w + "px"; canvas.style.maxWidth = "none"; parent.style.overflowX = "auto"; }  // 좁은 화면에서는 카드 안에서 가로 스크롤
      st.w = w; st.h = h; st.dpr = dpr;
      st.redraw();
    }
    st.redraw = function () {
      if (!st.w) return;
      ctx.save();
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      ctx.clearRect(0, 0, st.w, st.h);
      ctx.fillStyle = MB.color("canvas-bg"); ctx.fillRect(0, 0, st.w, st.h);
      try { draw && draw(ctx, st.w, st.h); } finally { ctx.restore(); }
    };
    st.resize = resize;
    if (window.ResizeObserver) {
      let last = -1;
      new ResizeObserver(() => { const w = canvas.parentElement.clientWidth; if (w !== last) { last = w; resize(); } }).observe(canvas.parentElement);
    } else window.addEventListener("resize", resize);
    MB.onTheme(() => st.redraw());
    resize();
    return st;
  };
  /** 화면에 보일 때만 도는 rAF 루프. fn(dt초, t초) */
  MB.loop = function (el, fn) {
    let raf = 0, last = 0, t = 0, visible = true, running = true;
    function frame(ts) {
      raf = 0;
      if (!running || !visible) return;
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
      last = ts; t += dt; fn(dt, t);
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && running && visible) { last = 0; raf = requestAnimationFrame(frame); } }
    if (window.IntersectionObserver && el) new IntersectionObserver((es) => { visible = es[0].isIntersecting; kick(); }).observe(el);
    kick();
    return {
      start() { running = true; kick(); },
      stop() { running = false; },
      get running() { return running; },
      toggle() { if (running) running = false; else { running = true; kick(); } return running; },
    };
  };
  /** 둥근 사각형 경로 */
  MB.rr = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  MB.arrow = function (ctx, x1, y1, x2, y2, head) {
    head = head || 7;
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45));
    ctx.lineTo(x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45));
    ctx.closePath(); ctx.fill();
  };

  /* ------------------------------------------------------------ controls */
  /** range 입력 바인딩. output 은 id+"-out" 요소. get() → 현재 값. */
  MB.range = function (id, fmt, onInput) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    const out = document.getElementById(el.id + "-out");
    const update = (fire) => {
      const v = Number(el.value);
      const pct = ((v - Number(el.min || 0)) / (Number(el.max || 100) - Number(el.min || 0))) * 100;
      el.style.setProperty("--fill", pct + "%");
      if (out) out.textContent = fmt ? fmt(v) : String(v);
      if (fire && onInput) onInput(v);
    };
    el.addEventListener("input", () => update(true));
    update(false);
    const get = () => Number(el.value);
    get.set = (v) => { el.value = v; update(true); };
    return get;
  };
  /** 세그먼트 버튼. get() → 현재 data-value */
  MB.seg = function (id, onChange) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    const btns = [...el.querySelectorAll("button")];
    let cur = (btns.find((b) => b.classList.contains("on")) || btns[0]).dataset.value;
    const set = (v, fire) => {
      cur = v;
      btns.forEach((b) => { const on = b.dataset.value === v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
      if (fire !== false && onChange) onChange(v);
    };
    btns.forEach((b) => b.addEventListener("click", () => set(b.dataset.value)));
    set(cur, false);
    const get = () => cur; get.set = set; return get;
  };
  MB.stat = function (id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  /** 로그 패널. MB.log(el).add("텍스트", "ok|bad|warn|acc") */
  MB.log = function (el, max) {
    if (typeof el === "string") el = document.getElementById(el);
    max = max || 200;
    return {
      add(text, cls) {
        const d = document.createElement("div"); if (cls) d.className = cls; d.textContent = text;
        el.appendChild(d); while (el.children.length > max) el.removeChild(el.firstChild);
        el.scrollTop = el.scrollHeight;
      },
      clear() { el.textContent = ""; },
    };
  };

  /* ------------------------------------------------------------ three.js helper */
  /**
   * three.js 씬 준비(전역 THREE, THREE.OrbitControls 필요).
   *   const T = MB.three(el, { camera:[x,y,z], target:[x,y,z], fov, autoRotate, minDistance, maxDistance });
   *   T.scene / T.camera / T.renderer / T.controls / T.THREE
   *   T.onFrame((dt,t)=>{...});  T.label('텍스트', [x,y,z]) → HTML 라벨(자동 투영)
   *   T.material(color, opts) → MeshStandardMaterial
   * 조명, 리사이즈, 화면 밖 일시정지 포함. 라이브러리가 없으면 안내 문구를 넣고 null 을 반환한다.
   */
  MB.three = function (container, opts) {
    opts = opts || {};
    if (typeof container === "string") container = document.querySelector(container);
    if (!window.THREE) {
      container.innerHTML = '<p style="padding:20px;color:var(--text-dim);font-size:14px">3D 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요. (아래 설명과 2D 그림으로 내용을 확인할 수 있습니다.)</p>';
      return null;
    }
    const THREE = window.THREE;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch (e) {
      container.innerHTML = '<p style="padding:20px;color:var(--text-dim);font-size:14px">이 환경에서는 WebGL 을 사용할 수 없어 3D 모델을 표시하지 못했습니다.</p>';
      return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding; // r147 기본값은 선형 출력이라 색이 탁해진다
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(opts.fov || 40, 1, 0.01, 2000);
    camera.position.set.apply(camera.position, opts.camera || [6, 5, 8]);
    const controls = THREE.OrbitControls ? new THREE.OrbitControls(camera, renderer.domElement) : null;
    const target = opts.target || [0, 0, 0];
    if (controls) {
      controls.target.set.apply(controls.target, target);
      controls.enableDamping = true; controls.dampingFactor = 0.08;
      controls.autoRotate = !!opts.autoRotate; controls.autoRotateSpeed = opts.autoRotateSpeed || 0.8;
      controls.enablePan = opts.pan !== false;
      if (opts.minDistance) controls.minDistance = opts.minDistance;
      if (opts.maxDistance) controls.maxDistance = opts.maxDistance;
      controls.update();
    } else camera.lookAt.apply(camera, target);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445066, 0.8));
    const d1 = new THREE.DirectionalLight(0xffffff, 0.8); d1.position.set(5, 10, 7); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xbfd7ff, 0.35); d2.position.set(-6, 4, -5); scene.add(d2);

    const labelLayer = document.createElement("div");
    labelLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden";
    container.appendChild(labelLayer);
    const labels = [], frameCbs = [];
    const T = { THREE, scene, camera, renderer, controls, container, labels };
    T.onFrame = (cb) => frameCbs.push(cb);
    T.label = function (text, pos, cls) {
      const el = document.createElement("div");
      el.className = "overlay-label" + (cls ? " " + cls : "");
      el.innerHTML = text;
      labelLayer.appendChild(el);
      const L = { el, pos: pos.clone ? pos.clone() : new THREE.Vector3(pos[0], pos[1], pos[2]), visible: true, obj: null };
      L.setVisible = (v) => { L.visible = v; el.style.display = v ? "" : "none"; };
      labels.push(L);
      return L;
    };
    T.material = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.5, metalness: 0.08 }, o || {}));
    function resize() {
      const w = container.clientWidth, h = container.clientHeight || 400;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px";
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(container); else window.addEventListener("resize", resize);
    resize();
    const v = new THREE.Vector3();
    T.loop = MB.loop(container, (dt, t) => {
      frameCbs.forEach((cb) => cb(dt, t));
      if (controls) controls.update();
      renderer.render(scene, camera);
      const w = container.clientWidth, h = container.clientHeight;
      labels.forEach((L) => {
        if (!L.visible) return;
        v.copy(L.pos); if (L.obj) L.obj.localToWorld(v);
        v.project(camera);
        L.el.style.display = v.z > 1 ? "none" : "";
        L.el.style.left = ((v.x + 1) / 2) * w + "px";
        L.el.style.top = ((1 - v.y) / 2) * h + "px";
      });
    });
    return T;
  };

  /* ------------------------------------------------------------ layout */
  const LOGO = '<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="abg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs><rect x="2" y="2" width="28" height="28" rx="8" fill="url(#abg)"/><circle cx="16" cy="9.5" r="2.6" fill="#fff"/><circle cx="9" cy="22" r="2.6" fill="#fff"/><circle cx="23" cy="22" r="2.6" fill="#fff"/><path d="M15 12l-5 8M17 12l5 8M12 22h8" stroke="#fff" stroke-width="1.7" stroke-linecap="round" fill="none"/></svg>';
  const ICON_MENU = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  const ICON_MOON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const ICON_SUN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

  function build() {
    const body = document.body;
    const root = body.dataset.root != null ? body.dataset.root : body.dataset.chapter ? "../" : "";
    const curSlug = body.dataset.chapter || "";
    const href = (slug) => (slug ? `${root}chapters/${slug}.html` : `${root}index.html`);

    // 본문 속 장 링크: <a data-ch="slug"></a>. 공개된 장은 링크로, 아직 없는 장은 링크 없는 표시로 바꾼다.
    document.querySelectorAll("a[data-ch]").forEach((a) => {
      const c = CHAPTERS.find((x) => x.slug === a.dataset.ch);
      if (!c) return;
      if (!a.textContent.trim()) a.textContent = c.num;
      if (c.ready) { a.setAttribute("href", href(c.slug)); return; }
      const sp = document.createElement("span");
      sp.className = "ch-soon"; sp.title = "준비 중"; sp.textContent = a.textContent;
      a.replaceWith(sp);
    });

    const bar = document.createElement("header");
    bar.className = "mb-topbar";
    bar.innerHTML = `
      <div class="book-nav-left">
        <button class="mb-btn icon" id="mb-menu" aria-label="챕터 목록">${ICON_MENU}</button>
        <a class="mb-logo" href="${href("")}">${LOGO}<span>ATREX-BOOK <small>자율 에이전트 해부서</small></span></a>
      </div>
      <div class="book-search">
        <svg class="book-search-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
        <input type="search" aria-label="이 책의 챕터, 섹션, 시뮬레이터 검색" placeholder="이 책 검색" autocomplete="off">
        <div class="book-search-results" aria-live="polite"></div>
      </div>
      <div class="book-nav-right">
        <button class="mb-btn icon" id="mb-theme" aria-label="테마 전환"></button>
      </div>
      <div class="mb-progress" id="mb-progress"></div>`;
    body.prepend(bar);

    // search
    const search = bar.querySelector(".book-search");
    const input = search.querySelector("input");
    const results = search.querySelector(".book-search-results");
    const closeSearch = () => { search.classList.remove("open"); results.replaceChildren(); };
    let detail = [], detailsLoaded = false, detailPromise = null;
    function loadDetails() {
      if (detailPromise) return detailPromise;
      detailPromise = Promise.all(CHAPTERS.filter((c) => c.ready).map(async (chapter) => {
        try {
          const r = await fetch(href(chapter.slug));
          if (!r.ok) return [];
          const doc = new DOMParser().parseFromString(await r.text(), "text/html");
          const main = doc.querySelector("main.chapter");
          if (!main) return [];
          const out = [];
          [...main.querySelectorAll("section > h2")].forEach((h, i) => out.push({ type: "섹션", title: h.textContent.trim(), chapter, hash: h.parentElement.id || `s${i + 1}` }));
          [...main.querySelectorAll(".sim")].filter((s) => s.querySelector(".sim-head h3")).forEach((s, i) => out.push({ type: "시뮬레이터", title: s.querySelector(".sim-head h3").textContent.trim(), chapter, hash: s.id || `sim-${i + 1}` }));
          return out;
        } catch (e) { return []; }
      })).then((parts) => { detail = parts.flat(); detailsLoaded = true; renderSearch(); });
      return detailPromise;
    }
    function renderSearch() {
      const words = input.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      results.replaceChildren();
      if (!words.length) { closeSearch(); return; }
      const has = (v) => words.every((w) => v.toLocaleLowerCase().includes(w));
      const ch = CHAPTERS.filter((c) => c.ready).filter((c) => has([c.num, c.title, c.desc, ...(c.tags || [])].join(" "))).map((c) => ({ type: "챕터", title: c.title, chapter: c, hash: "" }));
      const dm = detail.filter((e) => has(e.title));
      const matches = [...ch.slice(0, 4), ...dm.filter((e) => e.type === "섹션").slice(0, 6), ...dm.filter((e) => e.type === "시뮬레이터").slice(0, 4)];
      matches.forEach((e) => {
        const a = document.createElement("a");
        a.href = href(e.chapter.slug) + (e.hash ? "#" + e.hash : "");
        const s = document.createElement("strong"); s.textContent = e.title;
        const m = document.createElement("small"); m.textContent = `${e.chapter.num} · ${e.chapter.title} · ${e.type}`;
        a.append(s, m); results.appendChild(a);
      });
      if (detailPromise && !detailsLoaded) { const p = document.createElement("p"); p.textContent = "섹션 목록을 불러오는 중…"; results.appendChild(p); }
      else if (!matches.length) { const p = document.createElement("p"); p.textContent = "검색 결과가 없습니다"; results.appendChild(p); }
      search.classList.add("open");
    }
    input.addEventListener("input", () => { if (input.value.trim()) loadDetails(); renderSearch(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeSearch(); input.blur(); }
      else if (e.key === "ArrowDown") { const f = results.querySelector("a"); if (f) { e.preventDefault(); f.focus(); } }
      else if (e.key === "Enter") { const f = results.querySelector("a"); if (f) { e.preventDefault(); f.click(); } }
    });
    results.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeSearch(); input.focus(); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const links = [...results.querySelectorAll("a")];
        const next = links.indexOf(document.activeElement) + (e.key === "ArrowDown" ? 1 : -1);
        e.preventDefault(); (links[next] || input).focus();
      }
    });
    document.addEventListener("pointerdown", (e) => { if (!search.contains(e.target)) closeSearch(); });

    // drawer
    const drawer = document.createElement("nav");
    drawer.className = "mb-drawer";
    drawer.setAttribute("aria-label", "챕터 목록");
    drawer.innerHTML = `<h4>Chapters</h4><ul class="mb-chlist">
      <li><a href="${href("")}" class="${curSlug ? "" : "active"}"><span class="num">00</span><span>홈 · 로드맵</span></a></li>
      ${CHAPTERS.map((c) => c.ready
        ? `<li><a href="${href(c.slug)}" class="${c.slug === curSlug ? "active" : ""}"><span class="num">${c.num}</span><span>${c.title}</span></a></li>`
        : `<li><span class="item soon" aria-disabled="true"><span class="num">${c.num}</span><span>${c.title} <em>준비 중</em></span></span></li>`).join("")}
    </ul>`;
    const backdrop = document.createElement("div");
    backdrop.className = "mb-drawer-backdrop";
    body.append(backdrop, drawer);
    const toggleDrawer = (o) => body.classList.toggle("drawer-open", o);
    bar.querySelector("#mb-menu").addEventListener("click", () => toggleDrawer(true));
    backdrop.addEventListener("click", () => toggleDrawer(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleDrawer(false); });

    // theme
    const tbtn = bar.querySelector("#mb-theme");
    const setIcon = () => (tbtn.innerHTML = MB.isDark() ? ICON_SUN : ICON_MOON);
    setIcon();
    tbtn.addEventListener("click", () => {
      const next = MB.isDark() ? "light" : "dark";
      try { localStorage.setItem("atrex-theme", next); } catch (e) {}
      applyTheme(next); setIcon();
    });

    // progress
    const prog = bar.querySelector("#mb-progress");
    const onScroll = () => { const h = document.documentElement.scrollHeight - innerHeight; prog.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%"; };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();

    // chapter extras
    const main = document.querySelector("main.chapter");
    if (main) {
      [...main.querySelectorAll(".sim")].filter((s) => s.querySelector(".sim-head h3")).forEach((s, i) => { if (!s.id) s.id = `sim-${i + 1}`; });
      const layout = document.createElement("div");
      layout.className = "mb-layout";
      main.parentNode.insertBefore(layout, main);
      layout.appendChild(main);
      const toc = document.createElement("aside");
      toc.className = "mb-toc";
      const h2s = [...main.querySelectorAll("section > h2")];
      let n = 0;
      toc.innerHTML = "<h4>ON THIS PAGE</h4>" + h2s.map((h, i) => {
        const sec = h.parentElement;
        if (!sec.id) sec.id = "s" + (i + 1);
        const numbered = !sec.classList.contains("keypoints") && !sec.classList.contains("quiz-sec") && !sec.hasAttribute("data-nonum");
        if (numbered && !h.querySelector(".h-num")) { n++; h.insertAdjacentHTML("afterbegin", `<span class="h-num">${String(n).padStart(2, "0")}</span>`); }
        return `<a href="#${sec.id}">${MB.esc(h.textContent.replace(/^\d\d/, "").trim())}</a>`;
      }).join("");
      layout.appendChild(toc);
      const links = [...toc.querySelectorAll("a")];
      if (window.IntersectionObserver && h2s.length) {
        const io = new IntersectionObserver((es) => {
          es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id)); });
        }, { rootMargin: "-20% 0px -70% 0px" });
        h2s.forEach((h) => io.observe(h.parentElement));
      }
      const pub = CHAPTERS.filter((c) => c.ready);
      const idx = pub.findIndex((c) => c.slug === curSlug);
      const prev = idx > 0 ? pub[idx - 1] : null;
      const next = idx >= 0 && idx < pub.length - 1 ? pub[idx + 1] : null;
      const pager = document.createElement("nav");
      pager.className = "mb-pager";
      pager.setAttribute("aria-label", "이전·다음 챕터");
      pager.innerHTML =
        (prev ? `<a class="prev" href="${href(prev.slug)}"><small>← 이전 · ${prev.num}</small>${prev.title}</a>` : `<a class="prev" href="${href("")}"><small>← 처음으로</small>홈 · 로드맵</a>`) +
        (next ? `<a class="next" href="${href(next.slug)}"><small>다음 · ${next.num} →</small>${next.title}</a>` : "");
      layout.after(pager);
    }

    const foot = document.createElement("footer");
    foot.className = "mb-foot";
    foot.innerHTML = `ATREX-BOOK — 오픈소스 <a href="${SOURCE}" target="_blank" rel="noopener">artex-ko</a> 의 아키텍처·에이전트 구성·동작 원리를 코드 수준에서 해설한 학습서입니다.<br>
      방어와 학습 목적의 해설서이며, 공격 절차·프롬프트 원문·페이로드는 싣지 않습니다. 수치와 시뮬레이터는 설계를 이해하기 위한 단순화 모델입니다.`;
    body.appendChild(foot);

    // quiz
    document.querySelectorAll(".quiz").forEach((quiz) => {
      const qs = [...quiz.querySelectorAll(".quiz-q")];
      let answered = 0, correct = 0;
      const score = document.createElement("div");
      score.className = "quiz-score";
      quiz.appendChild(score);
      qs.forEach((q) => {
        const opts = [...q.querySelectorAll("button.opt")];
        opts.forEach((b) => b.addEventListener("click", () => {
          opts.forEach((o) => { o.disabled = true; if (o.hasAttribute("data-correct")) o.classList.add("right"); });
          const ok = b.hasAttribute("data-correct");
          if (!ok) b.classList.add("wrong");
          q.classList.add("done");
          answered++; if (ok) correct++;
          score.textContent = `정답 ${correct} / 응답 ${answered} / 전체 ${qs.length}`;
        }));
      });
    });

    // KaTeX (CDN, defer) — 수식 구분자: $$..$$ 디스플레이, \(..\) 인라인
    const renderMath = () => {
      if (window.renderMathInElement) {
        window.renderMathInElement(document.body, {
          delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\(", right: "\\)", display: false }],
          throwOnError: false,
          ignoredClasses: ["no-math"],
        });
      }
    };
    if (window.renderMathInElement) renderMath(); else window.addEventListener("load", renderMath);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
