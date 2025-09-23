/* ==========================================================================
   Real OC — Main JS
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
  let hideTimeout = null;

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

  function hideHeader() {
    // Only hide if we're scrolled down past 40px
    if (window.scrollY > 40) {
      header.classList.add('hidden');
    }
  }

  function showHeader() {
    // Clear any pending hide timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    header.classList.remove('hidden');
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Hover at the very top reveals the header
  if (revealZone) {
    revealZone.addEventListener('mouseenter', showHeader);
    
    // When mouse leaves the reveal zone, hide header after 1 second
    revealZone.addEventListener('mouseleave', () => {
      hideTimeout = setTimeout(hideHeader, 1000);
    });
  }

  // Also hide header when mouse leaves the header itself
  header.addEventListener('mouseleave', () => {
    hideTimeout = setTimeout(hideHeader, 1000);
  });

  // Show header when mouse enters the header
  header.addEventListener('mouseenter', showHeader);
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
   Featured tiles → search.html?mls=...
-------------------------------------- */
(function linkFeaturedTilesToSearch(){
  document.addEventListener('DOMContentLoaded', function(){
    const cards = document.querySelectorAll('#featured .card');
    cards.forEach(card => {
      const mls = card.getAttribute('data-mls');
      if (!mls) return;
      const href = 'search.html?mls=' + encodeURIComponent(mls);
      card.querySelectorAll('a').forEach(a => a.setAttribute('href', href));
      // Optional: make full card clickable
      // card.style.cursor = 'pointer';
      // card.addEventListener('click', () => window.location.href = href);
    });
  });
})();

/* --------------------------------------
   Prevent scroll jump when IDX loads
-------------------------------------- */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const idx = document.getElementById('idxFeatured');
    if (!idx) return;
    const top = window.scrollY;
    idx.addEventListener('load', () => window.scrollTo({ top, left: 0, behavior: 'instant' }));
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

// ===== Featured Carousel (tiny addon) =====
(function () {
  const STEP_MS  = 350;  // must match CSS .35s
  const PAUSE_MS = 900;  // brief pause between single-card steps

  function getTranslateX(el) {
    const t = getComputedStyle(el).transform;
    if (!t || t === 'none') return 0;
    const m = t.match(/matrix\(([^)]+)\)/);
    if (!m) return 0;
    const parts = m[1].split(',').map(Number);
    return parts.length >= 6 ? parts[4] : 0;
  }

  function debounce(fn, delay) {
    let id;
    return () => { clearTimeout(id); id = setTimeout(fn, delay); };
  }

  function initFeaturedCarousel() {
    const carousel = document.getElementById('featCarousel');
    const track    = document.getElementById('featTrack');
    if (!carousel || !track) return; // do nothing if section missing

    // Create left/right hover zones if not present (no HTML edits needed)
    let zoneLeft  = document.getElementById('featHoverLeft');
    let zoneRight = document.getElementById('featHoverRight');

    if (!zoneLeft) {
      zoneLeft = document.createElement('div');
      zoneLeft.id = 'featHoverLeft';
      zoneLeft.className = 'hover-zone left';
      zoneLeft.setAttribute('aria-hidden', 'true');
      carousel.appendChild(zoneLeft);
    }
    if (!zoneRight) {
      zoneRight = document.createElement('div');
      zoneRight.id = 'featHoverRight';
      zoneRight.className = 'hover-zone right';
      zoneRight.setAttribute('aria-hidden', 'true');
      carousel.appendChild(zoneRight);
    }

    let cardWidth = 0;
    let runningDir = null; // 'left' | 'right' | null
    let stepTimer = null;
    let animating = false;

    function computeStep() {
      const cards = Array.from(track.children);
      if (cards.length < 2) { cardWidth = 0; return; }
      const a = cards[0].getBoundingClientRect();
      const b = cards[1].getBoundingClientRect();
      const gap = Math.max(0, b.left - a.right);
      cardWidth = a.width + gap;
    }

    function shiftLeft() { // first -> end
      const first = track.firstElementChild;
      if (first) track.appendChild(first);
    }
    function shiftRight() { // last -> front
      const last = track.lastElementChild;
      if (last) track.insertBefore(last, track.firstElementChild);
    }

    function step(dir) {
      if (animating || !cardWidth) return;
      animating = true;

      if (dir === 'right') {
        const startX = getTranslateX(track);
        const targetX = startX - cardWidth;

        track.style.transition = 'transform .35s ease';
        track.style.transform  = `translate3d(${targetX}px,0,0)`;

        setTimeout(() => {
          track.style.transition = 'none';
          shiftLeft();
          track.style.transform  = `translate3d(${startX}px,0,0)`;
          void track.getBoundingClientRect();
          track.style.transition = 'transform .35s ease';

          animating = false;
          queueNext(dir);
        }, STEP_MS);
      } else {
        const startX = getTranslateX(track);
        track.style.transition = 'none';
        shiftRight();
        track.style.transform  = `translate3d(${startX - cardWidth}px,0,0)`;
        void track.getBoundingClientRect();
        track.style.transition = 'transform .35s ease';
        track.style.transform  = `translate3d(${startX}px,0,0)`;

        setTimeout(() => {
          animating = false;
          queueNext(dir);
        }, STEP_MS);
      }
    }

    function queueNext(dir) {
      if (runningDir !== dir) return;
      clearTimeout(stepTimer);
      stepTimer = setTimeout(() => step(dir), PAUSE_MS);
    }

    function start(dir) {
      if (runningDir === dir) return;
      runningDir = dir;
      clearTimeout(stepTimer);
      computeStep();
      queueNext(dir);
    }

    function stop() {
      runningDir = null;
      clearTimeout(stepTimer);
    }

    // Edge hover controls
    zoneRight.addEventListener('mouseenter', () => start('right'));
    zoneLeft .addEventListener('mouseenter', () => start('left'));
    zoneRight.addEventListener('mouseleave', stop);
    zoneLeft .addEventListener('mouseleave', stop);

    // Optional: press/hold near edges on touch devices
    function onPointerDown(e) {
      const rect = carousel.getBoundingClientRect();
      const x = e.clientX;
      const leftEdge = rect.left + rect.width * 0.35;
      const rightEdge = rect.right - rect.width * 0.35;
      if (x >= rightEdge) start('right');
      else if (x <= leftEdge) start('left');
    }
    function onPointerUp() { stop(); }

    carousel.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // Optional “react” class for more targeted CSS effects
    Array.from(track.children).forEach((card) => {
      card.addEventListener('mouseenter', () => card.classList.add('is-hovered'));
      card.addEventListener('mouseleave', () => card.classList.remove('is-hovered'));
    });

    // Keep measurement fresh
    window.addEventListener('resize', debounce(() => {
      const wasRunning = runningDir;
      stop();
      computeStep();
      if (wasRunning) start(wasRunning);
    }, 150));

    computeStep();
  }

  // Don't replace your existing DOMContentLoaded—just add another
  document.addEventListener('DOMContentLoaded', initFeaturedCarousel);
})();

