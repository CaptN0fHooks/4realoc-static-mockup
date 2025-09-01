/* ==========================================================================
   4 Real OC — Main JS
   ========================================================================== */

/* --------------------------------------
   Utilities
-------------------------------------- */
const $$ = (sel, root = document) => root.querySelector(sel);
const $$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* --------------------------------------
   Header: hide on scroll, reveal at top
-------------------------------------- */
(function headerControls() {
  const header =
    document.getElementById('siteHeader') || $$('.site-header'); // supports either id or class
  const revealZone = $$('.top-reveal-zone');
  if (!header) return;

  let lastY = window.scrollY;

  function onScroll() {
    const y = window.scrollY;

    // Background style when scrolled
    if (y > 8) header.classList.add('scrolled');
    else header.classList.remove('scrolled');

    // Hide when scrolling down past 40px, show when scrolling up
    if (y > 40 && y > lastY) {
      header.classList.add('hidden');
    } else if (y < lastY) {
      header.classList.remove('hidden');
    }

    lastY = y;
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Hover at the very top reveals the header
  if (revealZone) {
    revealZone.addEventListener('mouseenter', () =>
      header.classList.remove('hidden')
    );
  }
})();

/* --------------------------------------
   Footer year
-------------------------------------- */
(function footerYear() {
  const yEl = document.getElementById('year');
  if (yEl) yEl.textContent = new Date().getFullYear();
})();

/* --------------------------------------
   Hero text sequence + staged reveals
   Sequence: "Real Estate" -> "For Real People" -> "Real OC"
   Then Stage 1: show "By Michael R Jacquez"
        Stage 2: show "Representing Orange County" + buttons
-------------------------------------- */
(function heroSequence() {
  // Support either #heroLine (recommended) or #heroText (legacy)
  const line =
    document.getElementById('heroLine') ||
    document.getElementById('heroText');
  const reveal = $$('.hero-reveal');

  if (!line || !reveal) return;

  const phrases = ['Real Estate', 'For Real People', 'Real OC'];

  // Timings (ms)
  const holdTime = 1100;   // how long each phrase is visible
  const fadeTime = 380;    // should be in sync with CSS keyframes
  const bylineDelay = 200; // wait after landing on "Real OC" before byline
  const taglineDelay = 700; // wait after byline before tagline + buttons

  // Ensure first phrase is set and faded in
  line.textContent = phrases[0];
  line.style.animation = `heroFadeIn ${fadeTime}ms ease forwards`;

  function swapText(next) {
    return new Promise((resolve) => {
      // fade out current
      line.style.animation = `heroFadeOut ${fadeTime}ms ease forwards`;
      setTimeout(() => {
        // change text
        line.textContent = next;
        // fade back in
        line.style.animation = `heroFadeIn ${fadeTime}ms ease forwards`;
        // hold visible for a beat before next swap
        setTimeout(resolve, fadeTime + holdTime);
      }, fadeTime);
    });
  }

  (async function run() {
    // Hold first phrase
    await sleep(fadeTime + holdTime);
    // Second
    await swapText(phrases[1]);
    // Third (landing)
    await swapText(phrases[2]);

    // Stage 1: show byline
    await sleep(bylineDelay);
    reveal.classList.add('show');

    // Stage 2: show tagline + buttons
    await sleep(taglineDelay);
    reveal.classList.add('show-2');
  })();
})();

/* --------------------------------------
   Premium Featured Carousel (infinite)
   - Clones first few cards for seamless loop
   - Auto-scroll
   - Edge-hover navigation
-------------------------------------- */
(function featuredCarousel() {
  const track = document.getElementById('featTrack');
  const carousel = document.getElementById('featCarousel');
  if (!track || !carousel) return;

  const prev = document.getElementById('featPrev');
  const next = document.getElementById('featNext');

  const items = $$$('.card', track);
  if (items.length) {
    const cloneCount = Math.min(4, items.length);
    for (let i = 0; i < cloneCount; i++) {
      track.appendChild(items[i].cloneNode(true));
    }
  }

  let currentIndex = 0;

  // Compute a dynamic width: card width + gap
  function getItemWidth() {
    // Use first real card to measure
    const first = $$('.card', track);
    if (!first) return 324; // default
    const style = window.getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || '24');
    return first.getBoundingClientRect().width + (isNaN(gap) ? 24 : gap);
  }

  function scrollToIndex(index, smooth = true) {
    const scrollPosition = index * getItemWidth();
    track.scrollTo({
      left: scrollPosition,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }

  function nextSlide() {
    currentIndex++;
    scrollToIndex(currentIndex);
    // If we've reached the cloned items, jump back to start of real items
    if (currentIndex >= items.length) {
      setTimeout(() => {
        currentIndex = 0;
        scrollToIndex(currentIndex, false);
      }, 500);
    }
  }

  function prevSlide() {
    currentIndex--;
    if (currentIndex < 0) {
      // Jump to last real item without animation, then step back smoothly
      currentIndex = items.length - 1;
      scrollToIndex(currentIndex, false);
      setTimeout(() => {
        currentIndex--;
        if (currentIndex < 0) currentIndex = 0;
        scrollToIndex(currentIndex);
      }, 50);
    } else {
      scrollToIndex(currentIndex);
    }
  }

  next && next.addEventListener('click', nextSlide);
  prev && prev.addEventListener('click', prevSlide);

  // Edge-hover navigation (throttled)
  let hoverCooldown = false;
  const HOVER_COOLDOWN_MS = 450;

  carousel.addEventListener('mousemove', (e) => {
    if (hoverCooldown) return;
    const rect = carousel.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;

    if (rel > 0.8) {
      nextSlide();
      hoverCooldown = true;
      setTimeout(() => (hoverCooldown = false), HOVER_COOLDOWN_MS);
    } else if (rel < 0.2) {
      prevSlide();
      hoverCooldown = true;
      setTimeout(() => (hoverCooldown = false), HOVER_COOLDOWN_MS);
    }
  });

  // Auto-scroll
  let autoScrollInterval;
  function startAutoScroll() {
    stopAutoScroll();
    autoScrollInterval = setInterval(nextSlide, 5000);
  }
  function stopAutoScroll() {
    if (autoScrollInterval) clearInterval(autoScrollInterval);
  }

  startAutoScroll();
  carousel.addEventListener('mouseenter', stopAutoScroll);
  carousel.addEventListener('mouseleave', startAutoScroll);

  // Image quality guard / fallback
  $$$('img', track).forEach((img) => {
    const finalize = () => img.classList.add('loaded');
    if (img.complete) {
      finalize();
    } else {
      img.addEventListener('load', finalize, { once: true });
      img.addEventListener(
        'error',
        () => {
          img.style.display = 'none';
          const fallback = document.createElement('div');
          fallback.style.cssText = `
            width: 100%; height: 100%;
            background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
            display: grid; place-items: center; color: white; font-weight: 600;
          `;
          fallback.textContent = 'Property Image';
          img.parentNode && img.parentNode.appendChild(fallback);
        },
        { once: true }
      );
    }
  });

  // Resize recalculations
  window.addEventListener('resize', () => scrollToIndex(currentIndex, false));
})();

/* --------------------------------------
   Mini search: redirect to search.html with params
-------------------------------------- */
(function miniSearchRedirect() {
  const form = document.getElementById('miniSearch');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const params = new URLSearchParams(new FormData(form)).toString();
    window.location.href = 'search.html?' + params;
  });
})();

/* --------------------------------------
   Full search: prefill from URL + mock results
-------------------------------------- */
(function fullSearchMock() {
  const form = document.getElementById('fullSearch');
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  for (const [k, v] of params.entries()) {
    const field = form.elements.namedItem(k);
    if (field && 'value' in field) field.value = v;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // In production, call IDX here.
    const results = document.getElementById('results');
    if (!results) return;

    results.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const card = document.createElement('div');
      card.className = 'glass';
      card.style.padding = '12px';
      card.innerHTML = `<strong>Result ${i + 1}</strong><br/><small>Updated based on your filters.</small>`;
      results.appendChild(card);
    }
  });
})();
