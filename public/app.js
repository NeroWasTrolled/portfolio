/* ===== helpers ===== */
const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));
const isTouchLike = () => window.matchMedia("(hover: none), (pointer: coarse)").matches;

function bindPressFeedback(targets) {
  targets.forEach(el => {
    if (!el) return;
    const add = () => el.classList.add("is-pressed");
    const remove = () => el.classList.remove("is-pressed");
    el.addEventListener("pointerdown", add);
    el.addEventListener("pointerup", remove);
    el.addEventListener("pointerleave", remove);
    el.addEventListener("pointercancel", remove);
    el.addEventListener("blur", remove);
  });
}

/* ===== THEME + CUSTOMIZER ===== */
(function themeInit() {
  const root = document.documentElement;
  const themeToggle = $("#themeToggle");
  const panel = $("#themePanel");
  const openBtn = $("#openCustomizer");
  const minBtn = $("#minimizePanel");
  const accent = $("#accentColor");
  const bgInt = $("#bgIntensity");
  const save = $("#saveTheme");
  const reset = $("#resetTheme");

  const saved = JSON.parse(localStorage.getItem("theme_prefs") || "{}");
  if (saved.theme) root.setAttribute("data-theme", saved.theme);
  if (saved.accent) accent.value = saved.accent;
  if (typeof saved.bgInt === "number") bgInt.value = saved.bgInt;
  applyAccent(accent.value);
  applyBgIntensity(parseFloat(bgInt.value));
  syncThemeToggle(root.getAttribute("data-theme") || "dark");

  // alternar tema light/dark
  themeToggle.addEventListener("click", () => {
    const cur = root.getAttribute("data-theme");
    const next = cur === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    syncThemeToggle(next);
    applyAccent(accent.value);
    persist();
  });

  // 🎛️ FAB abre/fecha o painel (minimiza e aumenta)
  openBtn.addEventListener("click", () => {
    const isOpen = panel.classList.toggle("open");
    if (isOpen && panel.classList.contains("min")) setMinimized(false);
    openBtn.setAttribute("aria-pressed", String(isOpen));
  });
  // botão interno "▾" apenas colapsa conteúdo sem fechar totalmente
  minBtn.addEventListener("click", () => setMinimized(!panel.classList.contains("min")));

  // controles
  accent.addEventListener("input", e => { applyAccent(e.target.value); persist(); });
  bgInt.addEventListener("input", e => { applyBgIntensity(parseFloat(e.target.value)); persist(); });
  save.onclick = persist;
  reset.onclick = () => { localStorage.removeItem("theme_prefs"); location.reload(); };

  document.addEventListener("pointerdown", e => {
    if (!panel.classList.contains("open")) return;
    if (panel.contains(e.target) || openBtn.contains(e.target)) return;
    panel.classList.remove("open");
    openBtn.setAttribute("aria-pressed", "false");
  });
  addEventListener("resize", () => {
    if (!isTouchLike()) return;
    setMinimized(false);
  }, { passive: true });

  setMinimized(false);

  function persist() {
    localStorage.setItem("theme_prefs",
      JSON.stringify({ theme: root.getAttribute("data-theme"), accent: accent.value, bgInt: parseFloat(bgInt.value) })
    );
  }
  function setMinimized(minimized) {
    panel.classList.toggle("min", minimized);
    minBtn.setAttribute("aria-pressed", String(minimized));
    minBtn.setAttribute("aria-label", minimized ? "Expandir painel" : "Minimizar painel");
    minBtn.title = minimized ? "Expandir" : "Minimizar";
    minBtn.textContent = minimized ? "▴" : "▾";
  }
  function applyAccent(hex) {
    const { h, s, l } = hexToHSL(hex);
    const theme = root.getAttribute("data-theme") || "dark";
    root.style.setProperty("--accent", hex);
    root.style.setProperty("--accent-2", `hsl(${h} ${Math.max(40, s - 5)}% ${Math.max(30, l - 10)}%)`);
    root.style.setProperty("--accent-h", h);
    if (theme === "light") {
      root.style.setProperty("--bg-r1", `color-mix(in srgb, ${hex} 15%, #ffffff)`);
      root.style.setProperty("--bg-r2", `color-mix(in srgb, ${hex} 10%, #f3f1ff)`);
      root.style.setProperty("--mock-body-start", `color-mix(in srgb, ${hex} 12%, #ffffff)`);
      root.style.setProperty("--mock-chrome-start", `color-mix(in srgb, ${hex} 8%, #ffffff)`);
      root.style.setProperty("--surface-floating-start", `color-mix(in srgb, ${hex} 12%, #ffffff)`);
      root.style.setProperty("--dot-idle", `color-mix(in srgb, ${hex} 18%, #d6cfeb)`);
      root.style.setProperty("--dot-active", hex);
      root.style.setProperty("--mock-url-text", `color-mix(in srgb, ${hex} 30%, var(--text))`);
    } else {
      root.style.setProperty("--bg-r1", `hsla(${h} 70% 35% / 0.65)`);
      root.style.setProperty("--bg-r2", `hsla(${h} 70% 28% / 0.5)`);
      root.style.setProperty("--mock-body-start", `color-mix(in srgb, ${hex} 20%, #1b1236)`);
      root.style.setProperty("--mock-chrome-start", `color-mix(in srgb, ${hex} 22%, #110b22)`);
      root.style.setProperty("--surface-floating-start", `color-mix(in srgb, ${hex} 35%, #222)`);
      root.style.setProperty("--dot-idle", `hsl(${h} 38% 36%)`);
      root.style.setProperty("--dot-active", `hsl(${h} 100% 82%)`);
      root.style.setProperty("--mock-url-text", `hsl(${h} 100% 90%)`);
    }
    window.__setBgHue?.(h);
  }
  function applyBgIntensity(v) { document.documentElement.style.setProperty("--bg-intensity", v); window.__setBgIntensity?.(v); }
  function syncThemeToggle(theme) {
    themeToggle.setAttribute("aria-pressed", String(theme === "light"));
    themeToggle.textContent = theme === "light" ? "☀︎" : "☾";
  }
  function hexToHSL(H) {
    H = H.replace("#", ""); let r, g, b;
    if (H.length === 3) { r = parseInt(H[0] + H[0], 16); g = parseInt(H[1] + H[1], 16); b = parseInt(H[2] + H[2], 16); }
    else { r = parseInt(H.slice(0, 2), 16); g = parseInt(H.slice(2, 4), 16); b = parseInt(H.slice(4, 6), 16); }
    r /= 255; g /= 255; b /= 255;
    const cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin;
    let h = 0, s = 0, l = (cmax + cmin) / 2;
    if (delta !== 0) { if (cmax === r) h = ((g - b) / delta) % 6; else if (cmax === g) h = (b - r) / delta + 2; else h = (r - g) / delta + 4; h = Math.round(h * 60); if (h < 0) h += 360; s = delta / (1 - Math.abs(2 * l - 1)); }
    return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
  }
})();

