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

/* ===== THEME (claro/escuro) ===== */
(function themeInit() {
  const root = document.documentElement;
  const themeToggle = $("#themeToggle");
  if (!themeToggle) return;

  const saved = JSON.parse(localStorage.getItem("theme_prefs") || "{}");
  if (saved.theme) root.setAttribute("data-theme", saved.theme);
  syncThemeToggle(root.getAttribute("data-theme") || "dark");

  themeToggle.addEventListener("click", () => {
    const cur = root.getAttribute("data-theme");
    const next = cur === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    syncThemeToggle(next);
    localStorage.setItem("theme_prefs", JSON.stringify({ theme: next }));
  });

  function syncThemeToggle(theme) {
    themeToggle.setAttribute("aria-pressed", String(theme === "light"));
    themeToggle.innerHTML = theme === "light"
      ? '<i class="ph ph-sun" aria-hidden="true"></i>'
      : '<i class="ph ph-moon" aria-hidden="true"></i>';
  }
})();

/* ===== Mobile nav ===== */
(function mobileNav() {
  const header = $("#siteHeader");
  const toggle = $("#navToggle");
  const nav = $("#mainNav");
  if (!header || !toggle || !nav) return;

  const setOpen = (open) => {
    header.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    document.documentElement.classList.toggle("nav-lock", open);
  };

  toggle.addEventListener("click", () => setOpen(!header.classList.contains("is-open")));
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("pointerdown", e => {
    if (!header.classList.contains("is-open")) return;
    if (header.contains(e.target)) return;
    setOpen(false);
  });
  addEventListener("keydown", e => {
    if (e.key === "Escape") setOpen(false);
  });
  addEventListener("resize", () => {
    if (!window.matchMedia("(max-width: 900px)").matches) setOpen(false);
  }, { passive: true });
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
  bindPressFeedback([toTop, $("#themeToggle")]);

  const spyLinks = $$("a[data-spy]"); const sections = spyLinks.map(a => $(a.getAttribute("href")));
  const obs = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) { const id = `#${e.target.id}`; spyLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === id)); } }) }, { rootMargin: "-45% 0px -50% 0px", threshold: 0.01 });
  sections.forEach(s => s && obs.observe(s));
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
  bindPressFeedback($$(".btn, .btn-mini, .auth button, .mock-actions button, .theme-toggle, .to-top"));
})();
(function reveal() {
  const obs = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("show"); obs.unobserve(e.target); } }) }, { threshold: .12 });
  $$(".section .glass, .package-item, .capability, .case, .plan, .timeline-step, .about-copy, .about-cred").forEach(el => {
    el.classList.add("reveal");
    obs.observe(el);
  });
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
        { k: "Pedidos", v: "86", delta: "esta semana" },
        { k: "Meta", v: "72%", delta: "atingida" },
        { k: "Fila", v: "9", delta: "em aberto" }
      ];
      body.innerHTML = `
        <div class="mb-header">
          <div class="mb-title">Painel comercial · visão da semana</div>
          <div style="opacity:.8">ao vivo</div>
        </div>
        <div class="mb-stats">
          ${stats.map(s => `<div class="mb-card"><small>${s.k}</small><br><b>${s.v}</b><br><small>${s.delta}</small></div>`).join("")}
        </div>
        <div class="mb-chart">${lineChartSVG(24, accent, chartFrame)}</div>
        <table class="mb-table">
          <thead><tr><th>Entrega</th><th>Status</th><th>Stack</th><th>Para quem</th></tr></thead>
          <tbody>
            <tr><td>Metas</td><td>Pronto</td><td>Vue.js</td><td>Dono da operação</td></tr>
            <tr><td>Filtro período</td><td>Pronto</td><td>C#</td><td>Gestão diária</td></tr>
            <tr><td>Export</td><td>Próximo</td><td>Python</td><td>Fechamento</td></tr>
          </tbody>
        </table>
      `;
    }
    if (v === "landing") {
      body.innerHTML = `
        <section class="l-hero">
          <div class="l-title">Automação: fecha o relatório sem copiar planilha</div>
          <div style="color:var(--muted)">Python · fontes · e-mail ou arquivo</div>
          <div class="l-cta">
            <button class="btn-mini">Ver rotina</button>
            <button class="btn-mini ghost">Pedir igual</button>
          </div>
        </section>
        <div class="l-features">
          <div class="mb-card">Lê fontes</div>
          <div class="mb-card">Consolida</div>
          <div class="mb-card">Envia</div>
        </div>
      `;
    }
    if (v === "auth") {
      body.innerHTML = `
        <form class="auth" onsubmit="return false;">
          <input type="email" placeholder="voce@empresa.com" required />
          <input type="password" placeholder="senha" required />
          <button>Entrar no sistema</button>
          <div class="hint">CRUD · papéis · trilha de uso</div>
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
  const payload = {
    type: String(fd.get("type") || "dashboard"),
    size: String(fd.get("size") || "medio"),
    integracoes: !!fd.get("integracoes"),
    auth: !!fd.get("auth"),
    deploy: !!fd.get("deploy"),
    rush: !!fd.get("rush")
  };
  const out = $("#quoteOut");
  out.textContent = "Calculando…";
  try {
    const r = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await r.json();
    if (!data.ok) throw 0;
    out.textContent = `Faixa inicial ~ R$ ${Number(data.total).toLocaleString("pt-BR")} (sujeita a briefing)`;
  } catch {
    out.textContent = "Não foi possível calcular agora. Tente de novo.";
  }
});

$("#contactForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());
  payload.budget = payload.budget ? Number(payload.budget) : null;
  const btn = form.querySelector('button[type="submit"]');
  const msg = $("#formMsg");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Enviando…";
  }
  msg.style.color = "var(--muted)";
  msg.textContent = "Enviando mensagem…";

  try {
    const r = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await r.json().catch(() => ({ ok: false, error: "Resposta invalida do servidor." }));
    if (!r.ok || !data.ok) {
      const detail = data.pipeline?.saved || data.saved
        ? `${data.error || "Erro ao enviar. Tente novamente."} Lead salvo localmente.`
        : (data.error || "Erro ao enviar. Tente novamente.");
      throw new Error(detail);
    }
    msg.style.color = "var(--good)";
    msg.textContent = data.message || "Mensagem enviada com sucesso.";
    form.reset();
    syncFloatingLabels(form);
  } catch (error) {
    msg.style.color = "var(--bad)";
    msg.textContent = error.message || "Erro ao enviar. Tente novamente.";
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Enviar";
    }
  }
});

/* ===== Availability ===== */
(async function availability() {
  try {
    const r = await fetch("/api/availability"); const { ok, slots } = await r.json(); if (!ok) throw 0;
    const has = slots.slice(0, 7).some(s => s.available);
    const el = $("#avail"); el.textContent = has ? "Disponível para novos projetos" : "Agenda cheia (lista de espera)";
    el.classList.add(has ? "ok" : "no");
  } catch { const el = $("#avail"); if (el) { el.textContent = "Consultar agenda por e-mail"; el.classList.add("ok"); } }
})();
$("#year").textContent = new Date().getFullYear();
