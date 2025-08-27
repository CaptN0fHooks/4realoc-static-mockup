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

// Premium Featured Carousel with Infinite Scroll
(function() {
  const track = document.getElementById('featTrack');
  if (!track) return;
  const prev = document.getElementById('featPrev');
  const next = document.getElementById('featNext');
  
  // Clone first few items for seamless infinite scroll
  const items = track.querySelectorAll('.card');
  if (items.length > 0) {
    // Clone first 4 items and append to end
    for (let i = 0; i < Math.min(4, items.length); i++) {
      const clone = items[i].cloneNode(true);
      track.appendChild(clone);
    }
  }
  
  let currentIndex = 0;
  const itemWidth = 300 + 24; // card width + gap
  
  function scrollToIndex(index, smooth = true) {
    const scrollPosition = index * itemWidth;
    track.scrollTo({ 
      left: scrollPosition, 
      behavior: smooth ? 'smooth' : 'auto' 
    });
  }
  
  function nextSlide() {
    currentIndex++;
    scrollToIndex(currentIndex);
    
    // If we've reached the cloned items, jump to real items
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
      currentIndex = items.length - 1;
      scrollToIndex(currentIndex, false);
      setTimeout(() => {
        currentIndex--;
        scrollToIndex(currentIndex);
      }, 50);
    } else {
      scrollToIndex(currentIndex);
    }
  }
  
  next?.addEventListener('click', nextSlide);
  prev?.addEventListener('click', prevSlide);

  // Enhanced hover navigation with infinite scroll
  const carousel = document.getElementById('featCarousel');
  if (carousel) {
    carousel.addEventListener('mousemove', (e) => {
      const rect = carousel.getBoundingClientRect();
      const rel = (e.clientX - rect.left) / rect.width;
      
      if (rel > 0.8) { // Right edge
        if (currentIndex < items.length - 1) {
          nextSlide();
        }
      } else if (rel < 0.2) { // Left edge
        if (currentIndex > 0) {
          prevSlide();
        }
      }
    });
  }
  
  // Auto-scroll for infinite effect
  let autoScrollInterval;
  
  function startAutoScroll() {
    autoScrollInterval = setInterval(() => {
      nextSlide();
    }, 5000); // Change slide every 5 seconds
  }
  
  function stopAutoScroll() {
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
    }
  }
  
  // Start auto-scroll
  startAutoScroll();
  
  // Pause auto-scroll on hover
  carousel?.addEventListener('mouseenter', stopAutoScroll);
  carousel?.addEventListener('mouseleave', startAutoScroll);
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