/* ===== Canvas BG ===== */
(function nebula() {
  const canvas = $("#bg"); const c = canvas.getContext("2d");
  let w, h, dpr = Math.min(devicePixelRatio || 1, 2);
  const pts = []; const MAX = 150;
  const mouse = { x: -9999, y: -9999 };
  let hue = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--accent-h")) || 270;
  let intensity = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bg-intensity")) || 0.8;
  const logoImg = new Image(); logoImg.src = "/assets/logo.png";
  let logoOk = false; logoImg.onload = () => logoOk = true; logoImg.onerror = () => { logoOk = false; };

  function resize() {
    w = canvas.width = Math.floor(innerWidth * dpr); h = canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = innerWidth + "px"; canvas.style.height = innerHeight + "px";
  }
  addEventListener("resize", resize, { passive: true }); resize();

  function rnd(a, b) { return a + Math.random() * (b - a) }
  function spawn() { pts.length = 0; for (let i = 0; i < MAX; i++) pts.push({ x: rnd(0, w), y: rnd(0, h), vx: rnd(-.25, .25), vy: rnd(-.25, .25), r: rnd(.6, 2.4) * dpr, a: rnd(.06, .22) }); }
  spawn();

  addEventListener("mousemove", e => {
    mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr;
    const sp = $("#spotlight"); sp.style.setProperty("--mx", `${e.clientX}px`); sp.style.setProperty("--my", `${e.clientY}px`);
  }, { passive: true });

  function step() {
    c.clearRect(0, 0, w, h);
    const g = c.createRadialGradient(w * 0.2, h * 0.1, 0, w * 0.2, h * 0.1, Math.max(w, h) * 0.8);
    g.addColorStop(0, `hsla(${hue}, 80%, 60%, ${0.12 * intensity})`); g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g; c.fillRect(0, 0, w, h);

    const now = performance.now() / 10000;
    for (const p of pts) {
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
      if (d2 < (150 * dpr) ** 2) { const f = .04 * (1 - d2 / ((150 * dpr) ** 2)); p.vx += dx * f * .001; p.vy += dy * f * .001; }
      p.vx += Math.sin(p.y * .0008 + now) * .003; p.vy += Math.cos(p.x * .0008 + now) * .003;
      p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1;
      c.beginPath(); c.fillStyle = `hsla(${hue}, 80%, 70%, ${p.a * intensity})`; c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
    }
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      for (let j = i + 1; j < i + 11 && j < pts.length; j++) {
        const b = pts[j]; const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < (110 * dpr) ** 2) { c.strokeStyle = `hsla(${hue}, 80%, 60%, ${0.014 * intensity * (1 - d2 / ((110 * dpr) ** 2))})`; c.lineWidth = 1 * dpr; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
      }
    }

    const t = performance.now() / 8000, size = Math.min(w, h) * 0.25;
    c.save(); c.globalAlpha = 0.06 * intensity; c.translate(w * 0.8, h * 0.85); c.rotate(t);
    if (logoOk) { c.drawImage(logoImg, -size / 2, -size / 2, size, size); }
    else { c.fillStyle = `hsla(${hue},80%,70%,.35)`; c.beginPath(); c.arc(0, 0, size * 0.5, 0, Math.PI * 2); c.fill(); c.fillStyle = "#fff"; c.font = `${size * 0.22}px Outfit, system-ui`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("GF", 0, 0); }
    c.restore();
    requestAnimationFrame(step);
  }
  step();

  window.__setBgIntensity = v => intensity = v;
  window.__setBgHue = h => hue = h;
})();

