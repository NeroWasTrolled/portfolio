const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

const ROUTES = ["inicio", "servicos", "trabalho", "sobre", "contato"];
const WHATSAPP = "5544997135259";

/* ===== Router ===== */
function currentRoute() {
  const hash = (window.location.hash || "").replace("#", "");
  return ROUTES.includes(hash) ? hash : "inicio";
}

function renderRoute(route, { scroll = true } = {}) {
  $$(".page").forEach(section => {
    section.hidden = section.dataset.page !== route;
  });
  $$("[data-route-link]").forEach(link => {
    if (link.dataset.routeLink === route) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  closeMobileMenu();
  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
  armReveal();
}

function goRoute(route) {
  if (window.location.hash.replace("#", "") === route) {
    renderRoute(route);
  } else {
    window.location.hash = route;
  }
}

$$("[data-route-link]").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    goRoute(link.dataset.routeLink);
  });
});

window.addEventListener("hashchange", () => renderRoute(currentRoute()));

/* ===== Mobile menu ===== */
const navToggle = $("#navToggle");
const mobileMenu = $("#mobileMenu");

function openMobileMenu() {
  mobileMenu.hidden = false;
  requestAnimationFrame(() => mobileMenu.classList.add("is-open"));
  navToggle.setAttribute("aria-expanded", "true");
  navToggle.setAttribute("aria-label", "Fechar menu");
}
function closeMobileMenu() {
  if (!mobileMenu || mobileMenu.hidden) return;
  mobileMenu.classList.remove("is-open");
  mobileMenu.hidden = true;
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "Abrir menu");
}

navToggle?.addEventListener("click", () => {
  if (mobileMenu.hidden) openMobileMenu();
  else closeMobileMenu();
});

window.addEventListener("resize", () => {
  if (window.innerWidth >= 760) closeMobileMenu();
});

/* ===== Reveal on scroll ===== */
const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-visible");
    io.unobserve(entry.target);
  });
}, { rootMargin: "0px 0px -12% 0px" });

function armReveal() {
  requestAnimationFrame(() => {
    $$("[data-reveal]").forEach(el => {
      if (el.__armed) return;
      el.__armed = true;
      io.observe(el);
    });
  });
}

/* ===== Hero rose parallax ===== */
const heroRose = $("#heroRose");
let raf = 0;
window.addEventListener("scroll", () => {
  if (raf || !heroRose) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const y = window.scrollY || 0;
    heroRose.style.transform = `rotate(${y * 0.02}deg) translateY(${y * -0.06}px)`;
  });
}, { passive: true });

/* ===== Contact form -> WhatsApp ===== */
$("#contactForm")?.addEventListener("submit", e => {
  e.preventDefault();
  const f = e.target.elements;
  const text = `Oi Gabriel, sou ${f.name.value || ""}. Contato: ${f.contact.value || ""}. ${f.message.value || ""}`;
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, "_blank");
  const msg = $("#formMsg");
  if (msg) msg.textContent = "Abrindo o WhatsApp com sua mensagem…";
});

/* ===== Init ===== */
renderRoute(currentRoute(), { scroll: false });
armReveal();
$("#footYear").textContent = `© ${new Date().getFullYear()} Gabriel França`;
