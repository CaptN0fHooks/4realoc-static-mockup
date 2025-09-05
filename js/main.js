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
  const logoVideo = document.getElementById('heroLogoVideo');
  const headline = $$('.hero-headline');

  if (!line || !reveal) return;

  const phrases = ['Real Estate', 'For Real People', 'Real OC'];

  // Timings (ms)
  const holdTime = 1000;   // how long each phrase is visible (1 second)
  const fadeTime = 500;    // should be in sync with CSS keyframes
  const logoDisplayTime = 6000; // how long 3D logo shows (match 1 rotation)

  // Ensure first phrase is set and faded in
  line.textContent = phrases[0];
  line.style.animation = `heroFadeIn ${fadeTime}ms ease forwards`;

  function swapText(next, showContent = false) {
    return new Promise((resolve) => {
      // fade out current
      line.style.animation = `heroFadeOut ${fadeTime}ms ease forwards`;
      setTimeout(() => {
        // change text
        line.textContent = next;
        // fade back in
        line.style.animation = `heroFadeIn ${fadeTime}ms ease forwards`;
        
        // Show subtexts and buttons immediately when "Real OC" appears
        if (showContent && next === 'Real OC') {
          reveal.classList.add('show');
          reveal.classList.add('show-2');
        }
        
        // hold visible for a beat before next swap
        setTimeout(resolve, fadeTime + holdTime);
      }, fadeTime);
    });
  }

  (async function run() {
    // Initial sequence - show subtexts and buttons once
    // Hold first phrase for 1 second
    await sleep(fadeTime + holdTime);
    // Second phrase for 1 second
    await swapText(phrases[1]);
    // Third phrase - show subtexts and buttons immediately when "Real OC" fades in
    await swapText(phrases[2], true);
    
    // Now start the infinite cycle (subtexts and buttons stay visible)
    while (true) {
      // Immediately morph after the standard display duration handled in swapText
      
      // Morph text to 3D logo
      if (headline && logoVideo) {
        // Stop any ongoing text animations and ensure no flash
        line.style.animation = 'none';
        // Force reflow to cancel animation reliably
        void line.offsetWidth;
        // Optionally clear the text while morphing to avoid brief reappearance
        line.textContent = '';
        // Hide headline via class (opacity 0)
        headline.classList.add('morphing');
        // Show the overlayed 3D logo
        logoVideo.style.display = 'block';
        setTimeout(() => logoVideo.classList.add('show'), 100);
      }
      
      // Show 3D logo for 7 seconds
      await sleep(logoDisplayTime);
      
      // Reset text for next cycle (keep subtexts and buttons visible)
      if (headline && logoVideo) {
        // Start hiding the logo, keep headline hidden meanwhile
        logoVideo.classList.remove('show');
        await sleep(600); // wait for logo fade-out CSS transition
        logoVideo.style.display = 'none';
        // Reveal headline again
        headline.classList.remove('morphing');
        // Cleanly show the first phrase using the same swap pipeline
        await swapText(phrases[0]);
      }
      
      // Brief pause, then restart text cycle
      await sleep(500);
      
      // Continue text sequence (first phrase already shown after logo)
      await swapText(phrases[1]);
      await sleep(holdTime);
      await swapText(phrases[2]); // "Real OC" - subtexts and buttons already visible
      await sleep(holdTime); // Hold before morphing to logo
    }
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

  // Build exactly 8 tiles as the base loop, then duplicate once for seamless wrap
  const original = $$$('.card', track);
  const base = [];
  for (let i = 0; i < 8; i++) {
    const src = original[i % original.length];
    base.push(src.cloneNode(true));
  }
  track.innerHTML = '';
  base.forEach(n => track.appendChild(n));
  base.forEach(n => track.appendChild(n.cloneNode(true)));

  function getItemWidth() {
    const first = $$('.card', track);
    if (!first) return 324;
    const style = window.getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || '24');
    return first.getBoundingClientRect().width + (isNaN(gap) ? 24 : gap);
  }

  let itemWidth = getItemWidth();
  let loopWidth = itemWidth * 8; // one full set of 8
  track.scrollLeft = 0;

  const RIGHT_ZONE = 0.82;
  const LEFT_ZONE = 0.18;
  let direction = 0; // 1 right, -1 left, 0 pause
  let rafId = null;
  let lastTs = 0;
  const SPEED = 260; // px/s

  function step(ts) {
    if (!direction) { lastTs = 0; rafId = null; return; }
    if (!lastTs) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;
    let x = track.scrollLeft + direction * SPEED * dt;
    if (x >= loopWidth) x -= loopWidth;
    if (x < 0) x += loopWidth;
    track.scrollLeft = x;
    rafId = requestAnimationFrame(step);
  }

  function ensureRAF() {
    if (rafId == null && direction) rafId = requestAnimationFrame(step);
  }

  carousel.addEventListener('mousemove', (e) => {
    const rect = carousel.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    direction = rel > RIGHT_ZONE ? 1 : rel < LEFT_ZONE ? -1 : 0;
    ensureRAF();
  });
  carousel.addEventListener('mouseleave', () => { direction = 0; });

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

  // Resize recalculations: maintain relative position in the middle block
  window.addEventListener('resize', () => {
    const rel = (track.scrollLeft - middleStart) % blockWidth;
    itemWidth = getItemWidth();
    blockWidth = realCount * itemWidth;
    middleStart = blockWidth;
    track.scrollLeft = middleStart + (isNaN(rel) ? 0 : (rel < 0 ? rel + blockWidth : rel));
  });
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