/* ===== Header, Scrollspy e botão ToTop ===== */
(function headerFX() {
  const header = $("#siteHeader"), toTop = $("#toTop");
  if (!header || !toTop) return;

  const getThreshold = () => window.matchMedia("(max-width: 760px)").matches ? 80 : 220;
  const getScrollY = () => Math.max(
    window.scrollY || 0,
    window.pageYOffset || 0,
    document.documentElement.scrollTop || 0,
    document.body.scrollTop || 0
  );

  const onScroll = () => {
    const y = getScrollY();
    header.classList.toggle("scrolled", y > 10);
    toTop.classList.toggle("show", y > getThreshold());
    toTop.classList.toggle("at-top", y <= 10);
  };

  let rafId = 0;
  const scheduleSync = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      onScroll();
    });
  };

  addEventListener("scroll", scheduleSync, { passive: true });
  document.addEventListener("scroll", scheduleSync, { passive: true, capture: true });
  addEventListener("resize", scheduleSync, { passive: true });
  addEventListener("wheel", scheduleSync, { passive: true });
  addEventListener("touchmove", scheduleSync, { passive: true });
  addEventListener("keydown", scheduleSync);
  onScroll();

  const smoothScrollTopFallback = () => {
    const start = getScrollY();
    if (start <= 0) return;
    const duration = 320;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const y = Math.round(start * (1 - eased));
      window.scrollTo(0, y);
      document.documentElement.scrollTop = y;
      document.body.scrollTop = y;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  toTop.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (toTop.classList.contains("at-top")) return;
    const rootScroller = document.scrollingElement || document.documentElement;
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      rootScroller?.scrollTo?.({ top: 0, left: 0, behavior: "smooth" });
    } catch {
      smoothScrollTopFallback();
      return;
    }

    setTimeout(() => {
      if (getScrollY() > 2) smoothScrollTopFallback();
    }, 380);
  });
  bindPressFeedback([toTop, $("#themeToggle"), $("#openCustomizer")]);

  const spyLinks = $$("a[data-spy]"); const sections = spyLinks.map(a => $(a.getAttribute("href")));
  const obs = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) { const id = `#${e.target.id}`; spyLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === id)); } }) }, { rootMargin: "-45% 0px -50% 0px", threshold: 0.01 });
  sections.forEach(s => s && obs.observe(s));
})();

