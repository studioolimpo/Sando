/*
core.js, Studio Olimpo Blueprint
LITE VERSION - COMING SOON / ONE PAGER
*/

(function () {
    "use strict";

    /* =========================
    CONFIG
    ========================= */
    const CONFIG = {
        debug: false,

        // Lenis manager
        lenis: {
            enabled: true,
            lerp: 0.075,
            wheelMultiplier: 1,
            touchMultiplier: 1.2,
            syncTouch: true,
            syncTouchLerp: 0.075,
            touchInertiaMultiplier: 35,
            normalizeWheel: true,
            useGsapTicker: true,
        },

        // Loader manager
        loader: {
            minDuration: 100,
            fadeInDuration: 2.0,
            fadeOutDuration: 1.2,
            ease: "power2.inOut",
        },

        // Transition manager (SLIDE VERTICALE)
        transition: {
            // Overlay timing
            overlayFadeIn: 0.8,
            overlayFadeOut: 0.3,

            // Container slide
            enterFromY: "100vh",
            leaveToY: "-30vh",
            slideDuration: 1.0,

            // Easing
            leaveEase: "power2.out",
            enterEase: "power3.out",

            // overlap timing
            slideStartDelay: 0.1,
            heroDelay: 0.7,
        },

        overlap: {
            loaderToHero: -0.3,
            transitionToHero: 0.2,
        },
    };

    /* =========================
    HERO REGISTRY
    ========================= */
    const HERO_REGISTRY = {
        home: {
            mediaFirst: false, // Custom logic handled in animateHero
            description: "Coming Soon Home",
        },
    };

    /* =========================
    DEPENDENCIES
    ========================= */
    const { gsap, barba, ScrollTrigger } = window;
    const Lenis = window.Lenis; // optional

    // If critical deps are missing, avoid leaving the page stuck in the loader state.
    function unlockIfBlocked(reason) {
        console.warn(reason);
        try { document.documentElement.classList.remove("is-loading"); } catch (_) { }
        try { document.body.style.overflow = ""; } catch (_) { }
    }

    if (!gsap) {
        unlockIfBlocked("[CORE] GSAP mancante");
        return;
    }

    if (!barba) {
        unlockIfBlocked("[CORE] Barba mancante");
        return;
    }

    if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    const log = (...args) => CONFIG.debug && console.log("[CORE]", ...args);

    // Quick sanity check in console when debugging startup
    log("Boot", { hasGSAP: !!window.gsap, hasBarba: !!window.barba, hasLenis: !!window.Lenis });

    /* =========================
    GLOBAL SAFETY
    ========================= */
    function bindGlobalSafetyOnce() {
        if (window.__coreSafetyBound) return;
        window.__coreSafetyBound = true;

        window.addEventListener("unhandledrejection", (e) => {
            console.warn("[CORE] Unhandled promise rejection:", e.reason);
        });
    }
    bindGlobalSafetyOnce();

    /* =========================
    UTILITIES
    ========================= */
    function getNamespace(container) {
        return container?.getAttribute("data-barba-namespace") || "default";
    }

    function getRoot(scope) {
        return scope && typeof scope.querySelectorAll === "function" ? scope : document;
    }

    function reinitWebflowForms() {
        const wf = window.Webflow;
        if (!wf) return;
        try {
            if (typeof wf.require === "function") {
                const forms = wf.require("forms");
                if (forms && typeof forms.ready === "function") forms.ready();
            }
        } catch (_) { }
        try {
            if (typeof wf.ready === "function") wf.ready();
        } catch (_) { }
    }

    function scrollLock() {
        document.body.style.overflow = "hidden";
    }

    function scrollUnlock() {
        document.body.style.overflow = "";
    }

    function hardScrollTop() {
        if (history.scrollRestoration) {
            history.scrollRestoration = "manual";
        }
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    }

    function getRealElement(el) {
        const slotChild = el.querySelector(".u-background-slot > *");
        return slotChild || el;
    }

    function getAnimatableChildren(parent) {
        // Simple heuristic: layout columns, or direct children that look like content
        const cols = parent.querySelectorAll(".u-layout-column");
        if (cols.length) return Array.from(cols);
        return Array.from(parent.children);
    }

    function preparePage(container) {
        // Ensure container is visible for entrance
        gsap.set(container, { autoAlpha: 1, y: 0, clearProps: "all" });
    }

    /* =========================
    LENIS SCROLL
    ========================= */
    let lenis;

    function initLenis() {
        if (!CONFIG.lenis.enabled || !Lenis) return;

        lenis = new Lenis({
            lerp: CONFIG.lenis.lerp,
            wheelMultiplier: CONFIG.lenis.wheelMultiplier,
            touchMultiplier: CONFIG.lenis.touchMultiplier,
            wrapper: window,
            content: document.body,
            syncTouch: CONFIG.lenis.syncTouch,
            syncTouchLerp: CONFIG.lenis.syncTouchLerp,
            touchInertiaMultiplier: CONFIG.lenis.touchInertiaMultiplier,
            normalizeWheel: CONFIG.lenis.normalizeWheel,
        });

        if (CONFIG.lenis.useGsapTicker) {
            gsap.ticker.add((time) => {
                lenis.raf(time * 1000);
            });
            gsap.ticker.lagSmoothing(0);
        } else {
            function raf(time) {
                lenis.raf(time);
                requestAnimationFrame(raf);
            }
            requestAnimationFrame(raf);
        }

        // Connect ScrollTrigger
        if (ScrollTrigger) {
            lenis.on("scroll", ScrollTrigger.update);
        }
    }

    function resetLenis() {
        if (lenis) {
            lenis.scrollTo(0, { immediate: true });
        }
    }

    /* =========================
    SHOKU BOUNCE (Infinite + mouse collision)
    - Per-container (Barba-safe)
    - Physics loop via gsap.ticker (no InertiaPlugin required)
    ========================= */
    function initShokuBounce(scope = document) {
        if (!gsap) {
            log("[SHOKU] GSAP mancante, skip");
            return () => { };
        }

        const root = getRoot(scope);
        const el = document.querySelector(".shoku_wrap");
        if (!el) return () => { };

        // Guard per re-init on same container
        if (el.dataset.shokuBounceInitialized === "true") return () => { };
        el.dataset.shokuBounceInitialized = "true";

        // ----- Config -----
        const cfg = {
            // speed is in px/sec
            speedMin: 200,
            speedMax: 320,

            // friction per second (0..1). Lower = more inertia.
            friction: 0.01,

            // wall bounce energy retention (0..1)
            restitution: 0.98,

            // cursor collision
            cursorRadius: 28, // px
            repelStrength: 420, // impulse px/sec added on hit

            // soft clamp to avoid crazy spikes
            maxSpeed: 650,
        };

        // Ensure the element can move freely across viewport
        // (we drive it via transforms for perf)
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

        // Use quickSetters
        const setX = gsap.quickSetter(el, "x", "px");
        const setY = gsap.quickSetter(el, "y", "px");

        // Internal state
        let rafActive = true;
        let lastTime = performance.now();

        let boundsW = window.innerWidth;
        let boundsH = window.innerHeight;

        // Size (update on resize)
        let rect = el.getBoundingClientRect();
        let w = rect.width || 0;
        let h = rect.height || 0;

        // Start position (keep inside viewport)
        let x = Math.max(0, Math.min(boundsW - w, (boundsW - w) * 0.25));
        let y = Math.max(0, Math.min(boundsH - h, (boundsH - h) * 0.35));

        // Random initial velocity
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

            // Read size AFTER potential layout changes
            rect = el.getBoundingClientRect();
            w = rect.width || 0;
            h = rect.height || 0;

            // If element is larger than viewport, clamp bounds to 0 to avoid negative maxX/maxY
            const maxX = Math.max(0, boundsW - w);
            const maxY = Math.max(0, boundsH - h);

            // keep inside after resize
            x = Math.max(0, Math.min(maxX, x));
            y = Math.max(0, Math.min(maxY, y));
        }

        window.addEventListener("resize", updateSize, { passive: true });

        /* -------------------------
           DRAG (mouse + touch via Pointer Events)
           - Click/tap & drag to hold the element
           - Release to "throw" it, bounce continues infinitely
        ------------------------- */
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        // Track recent pointer movement to compute throw velocity
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

        // Grab feedback (shrink by ~0.5rem visually)
        const GRAB_SHRINK_PX = 8; // 0.5rem @ 16px root
        let grabTween = null;

        function getGrabScale() {
            // ensure w/h are fresh
            updateSize();
            if (!w || !h) return 0.94;
            const sx = (w - GRAB_SHRINK_PX) / w;
            const sy = (h - GRAB_SHRINK_PX) / h;
            // keep aspect by using uniform scale
            const s = Math.min(sx, sy);
            return Math.max(0.7, Math.min(0.98, s));
        }

        // Make it draggable-friendly
        el.style.cursor = "grab";
        el.style.touchAction = "none"; // prevent page scroll while dragging on mobile
        el.style.userSelect = "none";
        el.style.webkitUserSelect = "none";

        function clampToBounds() {
            const maxX = Math.max(0, boundsW - w);
            const maxY = Math.max(0, boundsH - h);
            x = Math.max(0, Math.min(maxX, x));
            y = Math.max(0, Math.min(maxY, y));
        }

        function onPointerDown(e) {
            // only primary button for mouse, but allow touch/pen
            if (e.pointerType === "mouse" && e.button !== 0) return;

            isDragging = true;
            el.style.cursor = "grabbing";

            // Visual feedback: shrink a bit while grabbed
            grabTween?.kill();
            grabTween = gsap.to(el, {
                scale: getGrabScale(),
                duration: 0.28,
                ease: "power2.out",
                overwrite: true,
            });

            // stop physics integration while dragging (we still render via quickSetter)
            // keep velocities, we will overwrite them on release (throw)

            // Capture pointer so we keep receiving move/up even if pointer leaves the element
            try { el.setPointerCapture(e.pointerId); } catch (_) { }

            // Compute drag offset: pointer position relative to element top-left
            dragOffsetX = e.clientX - x;
            dragOffsetY = e.clientY - y;

            // Initialize throw tracking
            lastPtrX = e.clientX;
            lastPtrY = e.clientY;
            lastPtrT = performance.now();
            throwVX = 0;
            throwVY = 0;

            // Avoid text selection / click-through
            e.preventDefault();
        }

        function onPointerMove(e) {
            if (!isDragging) return;

            // Position follows pointer (minus offset)
            x = e.clientX - dragOffsetX;
            y = e.clientY - dragOffsetY;
            clampToBounds();

            // Render immediately
            setX(x);
            setY(y);

            // Compute instantaneous velocity for throw
            const now = performance.now();
            const dt = Math.max(0.001, (now - lastPtrT) / 1000);
            const dx = e.clientX - lastPtrX;
            const dy = e.clientY - lastPtrY;

            // Low-pass filter for smoother throw
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

            // Restore size smoothly
            grabTween?.kill();
            grabTween = gsap.to(el, {
                scale: 1,
                duration: 0.38,
                ease: "power2.out",
                overwrite: true,
            });

            // Release capture
            try { el.releasePointerCapture(e.pointerId); } catch (_) { }

            // Apply "throw" velocity and resume physics
            vx = throwVX;
            vy = throwVY;

            // Clamp max speed (reuse cfg)
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

        // Small helper
        function clamp(val, min, max) {
            return Math.max(min, Math.min(max, val));
        }

        // Physics loop: runs forever until cleanup
        function tick() {
            if (!rafActive) return;

            try {
                const now = performance.now();
                // dt in seconds, clamped to avoid jumps when tab was inactive
                const dt = clamp((now - lastTime) / 1000, 0, 0.05);
                lastTime = now;

                // Integrate
                if (isDragging) {
                    // While dragging, we don't integrate physics here.
                    // Position is driven by pointermove; we only keep time in sync.
                    setX(x);
                    setY(y);
                    return;
                }
                x += vx * dt;
                y += vy * dt;

                // Wall collisions (reflect)
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

                // Inertia / damping (very light, so motion feels persistent)
                // Apply per-second friction
                const fr = Math.pow(1 - cfg.friction, dt);
                vx *= fr;
                vy *= fr;

                // Keep speed from dying: if it gets too slow, gently re-energize
                const sp = Math.hypot(vx, vy);
                if (sp < 140) {
                    const boost = (140 - sp) * 0.4;
                    const a = Math.atan2(vy, vx);
                    vx += Math.cos(a) * boost;
                    vy += Math.sin(a) * boost;
                }

                // Clamp absolute max speed
                const sp2 = Math.hypot(vx, vy);
                if (sp2 > cfg.maxSpeed) {
                    const k = cfg.maxSpeed / sp2;
                    vx *= k;
                    vy *= k;
                }

                // Render
                setX(x);
                setY(y);
            } catch (err) {
                console.warn("[SHOKU] Tick error, stop bounce:", err);
                rafActive = false;
                gsap.ticker.remove(tick);
            }
        }

        // Make sure we have fresh dimensions after forcing position:fixed
        updateSize();

        gsap.ticker.add(tick);

        // Initialize render immediately
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

            // Restore drag-related inline styles
            el.style.cursor = prevDragStyle.cursor;
            el.style.touchAction = prevDragStyle.touchAction;
            el.style.userSelect = prevDragStyle.userSelect;
            el.style.webkitUserSelect = prevDragStyle.webkitUserSelect;

            window.removeEventListener("resize", updateSize);

            delete el.dataset.shokuBounceInitialized;

            // Restore inline styles as much as possible
            el.style.position = prevPos.position;
            el.style.top = prevPos.top;
            el.style.left = prevPos.left;
            el.style.right = prevPos.right;
            el.style.bottom = prevPos.bottom;
            el.style.willChange = prevPos.willChange;

            // Clear transforms we set
            gsap.set(el, { clearProps: "transform" });
        };
    }

    /* =========================
    VARIABLE TEXT (Random Sando Quotes)
    ========================= */
    const VARIABLE_TEXT_QUOTES = [
        "More than a Japanese sando.",
        "Solo sorrisi e katsusando.",
        "Life is better with Sando.",
        "Taste it while it’s hooooot."
    ];

    // Store index to prevent consecutive repetitions
    let lastQuoteIndex = -1;

    function initVariableText(scope = document) {
        const root = getRoot(scope);
        const elements = root.querySelectorAll(".variable-text");

        if (elements.length === 0) return;

        let newIndex;
        // Keep picking until different, unless list is too short
        do {
            newIndex = Math.floor(Math.random() * VARIABLE_TEXT_QUOTES.length);
        } while (VARIABLE_TEXT_QUOTES.length > 1 && newIndex === lastQuoteIndex);

        lastQuoteIndex = newIndex;
        const randomQuote = VARIABLE_TEXT_QUOTES[newIndex];

        elements.forEach(el => {
            el.textContent = randomQuote;
        });
    }


    /* =========================
    DYNAMIC YEAR
    ========================= */
    function initDynamicYear(scope = document) {
        const root = getRoot(scope);
        const els = root.querySelectorAll("[data-year]");
        const y = new Date().getFullYear();
        els.forEach((el) => (el.textContent = y));
    }

    /* =========================
    HERO ANIMATION (Custom Home)
    ========================= */
    function getHeroConfig(namespace) {
        return HERO_REGISTRY[namespace] || {};
    }

function animateHero(container) {
  const namespace = getNamespace(container);

  const tl = gsap.timeline({
    defaults: { ease: "expo.out" },
    onStart: () => log(`Hero START: ${namespace}`),
    onComplete: () => log(`Hero COMPLETE: ${namespace}`),
  });

  const q = (sel) => container.querySelectorAll(sel);
  const getContentEls = (attr) => {
    const wrapper = q(`[data-hero-content="${attr}"] .u-content-wrapper > *`);
    return wrapper.length ? wrapper : q(`[data-hero-content="${attr}"] > *`);
  };

  // Improved reveal: allows closedClip/openClip overrides per section
  const reveal = (els, props = {}) => {
    if (!els || !els.length) return null;

    const closedClip = props.closedClip ?? "inset(0 0 120% 0)";
    const openClip = props.openClip ?? "inset(-25% 0 -25% 0)";

    gsap.set(els, {
      willChange: "clip-path, transform",
      force3D: true,
      y: "110%",
      clipPath: closedClip,
      ...props.from,
    });

    return {
      to: {
        delay: 0.4,
        y: "0%",
        clipPath: openClip,        // IMPORTANT: open state has bleed
        duration: 1.0,
        stagger: 0.15,
        ...props.to,
        onComplete: () => gsap.set(els, { willChange: "auto" }),
      },
      position: props.position ?? undefined,
    };
  };

  const sections = [
    {
      els: getContentEls("top"),
      to: { duration: 1.0, stagger: 0.15 },
    },
    {
      els: q("#logo-sando path"),
      to: { duration: 1.6, stagger: 0.04, ease: "expo.out" },
      position: "<0.3",
    },
    {
      els: q("#logo-japan > svg"),
      to: { duration: 1.6, stagger: 0.04, ease: "expo.out" },
      from: { y: "120%" },
      position: "<0.05",
    },

    // ✅ COMING SOON: clip-path tuned to NOT cut descenders (g, p, q, y...)
    {
      els: q("#coming-soon"),
      // keep it closed “deep” so it starts hidden cleanly
      closedClip: "inset(0 0 140% 0)",
      // open with strong bleed, especially on the bottom
      openClip: "inset(-30% 0 -45% 0)",
      to: { duration: 1.2, stagger: 0, ease: "power3.out" },
      position: "<0.1",
    },

    {
      els: q('[data-hero-content="paragraph"] .u-content-wrapper > *'),
      // for these you can keep a lighter bleed if you want
      openClip: "inset(-20% 0 -25% 0)",
      to: { duration: 1.2, stagger: 0.15, ease: "power4.out" },
      position: "<0.2",
    },
  ];

  sections.forEach(({ els, to, from, position, closedClip, openClip }) => {
    const r = reveal(els, { to, from, position, closedClip, openClip });
    if (r) tl.to(els, r.to, r.position);
  });

  // === SHOKU ENTRANCE ===
  const shokuEl = document.querySelector(".shoku_wrap");
  if (shokuEl) {
    gsap.set(shokuEl, {
      autoAlpha: 0,
      scale: 0,
      rotation: -12,
      force3D: true,
      willChange: "transform, opacity",
    });

    tl.to(shokuEl, {
      autoAlpha: 1,
      scale: 1,
      rotation: 0,
      duration: 1.0,
      ease: "back.out(1.7)",
      onComplete: () => gsap.set(shokuEl, { willChange: "transform" }),
    }, "-=0.8");
  }

  tl.addLabel("hero:done");
  return tl;
}

    // Simplified reveal dispatcher
    function createRevealSequence(container) {
        const master = gsap.timeline();
        const heroTL = animateHero(container);
        master.add(heroTL, 0);

        // Return minimal control object
        return {
            timeline: master,
            cleanup: () => {
                master.kill();
                try { heroTL?.__cleanup?.(); } catch (_) { }
            },
        };
    }

    /* =========================
       LOADER
    ========================= */
    let loaderDone = false;

    async function runLoader(onHeroStart) {
        if (loaderDone) {
            onHeroStart?.();
            return;
        }
        loaderDone = true;

        const loader = document.querySelector(".loader_wrap");
        if (!loader) {
            document.documentElement.classList.remove("is-loading");
            onHeroStart?.();
            return;
        }

        const svgs = loader.querySelectorAll(".u-svg");
        const paths = loader.querySelectorAll(".u-svg path");
        const contain = loader.querySelector(".loader_contain");

        scrollLock();

        gsap.set(loader, { autoAlpha: 1, display: "flex" });
        if (contain) gsap.set(contain, { visibility: "visible", opacity: 1 });
        if (svgs.length) gsap.set(svgs, { y: 20, force3D: true });
        if (paths.length) gsap.set(paths, { autoAlpha: 0 });

        const start = performance.now();

        // === ENTRANCE ===
        const tlIn = gsap.timeline({ defaults: { ease: "power3.out" } });

        if (paths.length) {
            tlIn.to(paths, {
                autoAlpha: 1,
                duration: 0.9,
                stagger: { each: 0.03, from: "start" },
                ease: "power2.inOut",
            }, 0.4);
        }

        if (svgs.length) {
            tlIn.to(svgs, {
                y: 0,
                duration: 1.0,
                stagger: 0.05,
                ease: "power2.out",
            }, 0.45);
        }

        await tlIn;

        const elapsed = performance.now() - start;
        const wait = CONFIG.loader.minDuration - elapsed;
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));

        // === EXIT ===
        const tlOut = gsap.timeline({ defaults: { ease: "power2.inOut" } });

        if (svgs.length) {
            tlOut.to(svgs, {
                opacity: 0,
                y: -20,
                duration: CONFIG.loader.fadeOutDuration,
                stagger: 0.04,
            }, 0);
        }

        if (paths.length) {
            tlOut.to(paths, {
                autoAlpha: 0,
                duration: CONFIG.loader.fadeOutDuration * 0.8,
            }, 0);
        }

        tlOut.to(loader, { autoAlpha: 0, duration: CONFIG.loader.fadeOutDuration }, 0.15);

        const heroAt = Math.max(0, CONFIG.loader.fadeOutDuration + CONFIG.overlap.loaderToHero);
        tlOut.call(() => onHeroStart?.(), null, heroAt);

        await tlOut;

        gsap.set(loader, { display: "none" });
        if (svgs.length) gsap.set(svgs, { clearProps: "all" });
        if (contain) gsap.set(contain, { clearProps: "all" });
        document.documentElement.classList.remove("is-loading");
        scrollUnlock();
    }

    /* =========================
       BARBA NAV UPDATE
    ========================= */
    function initBarbaNavUpdate(data) {
        if (!data?.next?.html) return;
        const $ = window.jQuery || window.$;
        if (!$) return;

        const $next = $(data.next.html).find('[data-barba-update="nav"]');
        if (!$next.length) return;

        $('[data-barba-update="nav"]').each(function (index) {
            const $source = $($next[index]);
            if (!$source.length) return;

            const ariaCurrent = $source.attr("aria-current");
            if (ariaCurrent !== undefined) $(this).attr("aria-current", ariaCurrent);
            else $(this).removeAttr("aria-current");

            const className = $source.attr("class");
            if (className !== undefined) $(this).attr("class", className);
        });
    }

    /* =========================
    TRANSITIONS, slide sync
    ========================= */
    function transitionLeave(data) {
        log("Leave: overlay fade in + prepare slide");
        scrollLock();

        const current = data?.current?.container;
        const overlay = current?.querySelector(".transition_wrap");

        const tl = gsap.timeline({
            defaults: { ease: CONFIG.transition.leaveEase },
        });

        // 1. Overlay fadeIn (if exists) -> Not strictly needed for simple slide but kept for polish
        if (overlay) {
            tl.to(overlay, {
                autoAlpha: 1,
                duration: CONFIG.transition.overlayFadeIn,
            }, 0);
        }

        // 2. Current container slide UP
        if (current) {
            tl.to(current, {
                y: CONFIG.transition.leaveToY,
                autoAlpha: 0,
                duration: CONFIG.transition.slideDuration,
            }, CONFIG.transition.slideStartDelay);
        }

        return tl;
    }

    function transitionEnter(data, onHeroStart) {
        log("Enter: slide up + overlay fade out");
        const next = data?.next?.container;

        // Ensure correct init position
        gsap.set(next, {
            y: CONFIG.transition.enterFromY,
            autoAlpha: 1,
            zIndex: 10,
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
        });

        const tl = gsap.timeline({
            onComplete: () => {
                gsap.set(next, {
                    clearProps: "position,top,left,width,height,zIndex,transform"
                });
                scrollUnlock();
                resetLenis();
            },
        });

        // Slide IN
        tl.to(next, {
            y: "0%",
            duration: CONFIG.transition.slideDuration,
            ease: CONFIG.transition.enterEase,
        }, 0);

        // Hero Start Trigger
        const heroAt = CONFIG.transition.heroDelay || 0.6;
        tl.call(() => onHeroStart?.(), null, heroAt);

        return tl;
    }

    /* =========================
    BARBA INIT
    ========================= */
    let currentReveal = null;
    let currentShokuCleanup = null;

    // Init global once
    initLenis();

    barba.init({
        preventRunning: true,
        debug: CONFIG.debug,

        transitions: [
            {
                name: "olimpo-slide",
                sync: true,

                async once(data) {
                    const namespace = getNamespace(data.next.container);
                    log(`=== ONCE: ${namespace} ===`);

                    hardScrollTop();
                    preparePage(data.next.container);
                    reinitWebflowForms();
                    initDynamicYear(data.next.container);
                    initVariableText(data.next.container);
                    currentShokuCleanup?.();
                    currentShokuCleanup = initShokuBounce(data.next.container);

                    await runLoader(() => {
                        currentReveal = createRevealSequence(data.next.container);
                    });

                    if (ScrollTrigger) requestAnimationFrame(() => ScrollTrigger.refresh(true));
                },

                leave(data) {
                    const namespace = getNamespace(data.current.container);
                    log(`=== LEAVE: ${namespace} ===`);

                    currentReveal?.cleanup();
                    currentReveal = null;
                    currentShokuCleanup?.();
                    currentShokuCleanup = null;

                    return transitionLeave(data);
                },

                enter(data) {
                    const namespace = getNamespace(data.next.container);
                    log(`=== ENTER: ${namespace} ===`);

                    initBarbaNavUpdate(data);
                    reinitWebflowForms();
                    initDynamicYear(data.next.container);
                    initVariableText(data.next.container);
                    currentShokuCleanup?.();
                    currentShokuCleanup = initShokuBounce(data.next.container);

                    return transitionEnter(data, () => {
                        currentReveal = createRevealSequence(data.next.container);
                    });
                },
            },
        ],
    });

})();