/* --------------------------------------
   Custom Select Dropdowns
-------------------------------------- */
(function customSelect() {
  // Initialize all custom selects
  function initCustomSelects() {
    const customSelects = document.querySelectorAll('.custom-select');
    
    customSelects.forEach(select => {
      const trigger = select.querySelector('.select-trigger');
      const options = select.querySelector('.select-options');
      const hiddenInput = select.querySelector('input[type="hidden"]');
      const valueSpan = select.querySelector('.select-value');
      
      if (!trigger || !options || !hiddenInput) return;
      
      // Toggle dropdown
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        select.classList.toggle('open');
        
        // Close other dropdowns
        customSelects.forEach(other => {
          if (other !== select) {
            other.classList.remove('open');
          }
        });
      });
      
      // Handle option selection
      options.addEventListener('click', (e) => {
        const option = e.target.closest('.select-option');
        if (!option) return;
        
        const value = option.getAttribute('data-value');
        const text = option.textContent;
        
        // Update display
        valueSpan.textContent = text;
        hiddenInput.value = value;
        
        // Update selected state
        options.querySelectorAll('.select-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        option.classList.add('selected');
        
        // Close dropdown
        select.classList.remove('open');
        
        // Trigger change event for dynamic fields
        if (hiddenInput.name === 'service') {
          showDynamicFields(value);
        }
      });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      customSelects.forEach(select => {
        select.classList.remove('open');
      });
    });
  }
  
  // Show/hide dynamic fields based on service selection
  function showDynamicFields(serviceValue) {
    const dynamicFields = document.getElementById('dynamicFields');
    const consultationFields = document.getElementById('consultationFields');
    const showingFields = document.getElementById('showingFields');
    const evaluationFields = document.getElementById('evaluationFields');
    const investorFields = document.getElementById('investorFields');
    
    if (!dynamicFields) return;
    
    // Hide all service fields first
    [consultationFields, showingFields, evaluationFields, investorFields].forEach(field => {
      if (field) field.style.display = 'none';
    });
    
    // Show dynamic fields container
    dynamicFields.style.display = 'block';
    
    // Show specific fields based on selection
    switch(serviceValue) {
      case 'consultation':
        if (consultationFields) {
          consultationFields.style.display = 'grid';
          setTimeout(handleConsultationSelection, 100);
        }
        break;
      case 'showing':
        if (showingFields) {
          showingFields.style.display = 'grid';
          setTimeout(handleDateSelection, 100);
        }
        break;
      case 'evaluation':
        if (evaluationFields) {
          evaluationFields.style.display = 'grid';
          setTimeout(handleEvaluationSelection, 100);
        }
        break;
      case 'investor':
        if (investorFields) {
          investorFields.style.display = 'grid';
          setTimeout(handleInvestorSelection, 100);
        }
        break;
      default:
        dynamicFields.style.display = 'none';
    }
  }
  
  // Handle date selection for property showing
  function handleDateSelection() {
    const dateSelect = document.querySelector('#showingFields .custom-select');
    const futureDateField = document.getElementById('futureDateField');
    const futureDateInput = document.querySelector('input[name="futureDate"]');
    
    if (!dateSelect || !futureDateField || !futureDateInput) return;
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    futureDateInput.setAttribute('min', today);
    
    // Clone and replace to ensure event listeners work
    const newDateSelect = dateSelect.cloneNode(true);
    dateSelect.parentNode.replaceChild(newDateSelect, dateSelect);
    
    // Add event listener to new select
    const trigger = newDateSelect.querySelector('.select-trigger');
    const options = newDateSelect.querySelector('.select-options');
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      newDateSelect.classList.toggle('open');
    });
    
    options.addEventListener('click', (e) => {
      const option = e.target.closest('.select-option');
      if (!option) return;
      
      const value = option.getAttribute('data-value');
      const text = option.textContent;
      
      newDateSelect.querySelector('.select-value').textContent = text;
      newDateSelect.querySelector('input[type="hidden"]').value = value;
      
      // Show/hide future date field
      if (value === 'future') {
        futureDateField.style.display = 'flex';
      } else {
        futureDateField.style.display = 'none';
      }
      
      newDateSelect.classList.remove('open');
    });
  }
  
  // Handle consultation selection
  function handleConsultationSelection() {
    const timeSelect = document.querySelector('#consultationFields .custom-select:last-of-type');
    const customTimeField = document.getElementById('consultationCustomTimeField');
    
    if (!timeSelect || !customTimeField) return;
    
    // Clone and replace to ensure event listeners work
    const newTimeSelect = timeSelect.cloneNode(true);
    timeSelect.parentNode.replaceChild(newTimeSelect, timeSelect);
    
    // Add event listener to new select
    const trigger = newTimeSelect.querySelector('.select-trigger');
    const options = newTimeSelect.querySelector('.select-options');
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      newTimeSelect.classList.toggle('open');
    });
    
    options.addEventListener('click', (e) => {
      const option = e.target.closest('.select-option');
      if (!option) return;
      
      const value = option.getAttribute('data-value');
      const text = option.textContent;
      
      newTimeSelect.querySelector('.select-value').textContent = text;
      newTimeSelect.querySelector('input[type="hidden"]').value = value;
      
      // Show/hide custom time field
      if (value === 'custom') {
        customTimeField.style.display = 'flex';
      } else {
        customTimeField.style.display = 'none';
      }
      
      newTimeSelect.classList.remove('open');
    });
  }
  
  // Handle investor selection
  function handleInvestorSelection() {
    const investorSelect = document.querySelector('#investorFields .custom-select');
    
    if (!investorSelect) return;
    
    // Clone and replace to ensure event listeners work
    const newInvestorSelect = investorSelect.cloneNode(true);
    investorSelect.parentNode.replaceChild(newInvestorSelect, investorSelect);
    
    // Add event listener to new select
    const trigger = newInvestorSelect.querySelector('.select-trigger');
    const options = newInvestorSelect.querySelector('.select-options');
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      newInvestorSelect.classList.toggle('open');
    });
    
    options.addEventListener('click', (e) => {
      const option = e.target.closest('.select-option');
      if (!option) return;
      
      const value = option.getAttribute('data-value');
      const text = option.textContent;
      
      newInvestorSelect.querySelector('.select-value').textContent = text;
      newInvestorSelect.querySelector('input[type="hidden"]').value = value;
      
      newInvestorSelect.classList.remove('open');
    });
  }
  
  // Handle evaluation selection
  function handleEvaluationSelection() {
    const evaluationSelect = document.querySelector('#evaluationFields .custom-select');
    
    if (!evaluationSelect) return;
    
    // Clone and replace to ensure event listeners work
    const newEvaluationSelect = evaluationSelect.cloneNode(true);
    evaluationSelect.parentNode.replaceChild(newEvaluationSelect, evaluationSelect);
    
    // Add event listener to new select
    const trigger = newEvaluationSelect.querySelector('.select-trigger');
    const options = newEvaluationSelect.querySelector('.select-options');
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      newEvaluationSelect.classList.toggle('open');
    });
    
    options.addEventListener('click', (e) => {
      const option = e.target.closest('.select-option');
      if (!option) return;
      
      const value = option.getAttribute('data-value');
      const text = option.textContent;
      
      newEvaluationSelect.querySelector('.select-value').textContent = text;
      newEvaluationSelect.querySelector('input[type="hidden"]').value = value;
      
      newEvaluationSelect.classList.remove('open');
    });
  }
  
  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', initCustomSelects);
})();

