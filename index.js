// -----------------------------------------
// OSMO PAGE TRANSITION BOILERPLATE
// -----------------------------------------

gsap.registerPlugin(CustomEase, ScrollTrigger, SplitText, InertiaPlugin);

history.scrollRestoration = "manual";

let lenis = null;
let navThemeTl = null;
let footerScrollTrigger = null;
let navThemeTriggers = [];
let nextPage = document;
let onceFunctionsInitialized = false;
let scrollLocked = false;

const hasLenis = typeof window.Lenis !== "undefined";
const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";
const hasSmooothy = typeof window.Smooothy !== "undefined";

const rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = rmMQ.matches;
rmMQ.addEventListener?.("change", e => (reducedMotion = e.matches));
rmMQ.addListener?.(e => (reducedMotion = e.matches)); 

const has = (s) => !!nextPage.querySelector(s);

let staggerDefault = 0.05;
let durationDefault = 0.6;

CustomEase.create("loader", "0.65, 0.01, 0.05, 0.99");
CustomEase.create("parallax", "0.7, 0.05, 0.13, 1");
CustomEase.create("osmo", "0.625, 0.05, 0, 1");
CustomEase.create("logoReveal", "0.22, 1, 0.36, 1");
gsap.defaults({ ease: "osmo", duration: durationDefault });




// -----------------------------------------
// FUNCTION REGISTRY
// -----------------------------------------

function initOnceFunctions() {
  const loaderTl = initLogoRevealLoader();
  
  if (loaderTl) {
    window.__loaderTl = loaderTl;
  }
  
  initLenis();
  
  if (onceFunctionsInitialized) return;
  onceFunctionsInitialized = true;
  
  preventSamePageClicks();
  initPrefetch();
  initNavThemeScroll();
  initSignature();
  sendGAPageView();
  initIubendaPreferencesLink();
  
}

function initBeforeEnterFunctions(next) {
  nextPage = next || document;
  
}

function initAfterEnterFunctions(next) {
  nextPage = next || document;

  initFooterParallax();
  initNavThemeScroll();
  initDynamicYear();
  initSmoothySlider();
  sendGAPageView();


  if (has('[data-hero-slideshow]')) initHeroSlideshow();

  initRevealOnScroll();
  
  if (has('[data-slideshow]')) initSlideshow(next);

  const loaderTl = window.__loaderTl;
  
  const ENTER_DELAY_CAP = 3.8;

const loaderDelay = loaderTl && loaderTl.isActive()
  ? Math.min(Math.max(0, loaderTl.duration() - loaderTl.time()), ENTER_DELAY_CAP)
  : 0;

  const isFirstLoad = loaderDelay > 0;

  initHeroVisualEnter(loaderDelay, isFirstLoad, () => {
    initHeroVisualParallax();
    initHeroMouseParallax();
    if (hasLenis) lenis.resize();
    if (hasScrollTrigger) ScrollTrigger.refresh();
  });

}

function initViewsFunction() {
  return [
    {
      namespace: "home",
    },

    {
      namespace: "menu",
    },

    {
      namespace: "info",
    },

    {
      namespace: "404",
      afterEnter() {
        initShokuBounce();
      },
    },
  ];
}



// -----------------------------------------
// PAGE TRANSITIONS
// -----------------------------------------

function runPageOnceAnimation(next) {
  const tl = gsap.timeline();

  tl.call(() => {
    resetPage(next);
  }, null, 0);

  return tl;
}

function runPageLeaveAnimation(current, next) {
  const transitionWrap = document.querySelector("[data-transition-wrap]");
  const transitionDark = transitionWrap.querySelector("[data-transition-dark]");

  const tl = gsap.timeline({
    onComplete: () => {
      current.remove(); 
    }
  })
  
  
  if (reducedMotion) {

    return tl.set(current, { autoAlpha: 0 });
  }
  
  tl.set(transitionWrap, {
    zIndex: 2
  });
  
  tl.fromTo(transitionDark, {
    autoAlpha: 0
  },{
    autoAlpha: 0.8,
    duration: 1.2,
    ease: "parallax"
  }, 0);
  
  tl.fromTo(current,{
    y: "0vh"
  },{
    y: "-25vh",
    duration: 1.2,
    ease: "parallax",
  }, 0);
  
  tl.set(transitionDark, {
    autoAlpha: 0,
  });

  return tl;
}

function runPageEnterAnimation(next){
  const tl = gsap.timeline();
  
  if (reducedMotion) {

    tl.set(next, { autoAlpha: 1 });
    tl.add("pageReady")
    tl.call(resetPage, [next], "pageReady");
    return new Promise(resolve => tl.call(resolve, null, "pageReady"));
  }
  
  tl.add("startEnter", 0);
  
  tl.set(next, {
    zIndex: 3
  });
  
  tl.fromTo(next, {
    y: "100vh"
  }, {
    y: "0vh",
    duration: 1.2,
    clearProps: "all",
    ease: "parallax"
  }, "startEnter");

  tl.add("pageReady");
  tl.call(resetPage, [next], "pageReady");

  return new Promise(resolve => {
    tl.call(resolve, null, "pageReady");
  });
}


// -----------------------------------------
// BARBA HOOKS + INIT
// -----------------------------------------

barba.hooks.beforeEnter(data => {

  gsap.set(data.next.container, {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
  });
  
  if (lenis && typeof lenis.stop === "function") {
    lenis.stop();
  }
  
  initBeforeEnterFunctions(data.next.container);
  applyThemeFrom(data.next.container);
});

barba.hooks.afterLeave(() => {
  if (hasScrollTrigger) {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  }
  document.querySelectorAll('.footer-reveal-spacer').forEach(el => el.remove());
});

barba.hooks.enter(data => {
  initBarbaNavUpdate(data);
})

barba.hooks.afterEnter(data => {
  initAfterEnterFunctions(data.next.container);
  
  if(hasLenis){
    lenis.resize();
    if (!scrollLocked) lenis.start(); 
  }
  
  if(hasScrollTrigger){
    ScrollTrigger.refresh(); 
  }
});

barba.init({
  debug: false,
  timeout: 7000,
  preventRunning: true,
  views: initViewsFunction(),
  transitions: [
    {
      name: "default",
      sync: true,
      
      // First load
      async once(data) {
        initOnceFunctions();

        return runPageOnceAnimation(data.next.container);
      },

      // Current page leaves
      async leave(data) {
        return runPageLeaveAnimation(data.current.container, data.next.container);
      },

      // New page enters
      async enter(data) {
        return runPageEnterAnimation(data.next.container);
      }
    }
  ],
});



// -----------------------------------------
// GENERIC + HELPERS
// -----------------------------------------

const themeConfig = {
  light: {
    nav: "dark",
    transition: "light"
  },
  dark: {
    nav: "light",
    transition: "dark"
  }
};

function applyThemeFrom(container) {
  const pageTheme = container?.dataset?.pageTheme || "light";
  const config = themeConfig[pageTheme] || themeConfig.light;
  
  document.body.dataset.pageTheme = pageTheme;
  const transitionEl = document.querySelector('[data-theme-transition]');
  if (transitionEl) {
    transitionEl.dataset.themeTransition = config.transition;
  }

  const nav = document.querySelector('[data-theme-nav]');
  if (nav) {
    nav.dataset.themeNav = config.nav;
  }
}

function initLenis() {
  if (lenis) return; 
  if (!hasLenis) return;

  lenis = new Lenis({
    lerp: 0.075,
    wheelMultiplier: 1,
  });

  if (hasScrollTrigger) {
    lenis.on("scroll", ScrollTrigger.update);
  }

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
  
  if (scrollLocked) lenis.stop();

  
}

