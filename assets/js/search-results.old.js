// search-results.js
// This runs on search.html.
//
// It now:
// - Reads ?q= from the URL (what the user typed on homepage)
// - Calls the Supabase Edge Function /ai-search
// - If that fails, falls back to local mock listings
// - Renders Top 10 tiles and map markers.

(function () {
  // === Supabase config ===
  // This is safe to expose: it's your public anon key, not a secret.
  var SUPABASE_URL = 'https://iyvakvcnewsyuhtvfmin.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5dmFrdmNuZXdzeXVodHZmbWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzI1NzcsImV4cCI6MjA3ODU0ODU3N30.Zx4sDVbijGdrBo0gmBA17PSx8JwZedRpXEUZc_-lvuE';

  // Read the query from the URL: ?q=...
  var params = new URLSearchParams(window.location.search);
  var q = params.get('q') || '';

  // Little helper to call our AI search function.
  // It sends { query: "...", filters: {} } and returns a list of listings.
  function callAiSearch(queryText) {
    var payload = {
      query: queryText || '',
      filters: {
        // Later we can pass richer filters (minPrice, maxPrice, etc.)
      }
    };

    return fetch(SUPABASE_URL + '/functions/v1/ai-search', {
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
          throw new Error('AI search failed with status ' + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        // Make sure we always return an array
        return (data && data.results) ? data.results : [];
      });
  }
  var q = params.get('q') || '';

  var top10Grid = document.getElementById('top10Grid');
  var resultsError = document.getElementById('resultsError');
  var resultsEmpty = document.getElementById('resultsEmpty');
  var resultsSkeleton = document.getElementById('resultsSkeleton');
  var mapEl = document.getElementById('propertyMap');
  var mapPlaceholder = document.getElementById('mapPlaceholder');

  // If we ever add the refine form, we can sync it here.
  var refineInput = document.getElementById('refineChatInput');
  var refineForm = document.getElementById('refineChatForm');

  if (refineInput && q) {
    refineInput.value = q;
  }

  if (refineForm && refineInput) {
    // When the user refines their search, reload page with new ?q
    refineForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var newQ = (refineInput.value || '').trim();
      if (!newQ) return;
      window.location.href =
        'search.html?q=' + encodeURIComponent(newQ);
    });
  }

  function setLoading() {
    if (resultsError) resultsError.hidden = true;
    if (resultsEmpty) resultsEmpty.hidden = true;
    if (top10Grid) top10Grid.innerHTML = '';
    if (resultsSkeleton) {
      resultsSkeleton.hidden = false;
      resultsSkeleton.innerHTML =
        '<p>Loading smart matches for your request...</p>';
    }
  }

  function setError(message) {
    if (resultsSkeleton) resultsSkeleton.hidden = true;
    if (resultsError) {
      resultsError.hidden = false;
      resultsError.textContent =
        message || 'We had trouble loading results.';
    }
  }

  function setEmpty() {
    if (resultsSkeleton) resultsSkeleton.hidden = true;
    if (resultsEmpty) resultsEmpty.hidden = false;
  }

  function renderListings(listings) {
    if (!top10Grid) return;
    if (resultsSkeleton) resultsSkeleton.hidden = true;

    top10Grid.innerHTML = '';

    if (!listings || !listings.length) {
      setEmpty();
      return;
    }

    if (resultsError) resultsError.hidden = true;
    if (resultsEmpty) resultsEmpty.hidden = true;

    // Top 10 only
    var top = listings.slice(0, 10);

    top.forEach(function (listing) {
      var card = document.createElement('article');
      card.className = 'listing-card';

      // Image
      var imgWrap = document.createElement('div');
      imgWrap.className = 'listing-image-wrap';
      var img = document.createElement('img');
      img.src =
        listing.image || 'assets/headshot.jpg';
      img.alt = listing.address || 'Property photo';
      imgWrap.appendChild(img);

      // Main details
      var main = document.createElement('div');
      main.className = 'listing-main';

      var priceEl = document.createElement('div');
      priceEl.className = 'property-price listing-price';
      priceEl.textContent = listing.price
        ? '$' + listing.price.toLocaleString()
        : 'Price available on request';

      var metaEl = document.createElement('div');
      metaEl.className = 'property-meta listing-meta';
      metaEl.textContent =
        (listing.beds || '?') +
        ' bd • ' +
        (listing.baths || '?') +
        ' ba • ' +
        (listing.city || '') +
        (listing.address ? ' • ' + listing.address : '');

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

   // Actions: Book a Tour + View details
   var actions = document.createElement('div');
   actions.className = 'listing-actions';

   // Create the "Book a Tour" button
   var tourBtn = document.createElement('button');
   tourBtn.className = 'btn cta book-tour-btn';
   tourBtn.textContent = 'Book a Tour';

   // When clicked, open the tour modal with this listing's info
   tourBtn.addEventListener('click', function () {
     if (window.openTourModal) {
       window.openTourModal({
         listing_id: listing.id || '',
         listing_address:
           (listing.address || '') +
           (listing.city ? ', ' + listing.city : '')
       });
     } else {
       alert('Please reach out to Mike directly about this property.');
     }
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

   card.appendChild(imgWrap);
   card.appendChild(main);
   card.appendChild(actions);
   top10Grid.appendChild(card);

    });

    renderMapMarkers(top);
  }

  function renderMapMarkers(listings) {
    if (!mapEl) return;

    // Remove any existing markers
    var oldMarkers = mapEl.querySelectorAll('.map-marker');
    oldMarkers.forEach(function (m) { m.remove(); });

    var valid = listings.filter(function (l) {
      return typeof l.lat === 'number' && typeof l.lng === 'number';
    });

    if (!valid.length) return;

    if (mapPlaceholder) {
      mapPlaceholder.style.display = 'none';
    }

    // Super simple fake "projection" for OC-ish bounds
    var minLat = 33.4;
    var maxLat = 33.8;
    var minLng = -118.1;
    var maxLng = -117.5;

    valid.forEach(function (l) {
      var x = ((l.lng - minLng) / (maxLng - minLng)) * 100;
      var y = (1 - (l.lat - minLat) / (maxLat - minLat)) * 100;

      x = Math.max(2, Math.min(98, x));
      y = Math.max(5, Math.min(95, y));

      var marker = document.createElement('div');
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

  // Try live AI search first, then fall back to mock JSON if something goes wrong.
  function loadListings() {
    // First, call our Supabase Edge Function
    return callAiSearch(q)
      .catch(function (err) {
        console.error('AI search failed, falling back to mock data:', err);

        // Fallback: local mock JSON
        return fetch('assets/data/mock-listings.json')
          .then(function (res) {
            if (!res.ok) throw new Error('Missing mock-listings.json');
            return res.json();
          })
          .then(function (data) {
            return data.results || [];
          });
      });
  }

  // Run on page load
  setLoading();

  loadListings()
    .then(function (listings) {
      renderListings(listings);
    })
    .catch(function (err) {
      console.error(err);
      setError(
        'Could not load listings. Please describe what you want and Mike will send options directly.'
      );
    });
})();
