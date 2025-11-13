// assets/js/search-ai.js
// Single-responsibility script for search.html
// - Reads ?q= from URL
// - Calls Supabase Edge Function "ai-search"
// - Renders listing tiles + simple map markers

(function () {
  // ===== CONFIG =====
  // You can move these to a separate config later if you like.
  const SUPABASE_URL = 'https://iyvakvcnewsyuhtvfmin.supabase.co';
  const EDGE_FN_PATH = '/functions/v1/ai-search';

  // TODO: replace with your real anon key string
  // (the same one you used in PowerShell earlier)
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5dmFrdmNuZXdzeXVodHZmbWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzI1NzcsImV4cCI6MjA3ODU0ODU3N30.Zx4sDVbijGdrBo0gmBA17PSx8JwZedRpXEUZc_-lvuE';

  // DOM hooks
  const top10Grid       = document.getElementById('top10Grid');
  const resultsError    = document.getElementById('resultsError');
  const resultsEmpty    = document.getElementById('resultsEmpty');
  const resultsSkeleton = document.getElementById('resultsSkeleton');
  const mapEl           = document.getElementById('propertyMap');
  const mapPlaceholder  = document.getElementById('mapPlaceholder');

  const refineForm  = document.getElementById('refineChatForm');
  const refineInput = document.getElementById('refineChatInput');

  // ===== UTILITIES =====
  function getQueryFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const q = (params.get('q') || '').trim();
    return q;
  }

  function setLoading(message) {
    if (top10Grid) top10Grid.innerHTML = '';
    if (resultsError) resultsError.hidden = true;
    if (resultsEmpty) resultsEmpty.hidden = true;

    if (resultsSkeleton) {
      resultsSkeleton.hidden = false;
      resultsSkeleton.textContent =
        message || 'Loading smart matches for your request...';
    }
  }

  function setError(message) {
    if (resultsSkeleton) resultsSkeleton.hidden = true;
    if (resultsEmpty) resultsEmpty.hidden = true;

    if (resultsError) {
      resultsError.hidden = false;
      resultsError.textContent =
        message || 'We had trouble loading results. Mike can send options directly.';
    }
  }

  function setEmpty() {
    if (resultsSkeleton) resultsSkeleton.hidden = true;
    if (resultsError) resultsError.hidden = true;
    if (resultsEmpty) resultsEmpty.hidden = false;
  }

  // ===== SUPABASE CALL =====
  async function callAiSearch(query) {
    const url = SUPABASE_URL + EDGE_FN_PATH;

    const payload = {
      query: query,
      // We can add structured filters later (price, beds, cities, etc.)
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error('Search request failed: ' + res.status + ' ' + text);
    }

    const data = await res.json();
    return data.results || [];
  }

  // ===== RENDERING =====
  function renderListings(listings) {
    if (!top10Grid) return;

    if (resultsSkeleton) resultsSkeleton.hidden = true;
    if (!listings || !listings.length) {
      setEmpty();
      return;
    }

    if (resultsError) resultsError.hidden = true;
    if (resultsEmpty) resultsEmpty.hidden = true;

    top10Grid.innerHTML = '';

    // Only show top 10
    const top = listings.slice(0, 10);

    top.forEach(function (listing) {
      const card = document.createElement('article');
      card.className = 'listing-card';

      // Image section
      const imgWrap = document.createElement('div');
      imgWrap.className = 'listing-image-wrap';

      const img = document.createElement('img');
      img.src =
        listing.image ||
        'assets/backgrounds/results-bg.jpg'; // fallback image you already have
      img.alt = listing.address || 'Property photo';
      imgWrap.appendChild(img);

      // Main section
      const main = document.createElement('div');
      main.className = 'listing-main';

      // Price badge
      const priceEl = document.createElement('div');
      priceEl.className = 'property-price listing-price';
      if (listing.price && typeof listing.price === 'number') {
        priceEl.textContent = '$' + listing.price.toLocaleString();
      } else if (listing.price && typeof listing.price === 'string') {
        priceEl.textContent = listing.price;
      } else {
        priceEl.textContent = 'Price on request';
      }

      // Meta line: beds • baths • city • address (shortened)
      const metaEl = document.createElement('div');
      metaEl.className = 'property-meta listing-meta';

      const beds = listing.beds != null ? listing.beds : '?';
      const baths = listing.baths != null ? listing.baths : '?';
      const city = listing.city || '';
      const address = listing.address || '';

      metaEl.textContent =
        beds + ' bd • ' +
        baths + ' ba' +
        (city ? ' • ' + city : '') +
        (address ? ' • ' + address : '');

      // Highlights line
      const highlightsEl = document.createElement('div');
      highlightsEl.className = 'listing-highlights';

      if (Array.isArray(listing.highlights) && listing.highlights.length) {
        highlightsEl.textContent = listing.highlights.join(' • ');
      } else {
        highlightsEl.textContent = 'Curated by CALL MIKE!!!';
      }

      main.appendChild(priceEl);
      main.appendChild(metaEl);
      main.appendChild(highlightsEl);

      // Actions row
      const actions = document.createElement('div');
      actions.className = 'listing-actions';

      // Primary button: Book Tour
      const tourBtn = document.createElement('button');
      tourBtn.className = 'btn cta';
      tourBtn.textContent = 'Book Tour';

      // For now: send them to your inquire section with a prefilled subject
      tourBtn.addEventListener('click', function () {
        const subject = encodeURIComponent(
          'Tour request: ' + (listing.address || 'property')
        );
        window.location.href = 'mailto:michaelrichard.re@gmail.com?subject=' + subject;
      });

      actions.appendChild(tourBtn);

      // Optional "View details" if listing.url exists
      if (listing.url) {
        const link = document.createElement('a');
        link.href = listing.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'View details';
        actions.appendChild(link);
      }

      card.appendChild(imgWrap);
      card.appendChild(main);
      card.appendChild(actions);

      top10Grid.appendChild(card);
    });

    // Map markers
    renderMapMarkers(top);
  }

  function renderMapMarkers(listings) {
    if (!mapEl) return;

    const oldMarkers = mapEl.querySelectorAll('.map-marker');
    oldMarkers.forEach(function (m) { m.remove(); });

    const valid = listings.filter(function (l) {
      return typeof l.lat === 'number' && typeof l.lng === 'number';
    });

    if (!valid.length) return;

    if (mapPlaceholder) mapPlaceholder.style.display = 'none';

    // Simple OC-ish fake projection
    const minLat = 33.4;
    const maxLat = 33.8;
    const minLng = -118.1;
    const maxLng = -117.5;

    valid.forEach(function (l) {
      let x = ((l.lng - minLng) / (maxLng - minLng)) * 100;
      let y = (1 - (l.lat - minLat) / (maxLat - minLat)) * 100;

      x = Math.max(2, Math.min(98, x));
      y = Math.max(5, Math.min(95, y));

      const marker = document.createElement('div');
      marker.className = 'map-marker';
      marker.style.position = 'absolute';
      marker.style.width = '9px';
      marker.style.height = '9px';
      marker.style.borderRadius = '999px';
      marker.style.background = '#ffb347';
      marker.style.boxShadow = '0 0 8px #ffb347';
      marker.style.left = x + '%';
      marker.style.top = y + '%';

      mapEl.appendChild(marker);
    });
  }

  // ===== MAIN INITIALIZER =====
  async function runInitialSearch() {
    const query = getQueryFromUrl();

    // Keep refine box in sync
    if (refineInput && query) {
      refineInput.value = query;
    }

    if (!query) {
      setError('Tell me what you\'re looking for: city, price, beds, features.');
      return;
    }

    setLoading();

    try {
      const listings = await callAiSearch(query);
      renderListings(listings);
    } catch (err) {
      console.error(err);
      setError(
        'Could not load listings. Mike can pull options manually—reach out and he’ll send a custom list.'
      );
    }
  }

  // Attach refine form handler, if present
  if (refineForm && refineInput) {
    refineForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const q = (refineInput.value || '').trim();
      if (!q) return;
      // Reload page with new query param
      window.location.href = 'search.html?q=' + encodeURIComponent(q);
    });
  }

  // Run immediately on page load
  runInitialSearch();
})();
