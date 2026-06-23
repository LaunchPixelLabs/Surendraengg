/* ============================================================
   Surendra Engineering Enterprises — Motion Engine
   Modeled on phenomenonstudio.com:
   · Lenis smooth scroll  · masked text-line reveals
   · clip-path media reveals (open + de-rotate)
   · scrub parallax · magnetic UI · custom cursor · counters
   ============================================================ */
(function () {
  'use strict';
  document.documentElement.classList.remove('no-js');

  const prefersReduced = false; // Override OS setting to ensure website feels alive
  const isTouch = window.matchMedia('(hover: none)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const hasGSAP = typeof window.gsap !== 'undefined';
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =========================================================
     0 · TEXT LINE SPLITTER  (masked reveal)
     Wraps each <br>-separated segment in .r-line > .r-line__in
     Preserves inline markup such as <span class="grad">.
     ========================================================= */
  function splitLines(el) {
    if (el.dataset.split === '1') return;
    const segments = [];
    let frag = document.createDocumentFragment();
    Array.from(el.childNodes).forEach((node) => {
      if (node.nodeName === 'BR') { segments.push(frag); frag = document.createDocumentFragment(); }
      else { frag.appendChild(node.cloneNode(true)); }
    });
    segments.push(frag);
    el.innerHTML = '';
    segments.forEach((seg, i) => {
      const line = document.createElement('span'); line.className = 'r-line';
      const inner = document.createElement('span'); inner.className = 'r-line__in';
      inner.style.setProperty('--li', i);
      inner.appendChild(seg);
      line.appendChild(inner); el.appendChild(line);
    });
    el.dataset.split = '1';
  }
  $$('[data-anim="lines"]').forEach(splitLines);

  /* =========================================================
     1 · HERO INTRO TRIGGER
     ========================================================= */
  let introStarted = false;
  document.body.style.overflow = '';
  // Trigger animations immediately (defer script means DOM is parsed)
  // RequestAnimationFrame ensures browser has painted the initial state
  requestAnimationFrame(() => {
    startHeroIntro();
  });

  /* =========================================================
     2 · LENIS SMOOTH SCROLL  (+ ScrollTrigger sync)
     ========================================================= */
  let lenis = null;
  if (typeof Lenis !== 'undefined' && !prefersReduced && !isTouch) {
    lenis = new Lenis({ duration: 1.15, lerp: 0.09, smoothWheel: true });
    if (hasGSAP && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  /* In-page anchor scrolling */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault(); closeMobileMenu();
      if (lenis) lenis.scrollTo(t, { offset: -70, duration: 1.2 });
      else t.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* =========================================================
     3 · NAV — scrolled state, progress, active page/section
     ========================================================= */
  const nav = $('#nav');
  const progressBar = $('#scrollProgress');
  const heroEl = document.querySelector('.hero, .page-hero');
  let navTrigger = 60;
  function calcTrigger() { navTrigger = heroEl ? Math.max(60, heroEl.offsetHeight - 100) : 60; }
  calcTrigger();
  window.addEventListener('resize', calcTrigger);
  window.addEventListener('load', calcTrigger);
  let lastY = window.scrollY || 0;
  function onScroll() {
    const y = window.scrollY || window.pageYOffset;
    if (nav) {
      nav.classList.toggle('is-scrolled', y > navTrigger);
      // Phenomenon-style: hide header on scroll-down (past hero), reveal on scroll-up
      const menuOpen = document.body.style.overflow === 'hidden';
      if (!menuOpen && y > navTrigger + 60 && y > lastY + 4) nav.classList.add('to-hide');
      else if (y < lastY - 4 || y <= navTrigger) nav.classList.remove('to-hide');
    }
    if (progressBar) { const h = document.documentElement.scrollHeight - window.innerHeight; progressBar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%'; }
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // current-page highlight (multi-page)
  const path = location.pathname.split('/').pop() || 'index.html';
  $$('.nav__menu a, .mobile-menu a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if ((href === path) || (path === 'index.html' && href === 'index.html')) a.classList.add('is-active');
  });

  // mobile menu
  const burger = $('#burger');
  const mobileMenu = $('#mobileMenu');
  function closeMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('is-open'); mobileMenu.setAttribute('aria-hidden', 'true');
    if (burger) { burger.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
    document.body.style.overflow = '';
  }
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      mobileMenu.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  // active section highlight (single-page anchors)
  const anchorLinks = $$('.nav__menu a[href^="#"]');
  if (anchorLinks.length && 'IntersectionObserver' in window) {
    const map = {};
    anchorLinks.forEach((l) => { const id = l.getAttribute('href').slice(1); const s = document.getElementById(id); if (s) map[id] = l; });
    const obs = new IntersectionObserver((ents) => {
      ents.forEach((en) => { if (en.isIntersecting) { anchorLinks.forEach((l) => l.classList.remove('is-active')); if (map[en.target.id]) map[en.target.id].classList.add('is-active'); } });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach((id) => obs.observe(document.getElementById(id)));
  }

  /* =========================================================
     4 · SCROLL REVEALS  (lines · media · fade · scale)
     ========================================================= */
  const revealEls = $$('[data-reveal], [data-anim], .reveal-media');
  if (prefersReduced || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        // stagger media within a shared group via --d
        if (el.classList.contains('reveal-media') && el.dataset.delay) el.style.setProperty('--d', el.dataset.delay);
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => io.observe(el));

    // sibling stagger for [data-stagger] children
    $$('[data-stagger]').forEach((parent) => {
      $$(':scope > *', parent).forEach((child, i) => child.style.setProperty('--si', i));
    });
  }

  /* =========================================================
     5 · COUNT-UP STATS
     ========================================================= */
  function countUp(el) {
    const target = parseFloat(el.getAttribute('data-count'));
    const suffix = el.getAttribute('data-suffix') || '';
    const dur = 1900, start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const v = Math.floor((1 - Math.pow(1 - p, 3)) * target);
      el.textContent = v.toLocaleString('en-IN') + suffix;
      if (p < 1) requestAnimationFrame(tick); else el.textContent = target.toLocaleString('en-IN') + suffix;
    }
    requestAnimationFrame(tick);
  }
  const counters = $$('[data-count]');
  if ('IntersectionObserver' in window && !prefersReduced) {
    const cio = new IntersectionObserver((ents) => { ents.forEach((en) => { if (en.isIntersecting) { countUp(en.target); cio.unobserve(en.target); } }); }, { threshold: 0.6 });
    counters.forEach((c) => cio.observe(c));
  } else {
    counters.forEach((c) => { c.textContent = parseFloat(c.getAttribute('data-count')).toLocaleString('en-IN') + (c.getAttribute('data-suffix') || ''); });
  }

  /* =========================================================
     6 · HERO INTRO (GSAP)
     ========================================================= */
  function startHeroIntro() {
    if (introStarted) return; introStarted = true;
    const hero = $('.hero');
    if (!hero) return;
    if (!hasGSAP || prefersReduced) { hero.querySelectorAll('[data-anim],[data-reveal],.reveal-media').forEach((e) => e.classList.add('is-in')); return; }
    // The hero title reveals via the robust data-anim="lines" + .is-in path
    // (CSS-driven, with fallbacks) so it can never get stuck hidden.
    hero.querySelectorAll('[data-anim],[data-reveal],.reveal-media').forEach((e) => e.classList.add('is-in'));
    // GSAP adds a light coordinated flourish on the surrounding elements only.
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.from('.hero__eyebrow', { y: 26, opacity: 0, duration: 0.7 })
      .from('.hero__sub', { y: 26, opacity: 0, duration: 0.8 }, '-=0.3')
      .from('.hero__actions', { y: 26, opacity: 0, duration: 0.8 }, '-=0.55')
      .from('.hero__ticker .ti', { y: 34, opacity: 0, duration: 0.7, stagger: 0.08 }, '-=0.5');
  }

  /* =========================================================
     7 · SCRUB PARALLAX
     ========================================================= */
  if (hasGSAP && window.ScrollTrigger && !prefersReduced) {
    const para = (sel, yp) => $$(sel).forEach((el) => gsap.to(el, { yPercent: yp, ease: 'none', scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true } }));
    $$('.hero__bg img').forEach((el) => gsap.to(el, { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } }));
    $$('.hero__blueprint').forEach((el) => gsap.to(el, { yPercent: 30, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } }));
    $$('.page-hero__bg img').forEach((el) => gsap.to(el, { yPercent: 16, ease: 'none', scrollTrigger: { trigger: '.page-hero', start: 'top top', end: 'bottom top', scrub: true } }));
    // floating depth on decorative frames
    para('[data-parallax]', -8);
  }

  /* =========================================================
     7b · SCROLL STACK  (reactbits-style pinned card stack)
     ========================================================= */
  function initScrollStack(root) {
    const cards = Array.from(root.querySelectorAll('.stack-card'));
    if (!cards.length) return;
    const endEl = root.querySelector('.scroll-stack-end');
    const cfg = { itemDistance: 110, itemScale: 0.022, itemStackDistance: 24, stackPos: 0.16, scaleEndPos: 0.08, baseScale: 0.88 };
    let tops = [], endTop = 0;
    const docTop = (el) => { let t = 0; while (el) { t += el.offsetTop; el = el.offsetParent; } return t; };
    const clamp = (s, a, b) => (s < a ? 0 : s > b ? 1 : (s - a) / (b - a));
    function measure() {
      cards.forEach((c, i) => { c.style.willChange = 'transform'; if (i < cards.length - 1) c.style.marginBottom = cfg.itemDistance + 'px'; });
      tops = cards.map(docTop);
      endTop = endEl ? docTop(endEl) : tops[tops.length - 1] + cards[cards.length - 1].offsetHeight;
    }
    // Use Lenis' smoothed scroll value so card transforms land on the
    // exact same frame the page is painted — eliminates jitter.
    const curScroll = () => (lenis && typeof lenis.animatedScroll === 'number')
      ? lenis.animatedScroll
      : (window.scrollY || window.pageYOffset || 0);
    function apply(scrollTop) {
      const vh = window.innerHeight;
      const stackPx = cfg.stackPos * vh;
      const scaleEndPx = cfg.scaleEndPos * vh;
      const pinEnd = endTop - vh / 2;
      for (let i = 0; i < cards.length; i++) {
        const cardTop = tops[i];
        const triggerStart = cardTop - stackPx - cfg.itemStackDistance * i;
        const triggerEnd = cardTop - scaleEndPx;
        const sp = clamp(scrollTop, triggerStart, triggerEnd);
        const scale = 1 - sp * (1 - (cfg.baseScale + i * cfg.itemScale));
        let ty = 0;
        if (scrollTop >= triggerStart && scrollTop <= pinEnd) ty = scrollTop - cardTop + stackPx + cfg.itemStackDistance * i;
        else if (scrollTop > pinEnd) ty = pinEnd - cardTop + stackPx + cfg.itemStackDistance * i;
        cards[i].style.transform = `translate3d(0,${ty.toFixed(2)}px,0) scale(${scale.toFixed(4)})`;
      }
    }
    measure(); apply(curScroll());
    window.addEventListener('resize', () => { measure(); apply(curScroll()); });
    window.addEventListener('load', () => { measure(); apply(curScroll()); });
    if (lenis) {
      lenis.on('scroll', () => apply(curScroll()));      // desktop: locked to Lenis' rAF — smooth
    } else {
      let last = -1;                                      // touch / no-Lenis: per-frame rAF
      (function loop() { const y = window.scrollY || window.pageYOffset || 0; if (y !== last) { last = y; apply(y); } requestAnimationFrame(loop); })();
    }
  }
  if (!prefersReduced) $$('[data-scroll-stack]').forEach(initScrollStack);

  /* =========================================================
     7c · SCROLL-REACTIVE MARQUEE
     drifts gently; speeds up scrolling down, reverses scrolling up
     ========================================================= */
  function initMarquee() {
    if (prefersReduced) return;
    const tracks = $$('.marquee__track');
    if (!tracks.length) return;
    const states = tracks.map((t) => { t.style.animation = 'none'; t.style.willChange = 'transform'; return { el: t, x: 0, w: 0 }; });
    function measure() {
      states.forEach((s) => {
        const g = s.el.querySelector('.marquee__group');
        s.w = g ? g.getBoundingClientRect().width : s.el.scrollWidth / 2;
      });
    }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    let last = window.scrollY || 0, vel = 0;
    window.addEventListener('scroll', () => { const y = window.scrollY || 0; vel += (y - last); last = y; }, { passive: true });
    const base = -0.45; // gentle leftward drift at rest
    (function loop() {
      const speed = Math.max(-16, Math.min(16, base - vel * 0.22));
      vel *= 0.9; // decay back toward the base drift
      for (const s of states) {
        if (!s.w) continue;
        s.x += speed;
        if (s.x <= -s.w) s.x += s.w; else if (s.x > 0) s.x -= s.w;
        s.el.style.transform = `translate3d(${s.x.toFixed(2)}px,0,0)`;
      }
      requestAnimationFrame(loop);
    })();
  }
  initMarquee();

  /* =========================================================
     8 · MAGNETIC BUTTONS
     ========================================================= */
  if (!isTouch && !prefersReduced) {
    $$('[data-magnetic]').forEach((el) => {
      const s = 0.32;
      el.addEventListener('mousemove', (e) => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * s}px, ${(e.clientY - r.top - r.height / 2) * s}px)`; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'translate(0,0)'; });
    });
  }

  /* =========================================================
     9 · CLICK SPARK  (ported from reactbits ClickSpark)
     radial line-sparks burst from each click/tap
     ========================================================= */
  (function clickSpark() {
    const canvas = $('#clickSpark');
    if (!canvas || prefersReduced) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0, h = 0, dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);
    const cfg = { color: '#ED5335', size: 12, radius: 20, count: 9, duration: 480 };
    const ease = (t) => t * (2 - t); // ease-out
    let sparks = [], running = false;
    function draw(now) {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 2; ctx.lineCap = 'round';
      sparks = sparks.filter((s) => {
        const el = now - s.t;
        if (el >= cfg.duration) return false;
        const p = el / cfg.duration, e = ease(p);
        const dist = e * cfg.radius, len = cfg.size * (1 - e);
        const cos = Math.cos(s.angle), sin = Math.sin(s.angle);
        ctx.strokeStyle = cfg.color; ctx.globalAlpha = 1 - e;
        ctx.beginPath();
        ctx.moveTo(s.x + dist * cos, s.y + dist * sin);
        ctx.lineTo(s.x + (dist + len) * cos, s.y + (dist + len) * sin);
        ctx.stroke();
        return true;
      });
      ctx.globalAlpha = 1;
      if (sparks.length) requestAnimationFrame(draw);
      else { running = false; ctx.clearRect(0, 0, w, h); }
    }
    window.addEventListener('pointerdown', (e) => {
      const now = performance.now();
      for (let i = 0; i < cfg.count; i++) sparks.push({ x: e.clientX, y: e.clientY, angle: (2 * Math.PI * i) / cfg.count, t: now });
      if (!running) { running = true; requestAnimationFrame(draw); }
    }, { passive: true });
  })();

  /* =========================================================
     10 · CONTACT FORM (validation + mailto)
     ========================================================= */
  const form = $('#contactForm'), note = $('#formNote');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = new FormData(form);
      const name = (d.get('name') || '').toString().trim();
      const email = (d.get('email') || '').toString().trim();
      const scope = (d.get('scope') || '').toString().trim();
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !scope) { if (note) { note.style.color = 'var(--orange)'; note.textContent = 'Please add your name, a valid email and a scope of work.'; } return; }
      const company = (d.get('company') || '').toString().trim();
      const message = (d.get('message') || '').toString().trim();
      const subject = encodeURIComponent(`Project enquiry — ${scope}${company ? ' · ' + company : ''}`);
      const body = encodeURIComponent(`Name: ${name}\nCompany: ${company}\nEmail: ${email}\nScope: ${scope}\n\n${message}`);
      if (note) { note.style.color = 'var(--orange)'; note.textContent = 'Opening your email client to send this enquiry…'; }
      window.location.href = `mailto:surendra.engg@rediffmail.com?subject=${subject}&body=${body}`;
      setTimeout(() => { if (note) { note.style.color = '#7CFFA0'; note.textContent = 'Thank you, ' + name + '. We will respond within one business day.'; } form.reset(); }, 800);
    });
  }

  // keep ScrollTrigger measurements correct after full load
  window.addEventListener('load', () => { if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh(); });
})();