/* ===== Carousel — só botões, sem “vão” ===== */
function setupCarousel(rootSel) {
  const root = $(rootSel); if (!root) return;
  const track = $(".c-track", root);
  const slides = $$(".c-slide", root);
  const prev = $(".c-nav.prev", root);
  const next = $(".c-nav.next", root);
  const dots = $(".c-dots", root);

  let index = 0, gap = 16, slideW = 0, minTX = 0, indexMax = 0;
  let dragStartX = 0, dragCurrentX = 0, dragging = false;

  const viewportWidth = () => {
    const cs = getComputedStyle(root);
    const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    return root.clientWidth - pad;
  };

  const ro = new ResizeObserver(() => recalc());
  slides.forEach(s => ro.observe(s));

  function recalc() {
    if (!slides.length) return;
    const w = slides[0].getBoundingClientRect().width;
    slideW = w + gap;
    const total = (w * slides.length) + (gap * (slides.length - 1));
    const vw = viewportWidth();
    minTX = Math.min(0, vw - total);
    indexMax = Math.max(0, Math.ceil((-minTX) / slideW));
    index = Math.max(0, Math.min(index, indexMax));
    apply();
  }
  function apply() {
    const tx = clamp(-index * slideW, minTX, 0);
    track.style.transform = `translateX(${tx}px)`;
    if (dots) {
      dots.innerHTML = "";
      for (let i = 0; i <= indexMax; i++) {
        const b = document.createElement("button");
        b.className = i === index ? "active" : "";
        b.onclick = () => { index = i; apply(); };
        dots.appendChild(b);
      }
    }
    prev && (prev.disabled = index === 0);
    next && (next.disabled = index === indexMax);
  }
  prev && (prev.onclick = () => { index = Math.max(0, index - 1); apply(); });
  next && (next.onclick = () => { index = Math.min(indexMax, index + 1); apply(); });
  bindPressFeedback([prev, next]);

  track.style.touchAction = "pan-y";
  track.addEventListener("pointerdown", e => {
    if (!isTouchLike()) return;
    dragging = true;
    dragStartX = e.clientX;
    dragCurrentX = e.clientX;
    root.classList.add("is-dragging");
  });
  track.addEventListener("pointermove", e => {
    if (!dragging || !isTouchLike()) return;
    dragCurrentX = e.clientX;
  });
  const endDrag = () => {
    if (!dragging) return;
    const delta = dragCurrentX - dragStartX;
    if (Math.abs(delta) > 42) {
      if (delta < 0) index = Math.min(indexMax, index + 1);
      else index = Math.max(0, index - 1);
    }
    dragging = false;
    root.classList.remove("is-dragging");
    apply();
  };
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);
  track.addEventListener("pointerleave", () => { if (dragging && isTouchLike()) endDrag(); });
  recalc();

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
}
setupCarousel(".carousel");

/* ===== Tilt / Magnetic / Reveal ===== */
(function tiltFX() {
  const max = 10;
  $$(".tilt").forEach(el => {
    if (isTouchLike()) return;
    el.addEventListener("mousemove", e => {
      const r = el.getBoundingClientRect(); const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2); const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      el.style.transform = `rotateX(${(-dy * max).toFixed(2)}deg) rotateY(${(dx * max).toFixed(2)}deg)`;
    });
    el.addEventListener("mouseleave", () => el.style.transform = "rotateX(0) rotateY(0)");
  });
})();
(function magneticFX() {
  const s = 18;
  $$(".magnetic").forEach(el => {
    if (isTouchLike()) return;
    el.style.transform = "translate3d(0,0,0)";
    el.addEventListener("mousemove", e => {
      const r = el.getBoundingClientRect(); const dx = (e.clientX - (r.left + r.width / 2)) / r.width; const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.transform = `translate(${dx * s}px,${dy * s}px)`;
    });
    el.addEventListener("mouseleave", () => el.style.transform = "translate(0,0)");
  });
})();
(function interactionFX() {
  bindPressFeedback($$(".btn, .btn-mini, .auth button, .mock-actions button, .theme-toggle, .fab, .to-top"));
})();
(function reveal() {
  const obs = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("show"); obs.unobserve(e.target); } }) }, { threshold: .12 });
  $$(".section .glass, .section .cards .card, .plan, .step").forEach(el => { el.classList.add("reveal"); obs.observe(el); });
})();