function resetPage(container) {
  window.scrollTo(0, 0);
  gsap.set(container, { clearProps: "position,top,left,right" });

  if (hasLenis && lenis) {
    lenis.resize();
    if (!scrollLocked) lenis.start();
  }
}

function debounceOnWidthChange(fn, ms) {
  let last = innerWidth,
    timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (innerWidth !== last) {
        last = innerWidth;
        fn.apply(this, args);
      }
    }, ms);
  };
}

function initBarbaNavUpdate(data) {
  const tpl = document.createElement("template");
  tpl.innerHTML = (data?.next?.html || "").trim();


  const nextBlocks = tpl.content.querySelectorAll("nav [data-barba-update]");

  const currBlocks = document.querySelectorAll("nav [data-barba-update]");

  currBlocks.forEach((currBlock, i) => {
    const nextBlock = nextBlocks[i];
    if (!nextBlock) return;


    currBlock.setAttribute("class", nextBlock.getAttribute("class") || "");


    const currA = currBlock.querySelector("a[href]");
    const nextA = nextBlock.querySelector("a[href]");

    if (currA && nextA) {

      const newAria = nextA.getAttribute("aria-current");
      if (newAria !== null) currA.setAttribute("aria-current", newAria);
      else currA.removeAttribute("aria-current");


      currA.setAttribute("class", nextA.getAttribute("class") || "");
    }


    const currLi = currBlock.closest("li");
    const nextLi = nextBlock.closest("li");
    if (currLi && nextLi) {
      currLi.setAttribute("class", nextLi.getAttribute("class") || "");
    }
  });
}

