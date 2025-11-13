// assets/js/search-results.js
// MASTER SEARCH SCRIPT
//
// What it does (simple version):
// - Reads ?q= from the URL (what the user typed on index.html)
// - Calls your Supabase Edge Function `ai-search`
// - Renders nice "Top 10" tiles
// - Drops simple glowing markers onto the static map

(function () {
  // === 1. CONFIG – FILL THESE IN ===
  // Your Supabase project URL (no trailing slash)
  var SUPABASE_URL = 'https://iyvakvcnewsyuhtvfmin.supabase.co';

  // Edge Function path
  var FUNCTION_PATH = '/functions/v1/ai-search';

  // 🔑 IMPORTANT:
  // Paste your ANON key here (the same long token you used in PowerShell).
  // Example:
  // var SUPABASE_ANON_KEY = 'eyJhbGciOi...';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5dmFrdmNuZXdzeXVodHZmbWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzI1NzcsImV4cCI6MjA3ODU0ODU3N30.Zx4sDVbijGdrBo0gmBA17PSx8JwZedRpXEUZc_-lvuE';

  // === 2. GRAB ELEMENTS FROM THE PAGE ===
  var params = new URLSearchParams(window.location.search);
  var q = (params.get('q') || '').trim();

  var top10Grid      = document.getElementById('top10Grid');
  var resultsError   = document.getElementById('resultsError');
  var resultsEmpty   = document.getElementById('resultsEmpty');
  var resultsSkeleton= document.getElementById('resultsSkeleton');
  var mapEl          = document.getElementById('propertyMap');
  var mapPlaceholder = document.getElementById('mapPlaceholder');

  // ==== Small helpers for UI states ====
  function setLoading() {
    if (resultsError)  resultsError.hidden = true;
    if (resultsEmpty)  resultsEmpty.hidden = true;
    if (top10Grid)     top10Grid.innerHTML = '';
    if (resultsSkeleton) {
      resultsSkeleton.hidden = false;
      resultsSkeleton.textContent =
        q
          ? 'Loading smart matches for "' + q + '"...'
          : 'Loading smart matches for your request...';
    }
  }

  function setError(message) {
    if (resultsSkeleton) resultsSkeleton.hidden = true;
    if (resultsError) {
      resultsError.hidden = false;
      resultsError.textContent =
        message || 'We had trouble loading results. Mike can send options directly.';
    }
  }

  function setEmpty() {
    if (resultsSkeleton) resultsSkeleton.hidden = true;
    if (resultsEmpty)    resultsEmpty.hidden = false;
  }

  // ==== 3. RENDER LISTINGS + MAP MARKERS ====

  function renderListings(listings) {
    if (!top10Grid) return;

    top10Grid.innerHTML = '';
    if (resultsSkeleton) resultsSkeleton.hidden = true;

    if (!listings || !listings.length) {
      setEmpty();
      return;
    }

    if (resultsError) resultsError.hidden = true;
    if (resultsEmpty) resultsEmpty.hidden = true;

    var top = listings.slice(0, 10);

    top.forEach(function (listing) {
      // Outer card
      var card = document.createElement('article');
      card.className = 'listing-card';

      // Image section
      var imgWrap = document.createElement('div');
      imgWrap.className = 'listing-image-wrap';
      var img = document.createElement('img');
      img.src = listing.image || 'assets/backgrounds/results-bg.webp';
      img.alt = listing.address || 'Property photo';
      imgWrap.appendChild(img);

      // Main text block
      var main = document.createElement('div');
      main.className = 'listing-main';

      // Price badge
      var priceEl = document.createElement('div');
      priceEl.className = 'property-price listing-price';
      if (typeof listing.price === 'number') {
        priceEl.textContent = '$' + listing.price.toLocaleString();
      } else {
        priceEl.textContent = 'Price available on request';
      }

      // Meta line: beds • baths • city • address
      var metaEl = document.createElement('div');
      metaEl.className = 'property-meta listing-meta';
      var parts = [];

      if (listing.beds != null)  parts.push(listing.beds + ' bd');
      if (listing.baths != null) parts.push(listing.baths + ' ba');
      if (listing.city)          parts.push(listing.city);
      if (listing.address)       parts.push(listing.address);

      metaEl.textContent = parts.join(' • ');

      // Highlights line
      var highlightsEl = document.createElement('div');
      highlightsEl.className = 'listing-highlights';
      if (listing.highlights && listing.highlights.length) {
        highlightsEl.textContent = listing.highlights.join(' • ');
      } else {
        highlightsEl.textContent = 'Curated by CALL MIKE!!!';
      }

      main.appendChild(priceEl);
      main.appendChild(metaEl);
      main.appendChild(highlightsEl);

      // Actions row
      var actions = document.createElement('div');
      actions.className = 'listing-actions';

      // Book Tour button (simple for now)
      var tourBtn = document.createElement('button');
      tourBtn.className = 'btn cta book-tour-btn';
      tourBtn.textContent = 'Book Tour';
      tourBtn.addEventListener('click', function () {
        // For now just open mailto. We can wire this into AI voice or a modal later.
        var subject = encodeURIComponent('Tour request: ' + (listing.address || 'Property'));
        var body = encodeURIComponent(
          'Hi Mike,\n\n' +
          'I\'d like to tour this property:\n\n' +
          (listing.address || '') +
          (listing.city ? ', ' + listing.city : '') +
          '\n\nPlease contact me with available times.\n'
        );
        window.location.href = 'mailto:michael@yourdomain.com?subject=' + subject + '&body=' + body;
      });
      actions.appendChild(tourBtn);

      // Optional "View details" link if URL exists
      if (listing.url) {
        var link = document.createElement('a');
        link.href = listing.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'View details';
        actions.appendChild(link);
      }

      // Assemble card
      card.appendChild(imgWrap);
      card.appendChild(main);
      card.appendChild(actions);

      top10Grid.appendChild(card);
    });

    renderMapMarkers(top);
  }

  function renderMapMarkers(listings) {
    if (!mapEl) return;

    // Clear old markers
    var oldMarkers = mapEl.querySelectorAll('.map-marker');
    oldMarkers.forEach(function (m) { m.remove(); });

    var valid = (listings || []).filter(function (l) {
      return typeof l.lat === 'number' && typeof l.lng === 'number';
    });

    if (!valid.length) return;

    if (mapPlaceholder) {
      mapPlaceholder.style.display = 'none';
    }

    // Very simple OC-ish projection
    var minLat = 33.4;
    var maxLat = 33.8;
    var minLng = -118.1;
    var maxLng = -117.5;

    valid.forEach(function (l) {
      var x = ((l.lng - minLng) / (maxLng - minLng)) * 100;
      var y = (1 - (l.lat - minLat) / (maxLat - minLat)) * 100;

      x = Math.max(2, Math.min(98, x));
      y = Math.max(5, Math.min(95, y));

      var m = document.createElement('div');
      m.className = 'map-marker';
      m.style.position = 'absolute';
      m.style.width = '9px';
      m.style.height = '9px';
      m.style.borderRadius = '999px';
      m.style.background = '#ffb347';
      m.style.boxShadow = '0 0 8px #ffb347';
      m.style.left = x + '%';
      m.style.top = y + '%';

      mapEl.appendChild(m);
    });
  }

  // ==== 4. TALK TO SUPABASE EDGE FUNCTION ====

  function callAISearch(queryText) {
    // If no query, just bail gracefully
    if (!queryText) {
      return Promise.resolve([]);
    }

    // Build filters from URL params
    var filters = {};
    var beds = params.get('beds');
    var baths = params.get('baths');
    var minPrice = params.get('minPrice');
    var maxPrice = params.get('maxPrice');
    var city = params.get('city');

    // helper to coerce numeric strings
    function toNum(v) {
      if (v === null || v === undefined || v === '') return undefined;
      var n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }

    var nbeds = toNum(beds);
    var nbaths = toNum(baths);
    var nMinPrice = toNum(minPrice);
    var nMaxPrice = toNum(maxPrice);

    if (nbeds !== undefined) {
      filters.beds = nbeds;
    }
    if (nbaths !== undefined) {
      filters.baths = nbaths;
    }
    if (nMinPrice !== undefined) {
      filters.minPrice = nMinPrice;
    }
    if (nMaxPrice !== undefined) {
      filters.maxPrice = nMaxPrice;
    }
    if (city && city.trim()) {
      filters.city = city.trim();
    }

    var payload = {
      query: queryText,
      filters: filters
    };

    var url = SUPABASE_URL + FUNCTION_PATH;

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) {
          return res.text().then(function (t) {
            throw new Error('Supabase error ' + res.status + ': ' + t);
          });
        }
        return res.json();
      })
      .then(function (data) {
        return data && Array.isArray(data.results) ? data.results : [];
      });
  }

  // ==== 5. MAIN ENTRYPOINT ====

  function init() {
    if (!top10Grid) {
      console.warn('search-results.js: #top10Grid not found; nothing to do.');
      return;
    }

    if (!q) {
      setError('Tell me what you\'re looking for on the homepage search box first.');
      return;
    }

    setLoading();

    callAISearch(q)
      .then(function (results) {
        if (!results.length) {
          setEmpty();
        } else {
          renderListings(results);
        }
      })
      .catch(function (err) {
        console.error('AI search failed:', err);
        setError('Search engine had an issue. Mike can manually pull matches for you.');
      });
  }

  // Run when the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
