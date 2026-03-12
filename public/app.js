/* ===== helpers ===== */
const $ = (s,ctx=document)=>ctx.querySelector(s);
const $$ = (s,ctx=document)=>Array.from(ctx.querySelectorAll(s));

/* ===== THEME + CUSTOMIZER ===== */
(function themeInit(){
  const root = document.documentElement;
  const themeToggle = $("#themeToggle");
  const panel = $("#themePanel");
  const openBtn = $("#openCustomizer");
  const minBtn = $("#minimizePanel");
  const accent = $("#accentColor");
  const bgInt = $("#bgIntensity");
  const save = $("#saveTheme");
  const reset = $("#resetTheme");

  const saved = JSON.parse(localStorage.getItem("theme_prefs")||"{}");
  if (saved.theme) root.setAttribute("data-theme", saved.theme);
  if (saved.accent) accent.value = saved.accent;
  if (typeof saved.bgInt === "number") bgInt.value = saved.bgInt;
  applyAccent(accent.value);
  applyBgIntensity(parseFloat(bgInt.value));

  // alternar tema light/dark
  themeToggle.addEventListener("click", ()=>{
    const cur = root.getAttribute("data-theme");
    const next = cur === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    themeToggle.setAttribute("aria-pressed", String(next==="light"));
    themeToggle.textContent = next==="light" ? "☀︎" : "☾";
    persist();
  });

  // 🎛️ FAB abre/fecha o painel (minimiza e aumenta)
  openBtn.addEventListener("click", ()=>{
    const isOpen = panel.classList.toggle("open");
    openBtn.setAttribute("aria-pressed", String(isOpen));
  });
  // botão interno "▾" apenas colapsa conteúdo sem fechar totalmente
  minBtn.addEventListener("click", ()=> panel.classList.toggle("min"));

  // controles
  accent.addEventListener("input", e=> { applyAccent(e.target.value); persist(); });
  bgInt.addEventListener("input", e=> { applyBgIntensity(parseFloat(e.target.value)); persist(); });
  save.onclick = persist;
  reset.onclick = ()=> { localStorage.removeItem("theme_prefs"); location.reload(); };

  function persist(){
    localStorage.setItem("theme_prefs",
      JSON.stringify({ theme: root.getAttribute("data-theme"), accent: accent.value, bgInt: parseFloat(bgInt.value) })
    );
  }
  function applyAccent(hex){
    const {h,s,l} = hexToHSL(hex);
    root.style.setProperty("--accent", hex);
    root.style.setProperty("--accent-2", `hsl(${h} ${Math.max(40,s-5)}% ${Math.max(30,l-10)}%)`);
    root.style.setProperty("--accent-h", h);
    root.style.setProperty("--bg-r1", `hsla(${h} 70% 35% / 0.65)`);
    root.style.setProperty("--bg-r2", `hsla(${h} 70% 28% / 0.5)`);
    window.__setBgHue?.(h);
  }
  function applyBgIntensity(v){ document.documentElement.style.setProperty("--bg-intensity", v); window.__setBgIntensity?.(v); }
  function hexToHSL(H){
    H=H.replace("#",""); let r,g,b;
    if(H.length===3){ r=parseInt(H[0]+H[0],16); g=parseInt(H[1]+H[1],16); b=parseInt(H[2]+H[2],16); }
    else{ r=parseInt(H.slice(0,2),16); g=parseInt(H.slice(2,4),16); b=parseInt(H.slice(4,6),16); }
    r/=255; g/=255; b/=255;
    const cmin=Math.min(r,g,b), cmax=Math.max(r,g,b), delta=cmax-cmin;
    let h=0,s=0,l=(cmax+cmin)/2;
    if(delta!==0){ if(cmax===r) h=((g-b)/delta)%6; else if(cmax===g) h=(b-r)/delta+2; else h=(r-g)/delta+4; h=Math.round(h*60); if(h<0)h+=360; s=delta/(1-Math.abs(2*l-1)); }
    return {h, s:Math.round(s*100), l:Math.round(l*100)};
  }
})();