/* ===== MOCK templates ===== */
(function mockTemplates() {
  const body = document.getElementById("mockBody");
  if (!body) return;

  const variants = ["dashboard", "landing", "auth"];
  let i = variants.indexOf(body.dataset.variant || "dashboard");
  if (i < 0) i = 0;
  let swipeStartX = 0;
  let swipeCurrentX = 0;
  let swiping = false;

  $("#mockPrev")?.addEventListener("click", () => { i = (i - 1 + variants.length) % variants.length; render(); });
  $("#mockNext")?.addEventListener("click", () => { i = (i + 1) % variants.length; render(); });

  body.addEventListener("pointerdown", e => {
    if (!isTouchLike()) return;
    swiping = true;
    swipeStartX = e.clientX;
    swipeCurrentX = e.clientX;
  });
  body.addEventListener("pointermove", e => {
    if (!swiping || !isTouchLike()) return;
    swipeCurrentX = e.clientX;
  });
  const finishSwipe = () => {
    if (!swiping) return;
    const delta = swipeCurrentX - swipeStartX;
    if (Math.abs(delta) > 40) {
      i = delta < 0 ? (i + 1) % variants.length : (i - 1 + variants.length) % variants.length;
      render();
    }
    swiping = false;
  };
  body.addEventListener("pointerup", finishSwipe);
  body.addEventListener("pointercancel", finishSwipe);
  body.addEventListener("pointerleave", () => { if (swiping && isTouchLike()) finishSwipe(); });

  function render() {
    body.classList.add("is-changing");
    const v = variants[i];
    body.dataset.variant = v;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    const chartFrame = getComputedStyle(document.documentElement).getPropertyValue("--chart-frame").trim();

    if (v === "dashboard") {
      const stats = [
        { k: "Tarefas", v: "124", delta: "+18" },
        { k: "Rotinas", v: "38", delta: "+6" },
        { k: "Economia", v: "42h", delta: "/ mes" }
      ];
      body.innerHTML = `
        <div class="mb-header">
          <div class="mb-title">Dashboard operacional • Últimos 30 dias</div>
          <div style="opacity:.8">Atualizado</div>
        </div>
        <div class="mb-stats">
          ${stats.map(s => `<div class="mb-card"><small>${s.k}</small><br><b>${s.v}</b><br><small>${s.delta}</small></div>`).join("")}
        </div>
        <div class="mb-chart">${lineChartSVG(24, accent, chartFrame)}</div>
        <table class="mb-table">
          <thead><tr><th>Módulo</th><th>Status</th><th>Linguagem</th><th>Impacto</th></tr></thead>
          <tbody>
            <tr><td>Cadastro</td><td>Concluído</td><td>C#</td><td>Controle centralizado</td></tr>
            <tr><td>Relatórios</td><td>Concluído</td><td>Python</td><td>Redução de tarefas manuais</td></tr>
            <tr><td>Painel Web</td><td>Em evolução</td><td>Vue.js</td><td>Mais visibilidade dos dados</td></tr>
          </tbody>
        </table>
      `;
    }
    if (v === "landing") {
      body.innerHTML = `
        <section class="l-hero">
          <div class="l-title">Sistema e automação para organizar sua operação</div>
          <div style="color:var(--muted)">Vue.js • JavaScript • PHP • APIs externas</div>
          <div class="l-cta">
            <button class="btn-mini">Solicitar orçamento</button>
            <button class="btn-mini ghost">Ver escopo</button>
          </div>
        </section>
        <div class="l-features">
          <div class="mb-card">📊 Dashboard</div>
          <div class="mb-card">🤖 Automação</div>
          <div class="mb-card">🧩 Integrações</div>
        </div>
      `;
    }
    if (v === "auth") {
      body.innerHTML = `
        <form class="auth" onsubmit="return false;">
          <input type="email" placeholder="email@empresa.com" required />
          <input type="password" placeholder="senha" required />
          <button>Entrar</button>
          <div class="hint">CRUD • Permissões • Auditoria</div>
        </form>
      `;
    }

    requestAnimationFrame(() => {
      bindPressFeedback($$(".btn-mini, .auth button, .mock-actions button", body.parentElement || document));
      requestAnimationFrame(() => body.classList.remove("is-changing"));
    });
  }

  function lineChartSVG(n, color, frame) {
    const pts = Array.from({ length: n }, () => Math.random() * 0.8 + 0.2);
    const w = 560, h = 140, pad = 10;
    const step = (w - pad * 2) / (n - 1);
    const xs = (i) => pad + i * step;
    const ys = (v) => pad + (1 - v) * (h - pad * 2);
    const path = pts.map((v, i) => `${i ? 'L' : 'M'} ${xs(i)} ${ys(v)}`).join(" ");
    const area = `M ${xs(0)} ${h - pad} L ${xs(0)} ${ys(pts[0])} ` +
      pts.map((v, i) => `L ${xs(i)} ${ys(v)}`).join(" ") +
      ` L ${xs(n - 1)} ${h - pad} Z`;
    return `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="120">
        <defs>
          <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" ry="10" fill="none" stroke="${frame}"/>
        <path d="${area}" fill="url(#gArea)"/>
        <path d="${path}" fill="none" stroke="${color}" stroke-width="2.5"/>
      </svg>
    `;
  }
  render();
})();