function preventSamePageClicks() {

  if (window.__soSamePageGuardBound) return () => {};
  window.__soSamePageGuardBound = true;

  const normPath = (p) =>
    (p || "")
      .replace(/\/index\.html?$/i, "")
      .replace(/\/+$/g, "") || "/";

  const getOffset = () =>
    parseFloat(document.documentElement.getAttribute("data-anchor-offset") || "0") || 0;

  const getTargetFromHash = (hash) => {
    if (!hash || hash.length < 2) return null;
    const id = decodeURIComponent(hash.slice(1));
    if (!id) return null;


    const byId = document.getElementById(id);
    if (byId) return byId;

    try {
      const safe = (window.CSS && CSS.escape) ? CSS.escape(id) : id;
      return document.querySelector(`#${safe}`);
    } catch (_) {
      return null;
    }
  };

  const isSkippable = (a, e) => {
    const href = (a.getAttribute("href") || "").trim();
    const h = href.toLowerCase();

    return (
      !href ||
      h === "#" ||
      h.startsWith("javascript:") ||
      h.startsWith("mailto:") ||
      h.startsWith("tel:") ||
      e.defaultPrevented ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      e.button === 1 ||
      a.target === "_blank" ||
      a.hasAttribute("download") ||
      a.rel === "external" ||
      a.dataset.allowSame === "true"
    );
  };

  const onClick = (e) => {
    const a = e.target.closest?.("a[href]");
    if (!a || isSkippable(a, e)) return;

    let dest;
    try {
      dest = new URL(a.getAttribute("href"), location.href);
    } catch (_) {
      return;
    }


    if (dest.origin !== location.origin) return;

    const sameBase =
      normPath(dest.pathname) === normPath(location.pathname) &&
      dest.search === location.search;

    if (!sameBase) return;


    e.preventDefault();

    const offset = getOffset();

    if (dest.hash) {
      const target = getTargetFromHash(dest.hash);
      if (target) {
        if (window.lenis?.scrollTo) {
          window.lenis.scrollTo(target, { offset: -offset });
        } else {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }
    }


    if ((window.scrollY || 0) < 2) return;

    if (window.lenis?.scrollTo) {
      window.lenis.scrollTo(0);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  document.addEventListener("click", onClick, true);


  return () => {
    try {
      document.removeEventListener("click", onClick, true);
    } catch (_) {}
    try {
      delete window.__soSamePageGuardBound;
    } catch (_) {}
  };
}

function lockScroll() {
  scrollLocked = true;
  document.documentElement.classList.add("lenis-stopped");
  document.body.classList.add("lenis-stopped");
  if (lenis?.stop) lenis.stop();
}

function unlockScroll() {
  scrollLocked = false;
  document.documentElement.classList.remove("lenis-stopped");
  document.body.classList.remove("lenis-stopped");
  if (lenis?.start) lenis.start();
  if (lenis?.resize) lenis.resize();
}

function initDynamicYear() {
  const year = String(new Date().getFullYear());
  document.querySelectorAll("[data-dynamic-year]").forEach(el => {
    el.textContent = year;
  });
  return () => {};
}

function initSignature() {
  if (window.__signatureInit) return;
  window.__signatureInit = true;

  if (!window.console || typeof window.console.log !== "function") return;

  const mq = window.matchMedia?.("(prefers-color-scheme: dark)");

  const printSignature = () => {
    const isDark = mq?.matches;

    const theme = isDark
      ? {
          bg: "#111111",
          text: "#F8F6F1",
          muted: "#C8C2B8",
        }
      : {
          bg: "#F8F6F1",
          text: "#111111",
          muted: "#5F5A52",
        };

    const common = [
      `background:${theme.bg}`,
      "font-size:12px",
      "font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      "line-height:1.4",
    ].join(";");

    const creditsStyle = [
      common,
      `color:${theme.muted}`,
      "padding:10px 14px 2px 14px",
    ].join(";");

    const brandStyle = [
      common,
      `color:${theme.text}`,
      "font-weight:600",
      "padding:0 14px 2px 14px",
    ].join(";");

    const urlStyle = [
      common,
      `color:${theme.muted}`,
      "padding:0 14px 10px 14px",
    ].join(";");

    console.log("%cCredits", creditsStyle);
    console.log("%cStudio Olimpo | Above the ordinary", brandStyle);
    console.log("%chttps://www.studioolimpo.it", urlStyle);
  };

  printSignature();

  mq?.addEventListener?.("change", printSignature);
  mq?.addListener?.(printSignature);
}

function initIubendaPreferencesLink() {
  if (window.__iubendaPrefBound) return;
  window.__iubendaPrefBound = true;

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest(".iubenda-cs-preferences-link");
    if (!trigger) return;
    e.preventDefault();
    e.stopPropagation();


    if (window._iub?.cs?.api?.openPreferences) {
      _iub.cs.api.openPreferences();
    } else {
      console.warn("[iubenda] openPreferences OFF");
    }
  }, true);
}

function sendGAPageView() {
  if (typeof gtag !== "function") return;

  const lastUpdate = [...(window.dataLayer || [])]
    .reverse()
    .find(item => Array.isArray(item) && item[0] === "consent" && item[1] === "update");

  const isGranted = lastUpdate?.[2]?.analytics_storage === "granted";
  if (!isGranted) return;

  gtag("event", "page_view", {
    page_path:     window.location.pathname,
    page_title:    document.title,
    page_location: window.location.href,
    send_to:       "G-M1VZCMHDMV",
  });
}


function initPrefetch() {
  if (window.__prefetchBound) return;
  window.__prefetchBound = true;

  const prefetched = new Set();
  const DELAY_MS = 100;
  let pendingTimer = null;
  let pendingUrl = null;

  const prefetch = (url) => {
    if (prefetched.has(url)) return;
    prefetched.add(url);
    const link = document.createElement("link");
    link.rel  = "prefetch";
    link.href = url;
    link.as   = "document";
    document.head.appendChild(link);
  };

  const cancel = () => {
    clearTimeout(pendingTimer);
    pendingTimer = null;
    pendingUrl = null;
  };

  document.addEventListener("mouseover", (e) => {
    const a = e.target.closest("a[href]");
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

    let dest;
    try { dest = new URL(href, location.href); } catch (_) { return; }

    if (dest.origin !== location.origin) return;
    if (dest.pathname === location.pathname) return;
    if (prefetched.has(dest.href)) return;
    if (pendingUrl === dest.href) return;

    cancel();
    pendingUrl = dest.href;
    pendingTimer = setTimeout(() => {
      prefetch(dest.href);
      pendingUrl = null;
    }, DELAY_MS);
  }, true);

  document.addEventListener("mouseout", (e) => {
    const a = e.target.closest("a[href]");
    if (!a) return;

    if (a.contains(e.relatedTarget)) return;

    let dest;
    try { dest = new URL(a.getAttribute("href"), location.href); } catch (_) { return; }

    if (pendingUrl === dest.href) cancel();
  }, true);
}



// -----------------------------------------
// YOUR FUNCTIONS GO BELOW HERE
// -----------------------------------------

// NAV THEME FROM SECTIONS [data-animate-theme-to]
function initNavThemeScroll() {
  if (!window.gsap || !window.ScrollTrigger) return;

  const nav = document.querySelector(".nav_component");
  if (!nav) return;


  navThemeTriggers.forEach((t) => t && t.kill && t.kill());
  navThemeTriggers = [];

  const blocks = Array.from(document.querySelectorAll("[data-animate-theme-to]"));
  if (!blocks.length) return;

  const run = () => {
    if (!window.colorThemes || typeof window.colorThemes.getTheme !== "function") return;

    blocks.forEach((el) => {
      const theme = el.getAttribute("data-animate-theme-to") || "light";
      const brand = el.getAttribute("data-animate-brand-to") || undefined;

      const st = ScrollTrigger.create({
        trigger: el,
        start: "top 2%",
        end: "bottom 2%",
        onToggle: ({ isActive }) => {
          if (!isActive) return;
          gsap.to(nav, { ...colorThemes.getTheme(theme, brand), overwrite: true });
        },
      });

      navThemeTriggers.push(st);
    });
  };


  if (window.colorThemes && typeof window.colorThemes.getTheme === "function") {
    run();
  } else {
    document.addEventListener("colorThemesReady", run, { once: true });
  }
}

// SLIDER SMOOOTHY [data-smooothy="1"]
function initSmoothySlider() {
  if (!hasSmooothy) return () => {};

  const wrappers = document.querySelectorAll('[data-smooothy="1"]');
  if (!wrappers.length) return () => {};

  class AutoScrollSlider extends window.Smooothy {
    #isPaused = false;
    #scrollSpeed = 0.25;

    #resumeDelay = 50;
    #resumeTimer = null;

    #speedMul = 0;
    #speedMulTarget = 1;
    #BRAKE_LERP = 0.08;
    #RESUME_LERP = 0.05;

    #inView = true;
    #io = null;

    #tickerFn = null;

    #onEnter = null;
    #onLeave = null;
    #onTouchStart = null;
    #onTouchEnd = null;
    #onTouchCancel = null;
    #onVisChange = null;

    constructor(container, config = {}) {
      super(container, {
        ...config,
        infinite: true,
        snap: false,
        scrollInput: false,
        lerpFactor: 0.2,
        dragSensitivity: 0.009,
      });

      const originalUpdate = super.update.bind(this);

      this.#tickerFn = () => {
        const lerp = (this.#speedMulTarget < this.#speedMul) ? this.#BRAKE_LERP : this.#RESUME_LERP;
        this.#speedMul += (this.#speedMulTarget - this.#speedMul) * lerp;
        if (Math.abs(this.#speedMulTarget - this.#speedMul) < 0.001) {
          this.#speedMul = this.#speedMulTarget;
        }

        const rawDt = (typeof this.deltaTime === "number") ? this.deltaTime : 0;
        const dt = Math.min(Math.max(rawDt, 0), 0.05);

        if (!this.#isPaused && this.#inView && this.isVisible && !this.isDragging) {
          const v = this.#scrollSpeed * this.#speedMul;
          if (v && dt) this.target -= v * dt;
        }

        originalUpdate();
        this.#checkDragging();
      };

      gsap.ticker.add(this.#tickerFn);

      this.#setupPauseOnInteraction(container);
      this.#setupViewportPause(container);
      this.#setupVisibilityPause();

      this.#speedMul = 0;
      this.#speedMulTarget = 1;
    }

    #pause() {
      this.#isPaused = true;
      this.#speedMulTarget = 0;
      this.#clearResume();
    }

    #resume() {
      this.#isPaused = false;
      this.#speedMulTarget = 1;
    }

    #resumeAfterDelay() {
      this.#clearResume();
      this.#resumeTimer = setTimeout(() => this.#resume(), this.#resumeDelay);
    }

    #clearResume() {
      clearTimeout(this.#resumeTimer);
      this.#resumeTimer = null;
    }

    #wasDragging = false;
    #checkDragging() {
      if (this.isDragging && !this.#wasDragging) {
        this.#wasDragging = true;
        this.#pause();
        return;
      }
      if (!this.isDragging && this.#wasDragging) {
        this.#wasDragging = false;
        if (this.#inView) this.#resumeAfterDelay();
      }
    }

    #setupPauseOnInteraction(sliderEl) {
      this.#onEnter = () => this.#pause();
      this.#onLeave = () => { if (this.#inView) this.#resumeAfterDelay(); };

      sliderEl.addEventListener("pointerenter", this.#onEnter);
      sliderEl.addEventListener("pointerleave", this.#onLeave);

      this.#onTouchStart = () => this.#pause();
      const resume = () => { if (this.#inView) this.#resumeAfterDelay(); };
      this.#onTouchEnd = resume;
      this.#onTouchCancel = resume;

      sliderEl.addEventListener("touchstart", this.#onTouchStart, { passive: true });
      sliderEl.addEventListener("touchend", this.#onTouchEnd, { passive: true });
      sliderEl.addEventListener("touchcancel", this.#onTouchCancel, { passive: true });
    }

    #setupViewportPause(sliderEl) {
      if (!("IntersectionObserver" in window)) return;

      this.#io = new IntersectionObserver((entries) => {
        const entry = entries[0];
        const nowInView = !!entry && entry.isIntersecting;
        if (nowInView === this.#inView) return;

        this.#inView = nowInView;

        if (!this.#inView) {
          this.#speedMulTarget = 0;
          this.#clearResume();
        } else {
          this.#speedMulTarget = (!this.#isPaused && !this.isDragging) ? 1 : 0;
        }
      }, { threshold: 0.1 });

      this.#io.observe(sliderEl);
    }

    #setupVisibilityPause() {
      this.#onVisChange = () => {
        if (document.hidden) {
          this.#pause();
        } else {
          if (this.#inView && !this.isDragging) this.#resumeAfterDelay();
        }
      };
      document.addEventListener("visibilitychange", this.#onVisChange);
    }

    destroy() {
      this.#clearResume();

      if (this.#tickerFn) {
        try { gsap.ticker.remove(this.#tickerFn); } catch (_) {}
        this.#tickerFn = null;
      }

      try { this.#io?.disconnect(); } catch (_) {}
      this.#io = null;

      try {
        const el = this.container || null;
        if (el) {
          if (this.#onEnter) el.removeEventListener("pointerenter", this.#onEnter);
          if (this.#onLeave) el.removeEventListener("pointerleave", this.#onLeave);
          if (this.#onTouchStart) el.removeEventListener("touchstart", this.#onTouchStart);
          if (this.#onTouchEnd) el.removeEventListener("touchend", this.#onTouchEnd);
          if (this.#onTouchCancel) el.removeEventListener("touchcancel", this.#onTouchCancel);
        }
      } catch (_) {}

      if (this.#onVisChange) {
        try { document.removeEventListener("visibilitychange", this.#onVisChange); } catch (_) {}
        this.#onVisChange = null;
      }

      try { super.destroy?.(); } catch (_) {}
    }
  }

  const instances = [];

  wrappers.forEach((wrapper) => {
    if (wrapper.dataset.smoothyInitialized === "true") return;
    wrapper.dataset.smoothyInitialized = "true";

    try {
      const instance = new AutoScrollSlider(wrapper);
      if (!instance.container) instance.container = wrapper;
      instances.push({ wrapper, instance });
    } catch (e) {
      console.warn("[SMOOOTHY] init error:", e);
      delete wrapper.dataset.smoothyInitialized;
    }
  });

  return () => {
    instances.forEach(({ wrapper, instance }) => {
      try { instance.destroy(); } catch (_) {}
      try { delete wrapper.dataset.smoothyInitialized; } catch (_) {}
    });
    instances.length = 0;
  };
}

//HERO SLIDESHOW [data-hero-slideshow]
function initHeroSlideshow() {
  const container = document.querySelector("[data-hero-slideshow]");
  if (!container) return;

  const section = container.closest("[data-hero]");
  if (!section) return;

  const images = [...container.querySelectorAll(".u-image-wrapper")];
  if (!images.length) return;

  if (getComputedStyle(section).position === "static") {
    section.style.position = "relative";
  }
  section.style.overflow = "hidden";

  gsap.set(container, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: -1,
    visibility: "visible",
  });

  const isDesktop = window.innerWidth > 991;

  // ✅ keep roughly the same density, but reduce on-screen time
  const TARGET = isDesktop ? { min: 12, max: 14 } : { min: 3, max: 6 };
  const OFFSET = isDesktop ? 24 : 16;

  // ✅ SHORTER STAY (was 3000–6000)
  const STAY_MS = isDesktop
    ? { min: 1600, max: 2600 }
    : { min: 1200, max: 2000 };

  let visibleCount = 0;
  let activePlacements = [];

  const slots = images.map((img) => {
    const slot = document.createElement("div");
    slot.classList.add("slideshow-slot");
    img.parentNode.insertBefore(slot, img);
    slot.appendChild(img);
    gsap.set(slot, { autoAlpha: 0 });
    return slot;
  });

  function getSlotRect() {
    return slots[0].getBoundingClientRect();
  }

  function hasOverlap(c) {
    return activePlacements.some(
      (p) =>
        !(
          c.x + c.w + OFFSET <= p.x ||
          p.x + p.w + OFFSET <= c.x ||
          c.y + c.h + OFFSET <= p.y ||
          p.y + p.h + OFFSET <= c.y
        )
    );
  }

  function findFreePosition() {
    const { width: w, height: h } = getSlotRect();
    if (!w || !h) return null;

    const sw = section.offsetWidth;
    const sh = section.offsetHeight;

    for (let i = 0; i < 60; i++) {
      const x = Math.random() * (sw - w);
      const y = Math.random() * (sh - h);
      if (!hasOverlap({ x, y, w, h })) return { x, y, w, h };
    }
    return null;
  }

  function showImage() {
    if (visibleCount >= TARGET.max) return false;

    const pool = slots.filter((s) => !s._active);
    if (!pool.length) return false;

    const pos = findFreePosition();
    if (!pos) return false;

    const slot = pool[Math.floor(Math.random() * pool.length)];
    slot._active = true;
    slot._placement = pos;
    visibleCount++;
    activePlacements.push(pos);

    gsap.set(slot, { left: pos.x, top: pos.y });

    gsap.fromTo(
      slot,
      { autoAlpha: 0, y: "1.5em" },
      { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" }
    );

    // ✅ shorter visibility window
    const stay =
      STAY_MS.min + Math.random() * (STAY_MS.max - STAY_MS.min);

    gsap.delayedCall(stay / 1000, () => {
      gsap.to(slot, {
        autoAlpha: 0,
        y: "-1.5em",
        duration: 0.6,
        ease: "power2.in",
        onComplete: () => {
          slot._active = false;
          visibleCount--;
          activePlacements = activePlacements.filter((p) => p !== slot._placement);
          slot._placement = null;
        },
      });
    });

    return true;
  }

  function populate() {
    const target =
      TARGET.min + Math.floor(Math.random() * (TARGET.max - TARGET.min + 1));
    let placed = 0;

    function next() {
      if (placed >= target) return;
      if (showImage()) placed++;

      gsap.delayedCall((200 + placed * 80 + Math.random() * 300) / 1000, next);
    }

    gsap.delayedCall(0.3, next);
  }

  function loop() {
    gsap.delayedCall((400 + Math.random() * 800) / 1000, () => {
      if (visibleCount < TARGET.min) showImage();
      else if (Math.random() > 0.5) showImage();
      loop();
    });
  }

  populate();
  loop();
}

// LOADER LOGO REVEAL [data-load-wrap]
function initLogoRevealLoader() {
  const wrap = document.querySelector("[data-load-wrap]");
  if (!wrap) return;

  const container = wrap.querySelector("[data-load-container]");
  const bg = wrap.querySelector("[data-load-bg]");
  const progressBar = wrap.querySelector("[data-load-progress]");
  const logo = wrap.querySelector("[data-load-logo]");
  const textElements = Array.from(wrap.querySelectorAll("[data-load-text]"));
  const resetTargets = Array.from(
    wrap.querySelectorAll('[data-load-reset]:not([data-load-text])')
  );
  const transitionWrap = document.querySelector("[data-transition-wrap]");
  const transitionDark = transitionWrap?.querySelector("[data-transition-dark]");

  if (!container || !bg || !progressBar) return;

  const hasSplitText = typeof window.SplitText !== "undefined";

  // Logo SVG elements
  const logoSvgs = logo ? Array.from(logo.querySelectorAll(".u-svg")) : [];
  const logoPaths = logo ? Array.from(logo.querySelectorAll(".u-svg path")) : [];

  // Logo parts
  const pathsSando = logo ? Array.from(logo.querySelectorAll("#logo-sando path")) : [];
  const pathsJapan = logo
    ? Array.from(logo.querySelectorAll("#logo-japan > path, #logo-japan path"))
    : [];


  if (window.CustomEase && !gsap.parseEase("logoReveal")) {
    CustomEase.create("logoReveal", "0.22, 1, 0.36, 1");
  }

  if (typeof lockScroll === "function") lockScroll();

  // Init states
  gsap.set(wrap, { display: "block", y: "0vh" });
  gsap.set(container, { autoAlpha: 1 });
  gsap.set(bg, { yPercent: 0 });
  gsap.set(progressBar, { scaleX: 0, transformOrigin: "left center", autoAlpha: 1 });


  if (logoSvgs.length) gsap.set(logoSvgs, { y: 20, force3D: true });
  if (logoPaths.length) gsap.set(logoPaths, { autoAlpha: 0 });
  if (logo) gsap.set(logo, { autoAlpha: 1 });


  const allLogoPaths = [...pathsSando, ...pathsJapan];
  if (allLogoPaths.length) {
    gsap.set(allLogoPaths, {
      transformBox: "fill-box",
      transformOrigin: "50% 50%",
      backfaceVisibility: "hidden",
      transformPerspective: 1000,
      force3D: true,
    });
  }

  const revealLogo = (els, { closedClip, openClip, from, to } = {}) => {
    if (!els || !els.length) return null;

    const _closed = closedClip ?? "inset(0 0 120% 0)";
    const _open = openClip ?? "inset(-25% 0 -25% 0)";

    gsap.set(els, {
      willChange: "clip-path, transform, opacity",
      backfaceVisibility: "hidden",
      transformPerspective: 1000,
      force3D: true,

      
      yPercent: 110,
      clipPath: _closed,

      ...(from || {}),
    });

    return {
      yPercent: 0,
      clipPath: _open,
      duration: 1.6,
      stagger: 0.04,
      ease: gsap.parseEase("logoReveal") ? "logoReveal" : "power3.out",
      delay: 0.5,

      
      immediateRender: false,

      ...(to || {}),
      onComplete: () => gsap.set(els, { willChange: "auto" }),
    };
  };

  if (resetTargets.length) gsap.set(resetTargets, { autoAlpha: 1 });

  if (transitionDark) {
    gsap.set(transitionWrap, { zIndex: 1 });
    gsap.set(transitionDark, { autoAlpha: 0.9 });
  }

  let splitA = null;
  let splitB = null;

  const tl = gsap.timeline({
    defaults: { ease: "loader", duration: 3 },
    
    onInterrupt: () => {
      if (typeof unlockScroll === "function") unlockScroll();
    },
    onComplete: () => {
      if (typeof unlockScroll === "function") unlockScroll();
    },
  });

  // --- TIMING PLAN ---
  const T_BAR_START = 0.25;
  const T_LOGO_START = 0.05;
  const T_TEXT_START = 1.10;

  // --- MASTER PROGRESS ---
  const prog = { t: 0 };
  const PROG_DUR = 3.5;

  tl.to(
    prog,
    {
      t: 1,
      duration: PROG_DUR,
      ease: "loader",
      onUpdate: () => gsap.set(progressBar, { scaleX: prog.t }),
    },
    T_BAR_START
  );

  // --- PROGRESS BAR ---
  tl.to(
    progressBar,
    {
      delay: 0.8,
      autoAlpha: 0,
      duration: PROG_DUR,
      ease: "none",
    },
    T_BAR_START
  );

  // --- LOGO REVEAL FIRST ---
  if (pathsSando.length) {
    gsap.set(pathsSando, { autoAlpha: 1 });
    tl.to(pathsSando, revealLogo(pathsSando), T_LOGO_START);
  }

  if (pathsJapan.length) {
    gsap.set(pathsJapan, { autoAlpha: 1 });
    tl.to(
      pathsJapan,
      revealLogo(pathsJapan, { from: { yPercent: 110 } }),
      T_LOGO_START + 0.05
    );
  }

  
  if (logoSvgs.length) {
    tl.to(
      logoSvgs,
      {
        y: 0,
        duration: 1.2,
        stagger: { each: 0.05 },
        ease: "power2.out",
        force3D: true,
        immediateRender: false,
      },
      T_LOGO_START + 0.25
    );
  }

  // --- TEXT AFTER LOGO ---
  if (hasSplitText && textElements.length >= 2) {
    splitA = new SplitText(textElements[0], { type: "lines", mask: "lines" });
    splitB = new SplitText(textElements[1], { type: "lines", mask: "lines" });

    gsap.set([splitA.lines, splitB.lines], { autoAlpha: 0, yPercent: 125 });
    gsap.set(textElements, { autoAlpha: 1 });

    tl.to(
      splitA.lines,
      {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.65,
        ease: "expo.out",
        stagger: { each: 0.08 },
        immediateRender: false,
      },
      T_TEXT_START
    );

    tl.to(
      splitA.lines,
      {
        autoAlpha: 0,
        yPercent: -125,
        duration: 0.4,
        ease: "expo.in",
        stagger: { each: 0.08 },
        immediateRender: false,
      },
      T_TEXT_START + 0.95
    );

    tl.to(
      splitB.lines,
      {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.65,
        ease: "expo.out",
        stagger: { each: 0.08 },
        immediateRender: false,
      },
      T_TEXT_START + 1.30
    );
  }

  // --- EXIT ---
  tl.addLabel("exit", 3.5);

  // UNLOCK SCROLL 
  tl.call(() => {
    if (typeof unlockScroll === "function") unlockScroll();
  }, null, "exit-=0.01");

  if (transitionDark) {
    tl.to(
      transitionDark,
      {
        autoAlpha: 0,
        duration: 0.7,
        ease: "power2.inOut",
        immediateRender: false,
      },
      "exit+=0.2"
    );
  }

  tl.fromTo(
    nextPage,
    { y: "25vh" },
    { y: "0vh", duration: 1, ease: "parallax", clearProps: "transform", immediateRender: false },
    "exit-=0.05"
  );

  tl.to(
    wrap,
    { y: "-110vh", duration: 1, ease: "parallax", immediateRender: false },
    "exit"
  );

  // --- CLEANUP ---
  tl.addLabel("cleanup", "exit+=1.2");
  tl.set(wrap, { autoAlpha: 0, display: "none", clearProps: "transform" }, "cleanup");

  if (transitionWrap) {
    tl.set(transitionWrap, { clearProps: "zIndex" }, "cleanup");
  }

  tl.add(() => {
    document.documentElement.classList.remove("is-loading");
    if (logoSvgs.length) gsap.set(logoSvgs, { clearProps: "all" });
    if (logoPaths.length) gsap.set(logoPaths, { clearProps: "all" });
    try { splitA?.revert(); } catch (_) {}
    try { splitB?.revert(); } catch (_) {}


    if (typeof unlockScroll === "function") unlockScroll();
  }, "cleanup");

  return tl;
}

// FOOTER REVEAL OSMO [data-footer-parallax]
function initFooterParallax(){
  document.querySelectorAll('[data-footer-parallax]').forEach(el => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: 'clamp(top bottom)',
        end: 'clamp(top top)',
        scrub: true
      }
    });
  
    const inner = el.querySelector('[data-footer-parallax-inner]');
    const dark  = el.querySelector('[data-footer-parallax-dark]');
  
    if (inner) {
      tl.from(inner, {
        yPercent: -12,
        ease: 'linear'
      });
    } 
  
    if (dark) {
      tl.from(dark, {
        opacity: 0.7,
        ease: 'linear'
      }, '<');
    }
  });
}

// SHOKU BOUNCE [data-shoku]
function initShokuBounce() {
  
    console.log("shoku bounceeee!");
    
        if (!gsap) {
            return () => { };
        }

        const el = document.querySelector("[data-shoku]");
        if (!el) return () => { };

        
        if (el.dataset.shokuBounceInitialized === "true") return () => { };
        el.dataset.shokuBounceInitialized = "true";

        // ----- Config -----
        const cfg = {
            
            speedMin: 200,
            speedMax: 320,

           
            friction: 0.01,

            
            restitution: 0.98,

            
            cursorRadius: 28, 
            repelStrength: 420, 

            
            maxSpeed: 650,
        };

        
        const prevPos = {
            position: el.style.position,
            top: el.style.top,
            left: el.style.left,
            right: el.style.right,
            bottom: el.style.bottom,
            willChange: el.style.willChange,
        };

        gsap.set(el, {
            position: "fixed",
            top: 0,
            left: 0,
            right: "auto",
            bottom: "auto",
            willChange: "transform",
            transformOrigin: "center center",
        });


        const setX = gsap.quickSetter(el, "x", "px");
        const setY = gsap.quickSetter(el, "y", "px");


        let rafActive = true;
        let lastTime = performance.now();

        let boundsW = window.innerWidth;
        let boundsH = window.innerHeight;


        let rect = el.getBoundingClientRect();
        let w = rect.width || 0;
        let h = rect.height || 0;


        let x = Math.max(0, Math.min(boundsW - w, (boundsW - w) * 0.25));
        let y = Math.max(0, Math.min(boundsH - h, (boundsH - h) * 0.35));


        function rand(min, max) {
            return min + Math.random() * (max - min);
        }

        const baseSpeed = rand(cfg.speedMin, cfg.speedMax);
        const angle = rand(0, Math.PI * 2);
        let vx = Math.cos(angle) * baseSpeed;
        let vy = Math.sin(angle) * baseSpeed;


        function updateSize() {
            boundsW = window.innerWidth;
            boundsH = window.innerHeight;


            rect = el.getBoundingClientRect();
            w = rect.width || 0;
            h = rect.height || 0;


            const maxX = Math.max(0, boundsW - w);
            const maxY = Math.max(0, boundsH - h);


            x = Math.max(0, Math.min(maxX, x));
            y = Math.max(0, Math.min(maxY, y));
        }

        window.addEventListener("resize", updateSize, { passive: true });

        /* -------------------------
           DRAG
        ------------------------- */
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        
        let lastPtrX = 0;
        let lastPtrY = 0;
        let lastPtrT = 0;
        let throwVX = 0;
        let throwVY = 0;

        const prevDragStyle = {
            cursor: el.style.cursor,
            touchAction: el.style.touchAction,
            userSelect: el.style.userSelect,
            webkitUserSelect: el.style.webkitUserSelect,
        };

        
        const GRAB_SHRINK_PX = 8; 
        let grabTween = null;

        function getGrabScale() {
            
            updateSize();
            if (!w || !h) return 0.94;
            const sx = (w - GRAB_SHRINK_PX) / w;
            const sy = (h - GRAB_SHRINK_PX) / h;
            
            const s = Math.min(sx, sy);
            return Math.max(0.7, Math.min(0.98, s));
        }

        
        el.style.cursor = "grab";
        el.style.touchAction = "none"; 
        el.style.userSelect = "none";
        el.style.webkitUserSelect = "none";

        function clampToBounds() {
            const maxX = Math.max(0, boundsW - w);
            const maxY = Math.max(0, boundsH - h);
            x = Math.max(0, Math.min(maxX, x));
            y = Math.max(0, Math.min(maxY, y));
        }

        function onPointerDown(e) {
            
            if (e.pointerType === "mouse" && e.button !== 0) return;

            isDragging = true;
            el.style.cursor = "grabbing";

            
            grabTween?.kill();
            grabTween = gsap.to(el, {
                scale: getGrabScale(),
                duration: 0.28,
                ease: "power2.out",
                overwrite: true,
            });

            
            try { el.setPointerCapture(e.pointerId); } catch (_) { }

            
            dragOffsetX = e.clientX - x;
            dragOffsetY = e.clientY - y;

            
            lastPtrX = e.clientX;
            lastPtrY = e.clientY;
            lastPtrT = performance.now();
            throwVX = 0;
            throwVY = 0;

            
            e.preventDefault();
        }

        function onPointerMove(e) {
            if (!isDragging) return;

           
            x = e.clientX - dragOffsetX;
            y = e.clientY - dragOffsetY;
            clampToBounds();

            
            setX(x);
            setY(y);

            
            const now = performance.now();
            const dt = Math.max(0.001, (now - lastPtrT) / 1000);
            const dx = e.clientX - lastPtrX;
            const dy = e.clientY - lastPtrY;

            
            const instVX = dx / dt;
            const instVY = dy / dt;
            throwVX = throwVX * 0.65 + instVX * 0.35;
            throwVY = throwVY * 0.65 + instVY * 0.35;

            lastPtrX = e.clientX;
            lastPtrY = e.clientY;
            lastPtrT = now;

            e.preventDefault();
        }

        function onPointerUp(e) {
            if (!isDragging) return;
            isDragging = false;
            el.style.cursor = "grab";

            
            grabTween?.kill();
            grabTween = gsap.to(el, {
                scale: 1,
                duration: 0.38,
                ease: "power2.out",
                overwrite: true,
            });

            
            try { el.releasePointerCapture(e.pointerId); } catch (_) { }

            
            vx = throwVX;
            vy = throwVY;

            
            const sp = Math.hypot(vx, vy);
            if (sp > cfg.maxSpeed) {
                const k = cfg.maxSpeed / sp;
                vx *= k;
                vy *= k;
            }

            e.preventDefault();
        }

        el.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("pointermove", onPointerMove, { passive: false });
        window.addEventListener("pointerup", onPointerUp, { passive: false });
        window.addEventListener("pointercancel", onPointerUp, { passive: false });

        
        function clamp(val, min, max) {
            return Math.max(min, Math.min(max, val));
        }

        function tick() {
            if (!rafActive) return;

            try {
                const now = performance.now();
                
                const dt = clamp((now - lastTime) / 1000, 0, 0.05);
                lastTime = now;

                
                if (isDragging) {
                    
                    setX(x);
                    setY(y);
                    return;
                }
                x += vx * dt;
                y += vy * dt;

                
                const maxX = Math.max(0, boundsW - w);
                const maxY = Math.max(0, boundsH - h);

                if (x <= 0) {
                    x = 0;
                    vx = Math.abs(vx) * cfg.restitution;
                } else if (x >= maxX) {
                    x = maxX;
                    vx = -Math.abs(vx) * cfg.restitution;
                }

                if (y <= 0) {
                    y = 0;
                    vy = Math.abs(vy) * cfg.restitution;
                } else if (y >= maxY) {
                    y = maxY;
                    vy = -Math.abs(vy) * cfg.restitution;
                }

                
                const fr = Math.pow(1 - cfg.friction, dt);
                vx *= fr;
                vy *= fr;

                const sp = Math.hypot(vx, vy);
                if (sp < 140) {
                    const boost = (140 - sp) * 0.4;
                    const a = Math.atan2(vy, vx);
                    vx += Math.cos(a) * boost;
                    vy += Math.sin(a) * boost;
                }

                const sp2 = Math.hypot(vx, vy);
                if (sp2 > cfg.maxSpeed) {
                    const k = cfg.maxSpeed / sp2;
                    vx *= k;
                    vy *= k;
                }

                setX(x);
                setY(y);
            } catch (err) {
                console.warn("[SHOKU] Tick error, stop bounce:", err);
                rafActive = false;
                gsap.ticker.remove(tick);
            }
        }

        updateSize();

        gsap.ticker.add(tick);

        setX(x);
        setY(y);

        return () => {
            rafActive = false;
            gsap.ticker.remove(tick);
            grabTween?.kill();
            grabTween = null;
            el.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            window.removeEventListener("pointercancel", onPointerUp);

            el.style.cursor = prevDragStyle.cursor;
            el.style.touchAction = prevDragStyle.touchAction;
            el.style.userSelect = prevDragStyle.userSelect;
            el.style.webkitUserSelect = prevDragStyle.webkitUserSelect;

            window.removeEventListener("resize", updateSize);

            delete el.dataset.shokuBounceInitialized;

            el.style.position = prevPos.position;
            el.style.top = prevPos.top;
            el.style.left = prevPos.left;
            el.style.right = prevPos.right;
            el.style.bottom = prevPos.bottom;
            el.style.willChange = prevPos.willChange;

            gsap.set(el, { clearProps: "transform" });
        };
    }

// REVEAL ELEMENT ON SCROLL
function initRevealOnScroll() {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function isDisplayContents(el) {
    return el.classList.contains("u-display-contents") ||
      getComputedStyle(el).display === "contents";
  }

  function findBoxAncestor(el) {
    let parent = el.parentElement;
    while (parent && isDisplayContents(parent)) {
      parent = parent.parentElement;
    }
    return parent || el;
  }

  function getVisualChildren(parent) {
    const result = [];
    for (const child of parent.children) {
      if (isDisplayContents(child)) {
        result.push(...getVisualChildren(child));
      } else {
        result.push(child);
      }
    }
    return result;
  }

  function parseStagger(el, fallback) {
    const raw = el.getAttribute("data-stagger");
    if (raw === null || raw === "") return fallback;
    const val = parseFloat(raw);
    return isNaN(val) ? fallback : val / 1000;
  }

  function readProp(attr, cssVar, styles, fallback) {
    const attrVal = attr?.trim();
    if (attrVal) return attrVal;
    const cssVal = styles.getPropertyValue(cssVar).trim();
    if (cssVal) return cssVal;
    return fallback;
  }

  function areStacked(slots) {
    if (slots.length <= 1) return false;
    const tops = new Set();
    slots.forEach((slot) => {
      const el = slot.type === "item" ? slot.el : slot.parentEl;
      if (el) tops.add(Math.round(el.getBoundingClientRect().top));
    });
    return tops.size > 1;
  }

  const ctx = gsap.context(() => {
    document.querySelectorAll("[data-reveal-group]").forEach((groupEl) => {

      gsap.set(groupEl, { autoAlpha: 1 });

      const groupStaggerSec = parseStagger(groupEl, 0.1);
      const animDuration    = 0.9;
      const animEase        = "power2.out";

      if (prefersReduced) {
        gsap.set(groupEl, { clearProps: "all", y: 0, autoAlpha: 1 });
        return;
      }

      let directChildren = getVisualChildren(groupEl);

      let singleWrapper = null;
      if (
        directChildren.length === 1 &&
        !directChildren[0].hasAttribute("data-reveal-group") &&
        !directChildren[0].hasAttribute("data-reveal-group-nested")
      ) {
        singleWrapper = directChildren[0];
        directChildren = getVisualChildren(singleWrapper);
      }

      const refEl = singleWrapper || groupEl;
      const styles = getComputedStyle(refEl);

      const groupDistance = readProp(
        groupEl.getAttribute("data-distance"),
        "--reveal-distance",
        styles,
        "2em"
      );

      const triggerStart = readProp(
        groupEl.getAttribute("data-start"),
        "--reveal-start",
        styles,
        "top 80%"
      );

      let triggerEl;
      if (singleWrapper) {
        triggerEl = singleWrapper;
      } else if (isDisplayContents(groupEl)) {
        triggerEl = findBoxAncestor(groupEl);
      } else {
        triggerEl = groupEl;
      }

      if (!directChildren.length) {
        const target = singleWrapper || (isDisplayContents(groupEl) ? null : groupEl);
        if (!target) return;
        gsap.set(target, { y: groupDistance, autoAlpha: 0 });
        ScrollTrigger.create({
          trigger: triggerEl,
          start: triggerStart,
          once: true,
          onEnter: () => gsap.to(target, {
            y: 0,
            autoAlpha: 1,
            duration: animDuration,
            ease: animEase,
            onComplete: () => gsap.set(target, { clearProps: "all" }),
          }),
        });
        return;
      }

      const slots = [];
      directChildren.forEach((child) => {
        const nestedGroup = child.matches("[data-reveal-group-nested]")
          ? child
          : child.querySelector(":scope [data-reveal-group-nested]");

        if (nestedGroup) {
          const includeParent = child.getAttribute("data-ignore") === "false";
          slots.push({ type: "nested", parentEl: child, nestedEl: nestedGroup, includeParent });
        } else {
          slots.push({ type: "item", el: child });
        }
      });

      slots.forEach((slot) => {
        if (slot.type === "item") {
          gsap.set(slot.el, { y: groupDistance, autoAlpha: 0 });
        } else {
          if (slot.includeParent) gsap.set(slot.parentEl, { y: groupDistance, autoAlpha: 0 });
          const nestedD = slot.nestedEl.getAttribute("data-distance") || groupDistance;
          Array.from(slot.nestedEl.children).forEach((child) => {
            gsap.set(child, { y: nestedD, autoAlpha: 0 });
          });
        }
      });

      slots.forEach((slot) => {
        if (slot.type === "nested" && slot.includeParent) {
          gsap.set(slot.parentEl, { y: groupDistance, autoAlpha: 0 });
        }
      });

      const stacked = areStacked(slots);

      if (stacked) {
        slots.forEach((slot) => {
          if (slot.type === "item") {
            ScrollTrigger.create({
              trigger: slot.el,
              start: triggerStart,
              once: true,
              onEnter: () => gsap.to(slot.el, {
                y: 0,
                autoAlpha: 1,
                duration: animDuration,
                ease: animEase,
                onComplete: () => gsap.set(slot.el, { clearProps: "all" }),
              }),
            });
          } else {
            const nestedTrigger = slot.parentEl || slot.nestedEl;
            ScrollTrigger.create({
              trigger: nestedTrigger,
              start: triggerStart,
              once: true,
              onEnter: () => {
                const tl = gsap.timeline();
                if (slot.includeParent) {
                  tl.to(slot.parentEl, {
                    y: 0,
                    autoAlpha: 1,
                    duration: animDuration,
                    ease: animEase,
                    onComplete: () => gsap.set(slot.parentEl, { clearProps: "all" }),
                  }, 0);
                }
                const nestedStaggerSec = parseStagger(slot.nestedEl, groupStaggerSec);
                Array.from(slot.nestedEl.children).forEach((nestedChild, nestedIndex) => {
                  tl.to(nestedChild, {
                    y: 0,
                    autoAlpha: 1,
                    duration: animDuration,
                    ease: animEase,
                    onComplete: () => gsap.set(nestedChild, { clearProps: "all" }),
                  }, nestedIndex * nestedStaggerSec);
                });
              },
            });
          }
        });
      } else {
        ScrollTrigger.create({
          trigger: triggerEl,
          start: triggerStart,
          once: true,
          onEnter: () => {
            const tl = gsap.timeline();

            slots.forEach((slot, slotIndex) => {
              const slotTime = slotIndex * groupStaggerSec;

              if (slot.type === "item") {
                tl.to(slot.el, {
                  y: 0,
                  autoAlpha: 1,
                  duration: animDuration,
                  ease: animEase,
                  onComplete: () => gsap.set(slot.el, { clearProps: "all" }),
                }, slotTime);
              } else {
                if (slot.includeParent) {
                  tl.to(slot.parentEl, {
                    y: 0,
                    autoAlpha: 1,
                    duration: animDuration,
                    ease: animEase,
                    onComplete: () => gsap.set(slot.parentEl, { clearProps: "all" }),
                  }, slotTime);
                }

                const nestedStaggerSec = parseStagger(slot.nestedEl, groupStaggerSec);

                Array.from(slot.nestedEl.children).forEach((nestedChild, nestedIndex) => {
                  tl.to(nestedChild, {
                    y: 0,
                    autoAlpha: 1,
                    duration: animDuration,
                    ease: animEase,
                    onComplete: () => gsap.set(nestedChild, { clearProps: "all" }),
                  }, slotTime + nestedIndex * nestedStaggerSec);
                });
              }
            });
          },
        });
      }
    });
  });

  return () => ctx.revert();
}

// HERO VISUAL ENTER
function initHeroVisualEnter(delay = 0, isFirstLoad = false, onComplete) {
  if (reducedMotion) {
    onComplete?.();
    return;
  }

  const isMobile = window.matchMedia("(max-width: 35em)").matches;

  function animateElements(sectionSelector, prefix) {
    const section = nextPage.querySelector(sectionSelector);
    if (!section) return;

    section.querySelectorAll("[data-prevent-flicker]").forEach(el => {
      el.removeAttribute("data-prevent-flicker");
    });

    const wrappers = [];
    [1, 2, 3, 4, 5, 6].forEach(num => {
      const wrapper = section.querySelector(`.${prefix.replace("element", "wrapper")}-${num}`);
      if (!wrapper) return;
      const checkEl = section.querySelector(`.${prefix}-${num}`) || wrapper;
      if (getComputedStyle(checkEl).display === "none") return;
      wrappers.push(wrapper);
    });

    if (!wrappers.length) return;

    const animProps = isMobile
      ? {
          duration: isFirstLoad ? 0.7 : 0.8,
          ease: isFirstLoad ? "back.out(1)" : "back.out(1.4)",
          stagger: { each: isFirstLoad ? 0.03 : 0.08, from: "start" },
        }
      : {
          duration: 1.0,
          ease: "back.out(1.4)",
          stagger: { each: 0.08, from: "start" },
          force3D: true,
        };

    gsap.set(wrappers, { opacity: 0, y: 40, force3D: true });
    gsap.to(wrappers, {
      delay,
      opacity: 1,
      y: 0,
      ...animProps,
      clearProps: "transform,opacity",
      onComplete,
    });
  }

  animateElements(".hero_wrap", "hero_visual_element");
  animateElements("[data-hero]", "hero-home_element");
}

// HERO VISUAL PARALLAX
function initHeroVisualParallax() {
  if (!hasScrollTrigger) return () => {};
  if (reducedMotion) return () => {};

  const speeds = { 1: -12, 2: -14, 3: -6, 4: -5, 5: -12, 6: -20 };

  function applyParallax(sectionSelector, prefix) {
    const section = nextPage.querySelector(sectionSelector);
    if (!section) return;

    const sectionH = section.offsetHeight;

    Object.entries(speeds).forEach(([num, yEnd]) => {
      const el = section.querySelector(`.${prefix}-${num}`);
      if (!el) return;

      const img = el.querySelector("img");
      if (!img) return;

      const yPx = (sectionH * Math.abs(yEnd) / 100) * Math.sign(yEnd);

      gsap.to(img, {
        y: yPx,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "clamp(top top)",
          end: "clamp(bottom top)",
          scrub: true,
        },
      });
    });
  }

  const ctx = gsap.context(() => {
    applyParallax(".hero_wrap", "hero_visual_element");
    applyParallax("[data-hero]", "hero-home_element");
  });

  return () => ctx.revert();
}

// HERO MOUSE PARALLAX
function initHeroMouseParallax() {
  if (reducedMotion) return () => {};

  const sections = [
    nextPage.querySelector(".hero_wrap"),
    nextPage.querySelector("[data-hero]"),
  ].filter(Boolean);

  if (!sections.length) return () => {};

  const speed     = 0.0015;
  const easing    = 0.06;
  const MAX_FORCE = 0.8;

  const lerp = (start, target, amount) => start * (1 - amount) + target * amount;

  const planes = sections.map(section => ({
    section,
    front: Array.from(section.querySelectorAll(
      ".hero_visual_element-1 img, .hero_visual_element-2 img, .hero_visual_element-5 img, .hero_visual_element-6 img," +
      ".hero-home_element-1 img, .hero-home_element-2 img, .hero-home_element-5 img, .hero-home_element-6 img"
    )),
    back: Array.from(section.querySelectorAll(
      ".hero_visual_element-3 img, .hero_visual_element-4 img," +
      ".hero-home_element-3 img, .hero-home_element-4 img"
    )),
  }));

  let xForce = 0;
  let yForce = 0;
  let rafId  = null;

  const animate = () => {
    xForce = lerp(xForce, 0, easing);
    yForce = lerp(yForce, 0, easing);

    planes.forEach(({ front, back }) => {
      front.forEach(img => gsap.set(img, { x: `+=${xForce}`,         y: `+=${yForce}` }));
      back.forEach(img  => gsap.set(img, { x: `+=${xForce * 0.3}`,   y: `+=${yForce * 0.3}` }));
    });

    if (Math.abs(xForce) < 0.01) xForce = 0;
    if (Math.abs(yForce) < 0.01) yForce = 0;

    if (xForce !== 0 || yForce !== 0) {
      rafId = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const onMouseMove = (e) => {
    const { movementX, movementY } = e;
    xForce += movementX * speed;
    yForce += movementY * speed;

    xForce = Math.max(-MAX_FORCE, Math.min(MAX_FORCE, xForce));
    yForce = Math.max(-MAX_FORCE, Math.min(MAX_FORCE, yForce));

    if (rafId === null) rafId = requestAnimationFrame(animate);
  };

  sections.forEach(section => section.addEventListener("mousemove", onMouseMove));

  return () => {
    sections.forEach(section => section.removeEventListener("mousemove", onMouseMove));
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  };
}

// SLIDESHOW
function initSlideshow(scope = document) {
  if (!gsap) return () => {};

  const wraps = Array.from(scope.querySelectorAll('[data-slideshow]'))
    .sort((a, b) => Number(a.dataset.slideshow) - Number(b.dataset.slideshow));

  if (!wraps.length) return () => {};

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const cleanups = [];

  const HOLD = 3.5;

  const visibleWraps = wraps.filter(w => w.offsetParent !== null);
  const count = visibleWraps.length || wraps.length;

  wraps.forEach((wrap) => {
    const slideshowNum = Number(wrap.dataset.slideshow);

    const visibleIndex = visibleWraps.indexOf(wrap);
    const rank = visibleIndex >= 0 ? visibleIndex : (slideshowNum - 1);

    if (wrap.hasAttribute("data-slideshow-initialized")) return;
    wrap.setAttribute("data-slideshow-initialized", "true");

    const frames = Array.from(wrap.querySelectorAll('.u-image-wrapper'));
    if (frames.length < 2) return;

    gsap.set(wrap, { position: "relative" });

    frames.forEach((el, idx) => {
      gsap.set(el, {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        autoAlpha: idx === 0 ? 1 : 0,
        zIndex: idx === 0 ? 2 : 1,
      });
    });

    if (reduceMotion) {
      cleanups.push(() => wrap.removeAttribute("data-slideshow-initialized"));
      return;
    }

    try { wrap.__slideshowTl?.kill?.(); } catch {}
    try { wrap.__slideshowIO?.disconnect?.(); } catch {}

    const tl = gsap.timeline({
      paused: true,
      repeat: -1,
      defaults: { ease: "none" },
    });

    for (let i = 0; i < frames.length; i++) {
      const current = frames[i];
      const next = frames[(i + 1) % frames.length];

      tl.to({}, { duration: HOLD });
      tl.set(current, { autoAlpha: 0, zIndex: 1 });
      tl.set(next,    { autoAlpha: 1, zIndex: 2 });
    }

    const totalCycle = frames.length * HOLD;
    const startOffset = rank * (totalCycle / count);
    tl.seek(startOffset);

    wrap.__slideshowTl = tl;

    const io = new IntersectionObserver((entries) => {
      entries[0].isIntersecting ? tl.play() : tl.pause();
    }, { threshold: 0.1 });

    wrap.__slideshowIO = io;
    io.observe(wrap);

    cleanups.push(() => {
      try { wrap.__slideshowTl?.kill?.(); } catch {}
      try { wrap.__slideshowIO?.disconnect?.(); } catch {}
      wrap.__slideshowTl = null;
      wrap.__slideshowIO = null;
      wrap.removeAttribute("data-slideshow-initialized");
    });
  });

  return () => cleanups.forEach((fn) => { try { fn(); } catch {} });
}