/* ===== Canvas BG ===== */
(function nebula(){
  const canvas = $("#bg"); const c = canvas.getContext("2d");
  let w,h,dpr = Math.min(devicePixelRatio||1,2);
  const pts = []; const MAX = 150;
  const mouse = { x:-9999, y:-9999 };
  let hue = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--accent-h"))||270;
  let intensity = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bg-intensity"))||0.8;
  const logoImg = new Image(); logoImg.src="/assets/logo.png";
  let logoOk=false; logoImg.onload=()=>logoOk=true; logoImg.onerror=()=>{logoOk=false;};

  function resize(){ w=canvas.width=Math.floor(innerWidth*dpr); h=canvas.height=Math.floor(innerHeight*dpr);
    canvas.style.width=innerWidth+"px"; canvas.style.height=innerHeight+"px"; }
  addEventListener("resize",resize,{passive:true}); resize();

  function rnd(a,b){ return a + Math.random()*(b-a) }
  function spawn(){ pts.length=0; for(let i=0;i<MAX;i++) pts.push({ x:rnd(0,w), y:rnd(0,h), vx:rnd(-.25,.25), vy:rnd(-.25,.25), r:rnd(.6,2.4)*dpr, a:rnd(.06,.22) }); }
  spawn();

  addEventListener("mousemove", e=>{
    mouse.x=e.clientX*dpr; mouse.y=e.clientY*dpr;
    const sp=$("#spotlight"); sp.style.setProperty("--mx", `${e.clientX}px`); sp.style.setProperty("--my", `${e.clientY}px`);
  },{passive:true});

  function step(){
    c.clearRect(0,0,w,h);
    const g=c.createRadialGradient(w*0.2,h*0.1,0,w*0.2,h*0.1,Math.max(w,h)*0.8);
    g.addColorStop(0, `hsla(${hue}, 80%, 60%, ${0.12*intensity})`); g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle=g; c.fillRect(0,0,w,h);

    const now=performance.now()/10000;
    for(const p of pts){
      const dx=p.x-mouse.x, dy=p.y-mouse.y, d2=dx*dx+dy*dy;
      if(d2<(150*dpr)**2){ const f=.04*(1-d2/((150*dpr)**2)); p.vx+=dx*f*.001; p.vy+=dy*f*.001; }
      p.vx+=Math.sin(p.y*.0008+now)*.003; p.vy+=Math.cos(p.x*.0008+now)*.003;
      p.x+=p.vx; p.y+=p.vy; if(p.x<0||p.x>w)p.vx*=-1; if(p.y<0||p.y>h)p.vy*=-1;
      c.beginPath(); c.fillStyle=`hsla(${hue}, 80%, 70%, ${p.a*intensity})`; c.arc(p.x,p.y,p.r,0,Math.PI*2); c.fill();
    }
    for(let i=0;i<pts.length;i++){
      const a=pts[i];
      for(let j=i+1;j<i+11&&j<pts.length;j++){
        const b=pts[j]; const dx=a.x-b.x, dy=a.y-b.y, d2=dx*dx+dy*dy;
        if(d2<(110*dpr)**2){ c.strokeStyle=`hsla(${hue}, 80%, 60%, ${0.014*intensity*(1-d2/((110*dpr)**2))})`; c.lineWidth=1*dpr; c.beginPath(); c.moveTo(a.x,a.y); c.lineTo(b.x,b.y); c.stroke(); }
      }
    }

    const t=performance.now()/8000, size=Math.min(w,h)*0.25;
    c.save(); c.globalAlpha=0.06*intensity; c.translate(w*0.8,h*0.85); c.rotate(t);
    if(logoOk){ c.drawImage(logoImg,-size/2,-size/2,size,size); }
    else{ c.fillStyle=`hsla(${hue},80%,70%,.35)`; c.beginPath(); c.arc(0,0,size*0.5,0,Math.PI*2); c.fill(); c.fillStyle="#fff"; c.font=`${size*0.22}px Outfit, system-ui`; c.textAlign="center"; c.textBaseline="middle"; c.fillText("GF",0,0); }
    c.restore();
    requestAnimationFrame(step);
  }
  step();

  window.__setBgIntensity = v => intensity = v;
  window.__setBgHue = h => hue = h;
})();

/* ===== Header, Scrollspy e botão ToTop ===== */
(function headerFX(){
  const header=$("#siteHeader"), toTop=$("#toTop");
  const onScroll=()=>{ const y=scrollY; header.classList.toggle("scrolled", y>10); toTop.classList.toggle("show", y>500); };
  addEventListener("scroll", onScroll, {passive:true}); onScroll();
  toTop.addEventListener("click", ()=> scrollTo({top:0, behavior:"smooth"}));

  const spyLinks=$$("a[data-spy]"); const sections=spyLinks.map(a=>$(a.getAttribute("href")));
  const obs=new IntersectionObserver(es=>{ es.forEach(e=>{ if(e.isIntersecting){ const id=`#${e.target.id}`; spyLinks.forEach(a=>a.classList.toggle("active", a.getAttribute("href")===id)); }}) },{rootMargin:"-45% 0px -50% 0px", threshold:0.01});
  sections.forEach(s=>s&&obs.observe(s));
})();