/* ===== Quote & Contact ===== */
function syncFloatingLabels(root = document) {
  $$(".field", root).forEach(field => {
    const control = $("input, textarea", field);
    if (!control) return;
    const hasValue = control.value.trim().length > 0;
    field.classList.toggle("is-filled", hasValue);
  });
}

syncFloatingLabels();
$$(".field input, .field textarea").forEach(control => {
  const update = () => syncFloatingLabels(control.closest(".field")?.parentElement?.parentElement || document);
  control.addEventListener("input", update);
  control.addEventListener("change", update);
  control.addEventListener("blur", update);
});

$("#quoteForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = { pages: Number(fd.get("pages") || 1), cms: !!fd.get("cms"), animations: !!fd.get("animations"), ecommerce: !!fd.get("ecommerce"), seo: !!fd.get("seo"), rush: !!fd.get("rush") };
  const out = $("#quoteOut"); out.textContent = "Calculando…";
  try {
    const r = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await r.json(); if (!data.ok) throw 0; out.textContent = `~ R$ ${Number(data.total).toLocaleString("pt-BR")}`;
  } catch { out.textContent = "Erro ao calcular 😵"; }
});
$("#contactForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form); const payload = Object.fromEntries(fd.entries()); payload.budget = payload.budget ? Number(payload.budget) : null;
  const btn = $("#contactForm button"); const msg = $("#formMsg"); btn.disabled = true; btn.textContent = "Enviando…";
  msg.style.color = "var(--muted)";
  msg.textContent = "Preparando envio...";
  try {
    const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await r.json().catch(() => ({ ok: false, error: "Resposta invalida do servidor." }));
    if (!r.ok || !data.ok) {
      const detail = data.saved
        ? `${data.error || "Erro ao enviar. Tente novamente."} Seus dados foram salvos localmente.`
        : (data.error || "Erro ao enviar. Tente novamente.");
      throw new Error(detail);
    }
    msg.style.color = "var(--good)";
    msg.textContent = data.message || "Mensagem enviada com sucesso!";
    form.reset();
    syncFloatingLabels(form);
  } catch (error) {
    msg.style.color = "var(--bad)";
    msg.textContent = error.message || "Erro ao enviar. Tente novamente.";
  }
  finally { btn.disabled = false; btn.textContent = "Enviar"; }
});

/* ===== Availability (fake API) ===== */
(async function availability() {
  try {
    const r = await fetch("/api/availability"); const { ok, slots } = await r.json(); if (!ok) throw 0;
    const has = slots.slice(0, 7).some(s => s.available);
    const el = $("#avail"); el.textContent = has ? "Disponível para novos projetos" : "Agenda cheia (lista de espera)";
    el.classList.add(has ? "ok" : "no");
  } catch { const el = $("#avail"); if (el) { el.textContent = "Consultar agenda por e-mail"; el.classList.add("ok"); } }
})();
$("#year").textContent = new Date().getFullYear();
