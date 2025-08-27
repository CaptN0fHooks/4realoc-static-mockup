// Header hide on scroll & reveal when hovering near the top
(function() {
  const header = document.getElementById('siteHeader');
  const revealZone = document.querySelector('.top-reveal-zone');
  let lastY = window.scrollY;

  function onScroll() {
    const y = window.scrollY;
    if (y > 40 && y > lastY) {
      header.classList.add('hidden');
    } else {
      header.classList.remove('hidden');
    }
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // Hover at the very top reveals the header
  if (revealZone) {
    revealZone.addEventListener('mouseenter', () => header.classList.remove('hidden'));
  }

  // Year in footer
  const yEl = document.getElementById('year');
  if (yEl) yEl.textContent = new Date().getFullYear();
})();

// Hero text sequence: "Real Estate" -> "For Real People" -> "Real OC" (lock)
(function() {
  const el = document.getElementById('heroText');
  if (!el) return;
  const steps = ["Real Estate", "For Real People", "Real OC"];
  let i = 0;
  function next() {
    el.textContent = steps[i];
    i++;
    if (i < steps.length) setTimeout(next, i === 1 ? 1600 : 1600);
  }
  next();
})();

// Featured carousel simple pager
(function() {
  const track = document.getElementById('featTrack');
  if (!track) return;
  const prev = document.getElementById('featPrev');
  const next = document.getElementById('featNext');
  let page = 0;
  function update() {
    const width = track.clientWidth;
    track.scrollTo({ left: page * width, behavior: 'smooth' });
  }
  next?.addEventListener('click', () => { page = Math.min(page + 1, 1); update(); }); // 2 pages (0,1) for 8 items / 4 visible approx
  prev?.addEventListener('click', () => { page = Math.max(page - 1, 0); update(); });

  // Bonus: hover to right/left edges to switch
  const carousel = document.getElementById('featCarousel');
  if (carousel) {
    carousel.addEventListener('mousemove', (e) => {
      const rect = carousel.getBoundingClientRect();
      const rel = (e.clientX - rect.left) / rect.width;
      if (rel > 0.74) { page = 1; update(); }
      if (rel < 0.26) { page = 0; update(); }
    });
  }
})();

// Mini search -> redirect with query params to search.html
(function() {
  const form = document.getElementById('miniSearch');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const params = new URLSearchParams(new FormData(form)).toString();
    window.location.href = 'search.html?' + params;
  });
})();

// Full search: prefill from URL and fake "results" regeneration
(function() {
  const form = document.getElementById('fullSearch');
  if (!form) return;
  const params = new URLSearchParams(window.location.search);
  for (const [k, v] of params.entries()) {
    const field = form.elements.namedItem(k);
    if (field && 'value' in field) field.value = v;
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // In a real app, you would call IDX here.
    const results = document.getElementById('results');
    if (results) {
      results.innerHTML = '';
      for (let i = 0; i < 6; i++) {
        const card = document.createElement('div');
        card.className = 'glass';
        card.style.padding = '12px';
        card.innerHTML = `<strong>Result ${i+1}</strong><br/><small>Updated based on your filters.</small>`;
        results.appendChild(card);
      }
    }
  });
})();