/* ===== Carousel — só botões, sem “vão” ===== */
function setupCarousel(rootSel){
  const root=$(rootSel); if(!root) return;
  const track=$(".c-track", root);
  const slides=$$(".c-slide", root);
  const prev=$(".c-nav.prev", root);
  const next=$(".c-nav.next", root);
  const dots=$(".c-dots", root);

  let index=0, gap=16, slideW=0, minTX=0, indexMax=0;

  const viewportWidth = () => {
    const cs = getComputedStyle(root);
    const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    return root.clientWidth - pad;
  };

  const ro=new ResizeObserver(()=>recalc());
  slides.forEach(s=>ro.observe(s));

  function recalc(){
    if(!slides.length) return;
    const w = slides[0].getBoundingClientRect().width;
    slideW = w + gap;
    const total = (w * slides.length) + (gap * (slides.length - 1));
    const vw = viewportWidth();
    minTX = Math.min(0, vw - total);
    indexMax = Math.max(0, Math.ceil((-minTX) / slideW));
    index = Math.max(0, Math.min(index, indexMax));
    apply();
  }
  function apply(){
    const tx = clamp(-index * slideW, minTX, 0);
    track.style.transform = `translateX(${tx}px)`;
    if (dots){
      dots.innerHTML = "";
      for (let i=0; i<=indexMax; i++){
        const b = document.createElement("button");
        b.className = i===index ? "active" : "";
        b.onclick = ()=>{ index=i; apply(); };
        dots.appendChild(b);
      }
    }
    prev && (prev.disabled = index === 0);
    next && (next.disabled = index === indexMax);
  }
  prev && (prev.onclick=()=>{ index=Math.max(0,index-1); apply(); });
  next && (next.onclick=()=>{ index=Math.min(indexMax,index+1); apply(); });

  track.style.touchAction="manipulation";
  ["pointerdown","pointermove","pointerup"].forEach(ev=>track.addEventListener(ev,e=>e.stopPropagation(),{passive:true}));
  recalc();

  function clamp(v, min, max){ return Math.min(max, Math.max(min, v)); }
}
setupCarousel(".carousel");

/* ===== Tilt / Magnetic / Reveal ===== */
(function tiltFX(){
  const max=10;
  $$(".tilt").forEach(el=>{
    el.addEventListener("mousemove", e=>{
      const r=el.getBoundingClientRect(); const dx=(e.clientX-(r.left+r.width/2))/(r.width/2); const dy=(e.clientY-(r.top+r.height/2))/(r.height/2);
      el.style.transform=`rotateX(${(-dy*max).toFixed(2)}deg) rotateY(${(dx*max).toFixed(2)}deg)`;
    });
    el.addEventListener("mouseleave", ()=> el.style.transform="rotateX(0) rotateY(0)");
  });
})();
(function magneticFX(){
  const s=18;
  $$(".magnetic").forEach(el=>{
    el.style.transform="translate3d(0,0,0)";
    el.addEventListener("mousemove", e=>{
      const r=el.getBoundingClientRect(); const dx=(e.clientX-(r.left+r.width/2))/r.width; const dy=(e.clientY-(r.top+r.height/2))/r.height;
      el.style.transform=`translate(${dx*s}px,${dy*s}px)`;
    });
    el.addEventListener("mouseleave", ()=> el.style.transform="translate(0,0)");
  });
})();
(function reveal(){
  const obs=new IntersectionObserver(es=>{ es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("show"); obs.unobserve(e.target); }}) },{threshold:.12});
  $$(".section .glass, .section .cards .card, .plan, .step").forEach(el=>{ el.classList.add("reveal"); obs.observe(el); });
})();

/* ===== MOCK templates ===== */
(function mockTemplates(){
  const body = document.getElementById("mockBody");
  if(!body) return;

  const variants = ["dashboard","landing","auth"];
  let i = variants.indexOf(body.dataset.variant || "dashboard");
  if(i<0) i=0;

  $("#mockPrev")?.addEventListener("click", ()=>{ i=(i-1+variants.length)%variants.length; render(); });
  $("#mockNext")?.addEventListener("click", ()=>{ i=(i+1)%variants.length; render(); });

  function render(){
    const v = variants[i];
    body.dataset.variant = v;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();

    if(v==="dashboard"){
      const stats = [
        {k:"MRR", v:"R$ 28.400", delta:"+8%"},
        {k:"Users", v:"12.940",  delta:"+3%"},
        {k:"Churn", v:"2.1%",    delta:"-0.2%"}
      ];
      body.innerHTML = `
        <div class="mb-header">
          <div class="mb-title">Analytics • Últimos 30 dias</div>
          <div style="opacity:.8">⚡ Live</div>
        </div>
        <div class="mb-stats">
          ${stats.map(s=>`<div class="mb-card"><small>${s.k}</small><br><b>${s.v}</b><br><small>${s.delta}</small></div>`).join("")}
        </div>
        <div class="mb-chart">${lineChartSVG(24, accent)}</div>
        <table class="mb-table">
          <thead><tr><th>Canal</th><th>Leads</th><th>CVR</th><th>Receita</th></tr></thead>
          <tbody>
            <tr><td>Orgânico</td><td>412</td><td>7.8%</td><td>R$ 9.4k</td></tr>
            <tr><td>Ads</td><td>280</td><td>5.3%</td><td>R$ 7.1k</td></tr>
            <tr><td>Indicações</td><td>96</td><td>12.4%</td><td>R$ 5.2k</td></tr>
          </tbody>
        </table>
      `;
    }
    if(v==="landing"){
      body.innerHTML = `
        <section class="l-hero">
          <div class="l-title">Aumente receita com um checkout de alta conversão</div>
          <div style="color:var(--muted)">SDK pronto para React/Next.js • Webhooks Node • PCI compliant</div>
          <div class="l-cta">
            <button class="btn-mini">Começar grátis</button>
            <button class="btn-mini ghost">Ver docs</button>
          </div>
        </section>
        <div class="l-features">
          <div class="mb-card">⚡ Webhooks</div>
          <div class="mb-card">🔒 3DS</div>
          <div class="mb-card">🌍 Multi-moeda</div>
        </div>
      `;
    }
    if(v==="auth"){
      body.innerHTML = `
        <form class="auth" onsubmit="return false;">
          <input type="email" placeholder="email@empresa.com" required />
          <input type="password" placeholder="senha" required />
          <button>Entrar</button>
          <div class="hint">SSO • OAuth • TOTP</div>
        </form>
      `;
    }
  }

  function lineChartSVG(n, color){
    const pts = Array.from({length:n},()=>Math.random()*0.8+0.2);
    const w = 560, h = 140, pad = 10;
    const step = (w - pad*2)/(n-1);
    const xs = (i)=>pad + i*step;
    const ys = (v)=>pad + (1-v)*(h-pad*2);
    const path = pts.map((v,i)=>`${i?'L':'M'} ${xs(i)} ${ys(v)}`).join(" ");
    const area = `M ${xs(0)} ${h-pad} L ${xs(0)} ${ys(pts[0])} `+
                 pts.map((v,i)=>`L ${xs(i)} ${ys(v)}`).join(" ")+
                 ` L ${xs(n-1)} ${h-pad} Z`;
    return `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="120">
        <defs>
          <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="${w-2}" height="${h-2}" rx="10" ry="10" fill="none" stroke="rgba(255,255,255,.12)"/>
        <path d="${area}" fill="url(#gArea)"/>
        <path d="${path}" fill="none" stroke="${color}" stroke-width="2.5"/>
      </svg>
    `;
  }
  render();
})();

/* ===== Quote & Contact ===== */
$("#quoteForm")?.addEventListener("submit", async e=>{
  e.preventDefault();
  const fd=new FormData(e.target);
  const payload={ pages:Number(fd.get("pages")||1), cms:!!fd.get("cms"), animations:!!fd.get("animations"), ecommerce:!!fd.get("ecommerce"), seo:!!fd.get("seo"), rush:!!fd.get("rush") };
  const out=$("#quoteOut"); out.textContent="Calculando…";
  try{
    const r=await fetch("/api/quote",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await r.json(); if(!data.ok) throw 0; out.textContent=`~ R$ ${Number(data.total).toLocaleString("pt-BR")}`;
  }catch{ out.textContent="Erro ao calcular 😵"; }
});
$("#contactForm")?.addEventListener("submit", async e=>{
  e.preventDefault();
  const fd=new FormData(e.target); const payload=Object.fromEntries(fd.entries()); payload.budget = payload.budget ? Number(payload.budget) : null;
  const btn=$("#contactForm button"); const msg=$("#formMsg"); btn.disabled=true; btn.textContent="Enviando…";
  try{
    const r=await fetch("/api/contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await r.json(); if(data.ok){ msg.style.color="var(--good)"; msg.textContent="Mensagem enviada!"; e.target.reset(); } else throw 0;
  }catch{ msg.style.color="var(--bad)"; msg.textContent="Erro ao enviar. Tente novamente."; }
  finally{ btn.disabled=false; btn.textContent="Enviar"; }
});

/* ===== Availability (fake API) ===== */
(async function availability(){
  try{
    const r=await fetch("/api/availability"); const {ok,slots}=await r.json(); if(!ok) throw 0;
    const has=slots.slice(0,7).some(s=>s.available);
    const el=$("#avail"); el.textContent=has?"Disponível para novos projetos":"Agenda cheia (lista de espera)";
    el.classList.add(has?"ok":"no");
  }catch{ const el=$("#avail"); if(el){ el.textContent="Consultar agenda por e-mail"; el.classList.add("ok"); } }
})();
$("#year").textContent=new Date().getFullYear();
