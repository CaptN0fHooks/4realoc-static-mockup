import {
  parseUserQueryToFilters,
  getFiltersFromUrl,
  getFiltersFromSession,
  mergeFilters,
  filtersToQueryString,
  filtersToSession
} from './filters.js';
import { searchListings } from './api.js';
import { initMap } from './map.js';

const PLACEHOLDER_LISTINGS = [
  {
    id: 'demo-1',
    price: 2480000,
    address: '1985 Oceanfront Walk, Laguna Beach, CA 92651',
    city: 'Laguna Beach',
    state: 'CA',
    postalCode: '92651',
    beds: 3,
    baths: 3,
    sqft: 2260,
    lat: 33.5428,
    lng: -117.7835,
    image: 'assets/backgrounds/featured-bg.webp',
    daysOnMarket: 5,
    url: '#'
  },
  {
    id: 'demo-2',
    price: 1895000,
    address: '4201 Seashore Dr, Newport Beach, CA 92663',
    city: 'Newport Beach',
    state: 'CA',
    postalCode: '92663',
    beds: 4,
    baths: 3,
    sqft: 2450,
    lat: 33.6189,
    lng: -117.929,
    image: 'assets/backgrounds/search-bg.webp',
    daysOnMarket: 9,
    url: '#'
  },
  {
    id: 'demo-3',
    price: 1425000,
    address: '1801 Main St, Huntington Beach, CA 92648',
    city: 'Huntington Beach',
    state: 'CA',
    postalCode: '92648',
    beds: 3,
    baths: 2,
    sqft: 1985,
    lat: 33.6595,
    lng: -117.9988,
    image: 'assets/backgrounds/004.webp',
    daysOnMarket: 3,
    url: '#'
  },
  {
    id: 'demo-4',
    price: 1280000,
    address: '65 Coralwood, Irvine, CA 92618',
    city: 'Irvine',
    state: 'CA',
    postalCode: '92618',
    beds: 4,
    baths: 4,
    sqft: 3040,
    lat: 33.6846,
    lng: -117.8265,
    image: 'assets/backgrounds/buyer-hero-bg.webp',
    daysOnMarket: 7,
    url: '#'
  },
  {
    id: 'demo-5',
    price: 2150000,
    address: '28 Monarch Bay Dr, Dana Point, CA 92629',
    city: 'Dana Point',
    state: 'CA',
    postalCode: '92629',
    beds: 4,
    baths: 4,
    sqft: 3125,
    lat: 33.4672,
    lng: -117.6981,
    image: 'assets/backgrounds/results-bg.jpg',
    daysOnMarket: 12,
    url: '#'
  },
  {
    id: 'demo-6',
    price: 995000,
    address: '312 Avenida Granada, San Clemente, CA 92672',
    city: 'San Clemente',
    state: 'CA',
    postalCode: '92672',
    beds: 3,
    baths: 3,
    sqft: 1880,
    lat: 33.427,
    lng: -117.612,
    image: 'assets/backgrounds/about-bg.webp',
    daysOnMarket: 14,
    url: '#'
  },
  {
    id: 'demo-7',
    price: 875000,
    address: '88 Vintage, Irvine, CA 92620',
    city: 'Irvine',
    state: 'CA',
    postalCode: '92620',
    beds: 3,
    baths: 2,
    sqft: 1725,
    lat: 33.7074,
    lng: -117.759,
    image: 'assets/backgrounds/reasons-bg.webp',
    daysOnMarket: 18,
    url: '#'
  },
  {
    id: 'demo-8',
    price: 1365000,
    address: '22 Marseille, Newport Coast, CA 92657',
    city: 'Newport Coast',
    state: 'CA',
    postalCode: '92657',
    beds: 3,
    baths: 3,
    sqft: 2104,
    lat: 33.5906,
    lng: -117.8394,
    image: 'assets/backgrounds/inquire-bg.webp',
    daysOnMarket: 8,
    url: '#'
  },
  {
    id: 'demo-9',
    price: 1185000,
    address: '25712 Fairlie Dr, Mission Viejo, CA 92692',
    city: 'Mission Viejo',
    state: 'CA',
    postalCode: '92692',
    beds: 4,
    baths: 3,
    sqft: 2785,
    lat: 33.6001,
    lng: -117.672,
    image: 'assets/backgrounds/about-bg.webp',
    daysOnMarket: 11,
    url: '#'
  },
  {
    id: 'demo-10',
    price: 1520000,
    address: '701 E Canyon Ridge, Anaheim Hills, CA 92808',
    city: 'Anaheim Hills',
    state: 'CA',
    postalCode: '92808',
    beds: 5,
    baths: 4,
    sqft: 3320,
    lat: 33.8503,
    lng: -117.7601,
    image: 'assets/backgrounds/featured-bg.webp',
    daysOnMarket: 16,
    url: '#'
  }
];

const REFRESH_DEBOUNCE_MS = 450;
const SKELETON_CARD_COUNT = 6;
const BULLET = ' \u2022 ';
const PREVIEW_PLACEHOLDER = 'assets/backgrounds/placeholder-bg.webp';

const state = {
  filters: {},
  listings: [],
  total: 0,
  loading: false,
  requestId: 0,
  map: null,
  hoveredCardId: null,
  debounceHandle: null,
  usingPlaceholder: false,
  placeholderNoticeShown: false
};

const mapContainerId = 'propertyMap';
const mapPlaceholder = document.getElementById('mapPlaceholder');
const topTenGrid = document.getElementById('top10Grid');
const loadMoreBtn = document.getElementById('loadMoreListings');
const errorBanner = document.getElementById('resultsError');
const skeletonContainer = document.getElementById('resultsSkeleton');
const emptyState = document.getElementById('resultsEmpty');
const retryBtn = document.getElementById('retrySearch');
const heroResultCount = document.getElementById('resultCount');
const heroSummary = document.getElementById('searchSummary');
const chatForm = document.getElementById('refineChatForm');
const chatInput = document.getElementById('refineChatInput');
const chatMessages = document.getElementById('refineChatMessages');
const heroTopFiveContainer = document.querySelector('#heroTop5 .top5-container');

function renderSkeleton(active) {
  if (!skeletonContainer) return;
  skeletonContainer.innerHTML = '';
  skeletonContainer.hidden = !active;
  if (!active) return;

  for (let index = 0; index < SKELETON_CARD_COUNT; index += 1) {
    const card = document.createElement('div');
    card.className = 'property-card skeleton';
    card.innerHTML = `
      <div class="property-image"></div>
      <div class="property-details">
        <div class="skeleton-line w-60"></div>
        <div class="skeleton-line w-40"></div>
        <div class="skeleton-line w-80"></div>
      </div>
    `;
    skeletonContainer.appendChild(card);
  }
}

function setLoading(isLoading) {
  state.loading = isLoading;
  renderSkeleton(isLoading);
  if (loadMoreBtn) loadMoreBtn.disabled = isLoading;
  // Removed retryBtn disabled state - now it's a navigation link
  // if (retryBtn) retryBtn.disabled = isLoading;
  if (chatInput && isLoading && document.activeElement !== chatInput) {
    chatInput.disabled = true;
  } else if (chatInput) {
    chatInput.disabled = false;
  }
}

function updateSummary() {
  if (heroResultCount) {
    if (state.usingPlaceholder) {
      heroResultCount.textContent = `${state.listings.length} demo matches`;
    } else if (state.total) {
      heroResultCount.textContent = `${Math.min(state.listings.length, state.total)} of ${state.total.toLocaleString()} matches`;
    } else if (state.listings.length) {
      heroResultCount.textContent = `${state.listings.length} matches`;
    } else {
      heroResultCount.textContent = 'No matches yet';
    }
  }

  if (heroSummary) {
    const parts = [];
    if (state.filters.q) parts.push(state.filters.q);
    if (state.filters.minPrice) parts.push(`from ${formatCurrency(state.filters.minPrice)}`);
    if (state.filters.maxPrice) parts.push(`under ${formatCurrency(state.filters.maxPrice)}`);
    if (state.filters.beds) parts.push(`${state.filters.beds}+ beds`);
    if (state.filters.baths) parts.push(`${state.filters.baths}+ baths`);

    const summary = parts.length ? `Filters: ${parts.join(BULLET)}` : 'Showing latest listings across Orange County.';
    heroSummary.textContent = state.usingPlaceholder ? `${summary} · Demo preview` : summary;
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function updateUrl() {
  const queryString = filtersToQueryString(state.filters);
  const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`;
  window.history.replaceState({ filters: state.filters }, '', newUrl);
  filtersToSession(state.filters);
}

function resetListIfNeeded() {
  if (!topTenGrid) return;
  topTenGrid.innerHTML = '';
}

function showError(message) {
  if (!errorBanner) return;
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

function clearError() {
  if (!errorBanner) return;
  errorBanner.hidden = true;
  errorBanner.textContent = '';
}

function setMapPlaceholderVisible(visible) {
  if (!mapPlaceholder) return;
  mapPlaceholder.classList.toggle('hidden', !visible);
}

function showEmptyState() {
  if (!emptyState) return;
  emptyState.hidden = false;
}

function hideEmptyState() {
  if (!emptyState) return;
  emptyState.hidden = true;
}

function dedupeById(listings) {
  const seen = new Set();
  return listings.filter(listing => {
    if (!listing || !listing.id) return false;
    if (seen.has(listing.id)) return false;
    seen.add(listing.id);
    return true;
  });
}

function renderListings(listings) {
  resetListIfNeeded();
  if (!topTenGrid) return;

  if (!listings.length) {
    renderHeroTopFive([]);
    showEmptyState();
    return;
  }

  hideEmptyState();
  const fragment = document.createDocumentFragment();
  listings.slice(0, 10).forEach(listing => {
    fragment.appendChild(renderListingCard(listing));
  });
  topTenGrid.appendChild(fragment);
  renderHeroTopFive(listings);
}

function renderListingCard(listing) {
  const card = document.createElement('article');
  card.className = 'property-card';
  card.tabIndex = 0;
  card.setAttribute('data-listing-id', listing.id);

  const price = listing.price ? formatCurrency(listing.price) : 'Call for pricing';
  const meta = [
    listing.beds ? `${listing.beds} bd` : null,
    listing.baths ? `${listing.baths} ba` : null,
    listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : null
  ].filter(Boolean).join(BULLET);

  const dom = listing.daysOnMarket != null ? `<span class="card-dom">${listing.daysOnMarket} DOM</span>` : '';
  const background = listing.image ? `style="background-image:url('${listing.image}');"` : '';

  card.innerHTML = `
    <div class="property-image" ${background} aria-hidden="true">
      <p class="property-price">${price}</p>
    </div>
    <div class="property-details">
      <h3 class="property-address">${listing.address || `${listing.city}, ${listing.state}`}</h3>
      ${meta ? `<p class="property-features">${meta}</p>` : ''}
      <div class="property-meta">
        ${dom}
        <a class="property-link" href="${listing.url || '#'}" target="_blank" rel="noopener">View details</a>
      </div>
    </div>
  `;

  return card;
}

function renderHeroTopFive(listings) {
  if (!heroTopFiveContainer) return;
  heroTopFiveContainer.innerHTML = '';

  const topFive = listings.slice(0, 5);
  if (!topFive.length) {
    const emptyCard = document.createElement('div');
    emptyCard.className = 'top5-card no-results';
    emptyCard.innerHTML = `
      <div class="card-details">
        <div class="card-price">No properties yet</div>
        <div class="card-address">Adjust filters to see matches</div>
      </div>
    `;
    heroTopFiveContainer.appendChild(emptyCard);
    return;
  }

  const fragment = document.createDocumentFragment();
  topFive.forEach((listing, index) => {
    const price = listing.price ? formatCurrency(listing.price) : 'Call for pricing';
    const features = [
      listing.beds ? `${listing.beds} bd` : null,
      listing.baths ? `${listing.baths} ba` : null,
      listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : null
    ].filter(Boolean).join(BULLET);

    const card = document.createElement('article');
    card.className = 'property-card';
    card.tabIndex = 0;
    card.setAttribute('data-listing-id', listing.id);

    const meta = [
      listing.beds ? `${listing.beds} bd` : null,
      listing.baths ? `${listing.baths} ba` : null,
      listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : null
    ].filter(Boolean).join(' • ');

    const dom = listing.daysOnMarket != null ? `<span class="card-dom">${listing.daysOnMarket} DOM</span>` : '';
    const background = listing.image ? `style="background-image:url('${listing.image}');"` : '';

    card.innerHTML = `
      <div class="property-image" ${background} aria-hidden="true">
        <p class="property-price">${price}</p>
      </div>
      <div class="property-details">
        <h3 class="property-address">${listing.address || `${listing.city}, ${listing.state}`}</h3>
        ${meta ? `<p class="property-features">${meta}</p>` : ''}
        <div class="property-meta">
          ${dom}
          <a class="property-link" href="${listing.url || '#'}" target="_blank" rel="noopener">View details</a>
        </div>
      </div>
    `;

    card.addEventListener('mouseenter', () => {
      state.map?.highlightListing(listing.id);
    });

    card.addEventListener('mouseleave', () => {
      state.map?.clearHighlight?.();
    });

    card.addEventListener('click', () => {
      state.map?.focusListing?.(listing.id);
    });

    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        state.map?.focusListing?.(listing.id);
      }
    });

    fragment.appendChild(card);
  });

  heroTopFiveContainer.appendChild(fragment);
}

function attachCardEvents() {
  if (!topTenGrid) return;

  topTenGrid.addEventListener('mouseover', event => {
    const card = event.target.closest('[data-listing-id]');
    if (!card) return;
    const id = card.getAttribute('data-listing-id');
    state.hoveredCardId = id;
    state.map?.highlightListing(id);
  });

  topTenGrid.addEventListener('focusin', event => {
    const card = event.target.closest('[data-listing-id]');
    if (!card) return;
    const id = card.getAttribute('data-listing-id');
    state.hoveredCardId = id;
    state.map?.highlightListing(id);
  });

  topTenGrid.addEventListener('mouseleave', () => {
    state.hoveredCardId = null;
    state.map?.clearHighlight?.();
  });

  topTenGrid.addEventListener('focusout', event => {
    if (topTenGrid.contains(event.relatedTarget)) return;
    state.hoveredCardId = null;
    state.map?.clearHighlight?.();
  });

  topTenGrid.addEventListener('click', event => {
    const card = event.target.closest('[data-listing-id]');
    if (!card) return;
    const id = card.getAttribute('data-listing-id');
    if (id) state.map?.focusListing?.(id);
  });
}

function enqueueFetch(resetPage = false) {
  if (resetPage) {
    state.filters.page = 1;
    state.listings = [];
    state.total = 0;
    state.hoveredCardId = null;
    state.usingPlaceholder = false;
    renderListings([]);
    setMapPlaceholderVisible(true);
  }

  updateUrl();
  if (state.debounceHandle) clearTimeout(state.debounceHandle);
  state.debounceHandle = setTimeout(() => fetchListings({ reset: resetPage }), REFRESH_DEBOUNCE_MS);
}

async function fetchListings({ reset = false, append = false } = {}) {
  if (state.loading) return;

  setLoading(true);
  clearError();

  if (reset) {
    state.listings = [];
    renderListings([]);
    setMapPlaceholderVisible(true);
  }

  const requestId = ++state.requestId;

  try {
    const result = await searchListings(state.filters);
    if (requestId !== state.requestId) return;

    const items = Array.isArray(result.items) ? result.items : [];
    const deduped = dedupeById(append ? state.listings.concat(items) : items);

    if (!deduped.length) {
      usePlaceholderListings();
      return;
    }

    state.usingPlaceholder = false;
    state.listings = deduped;
    state.total = result.total ?? deduped.length;

    state.map?.setListings(deduped);
    setMapPlaceholderVisible(!deduped.length);
    renderListings(deduped);
    updateSummary();
    toggleLoadMore(state.listings.length < state.total);
  } catch (error) {
    console.error(error);
    if (!state.listings.length) {
      usePlaceholderListings();
      return;
    }
    showError(error.message || 'Unable to load listings. Please try again.');
    toggleLoadMore(false);
    setMapPlaceholderVisible(!state.listings.length);
  } finally {
    setLoading(false);
  }
}

function toggleLoadMore(visible) {
  if (!loadMoreBtn) return;
  loadMoreBtn.hidden = !visible;
}

function initialiseMap() {
  const container = document.getElementById(mapContainerId);
  if (!container) return;

  try {
    state.map = initMap(mapContainerId, {
      onBoundsChange: bbox => {
        if (!bbox) return;
        state.filters = mergeFilters(state.filters, { bbox, page: 1 });
        enqueueFetch(false);
      },
      onMarkerClick: listing => {
        highlightFromMap(listing.id);
      },
      onMarkerHover: (listing, isActive) => {
        if (!listing) return;
        const card = topTenGrid?.querySelector(`[data-listing-id="${listing.id}"]`);
        if (card) {
          card.classList.toggle('is-hovered', isActive);
        }
      }
    });
  } catch (error) {
    console.warn('Leaflet unavailable. Falling back to static map mock.', error);
    state.map = createStaticMapFallback(container);
  }
}

function highlightFromMap(id) {
  if (!topTenGrid) return;
  const card = topTenGrid.querySelector(`[data-listing-id="${id}"]`);
  if (card) {
    card.classList.add('is-active');
    card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => card.classList.remove('is-active'), 1200);
  }
}

function initChat() {
  if (!chatForm || !chatInput) return;

  chatForm.addEventListener('submit', event => {
    event.preventDefault();
    const query = chatInput.value.trim();
    if (!query) return;

    appendChatMessage('user', query);
    chatInput.value = '';

    const parsed = parseUserQueryToFilters(query);
    if (!Object.keys(parsed).length) {
      appendChatMessage('assistant', "I couldn't understand that yet, but I'm learning. Try mentioning price, beds, baths, or must-haves.");
      return;
    }

    appendChatMessage('assistant', 'Updating your search...');
    state.filters = mergeFilters(state.filters, parsed);
    enqueueFetch(true);
  });
}

function appendChatMessage(role, text) {
  if (!chatMessages) return;
  const message = document.createElement('div');
  message.className = `chat-message chat-message--${role}`;
  message.textContent = text;
  chatMessages.appendChild(message);
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
}

function initLoadMore() {
  if (!loadMoreBtn) return;
  loadMoreBtn.addEventListener('click', () => {
    state.filters.page = (state.filters.page || 1) + 1;
    enqueueFetch(false);
  });
}

function initRetry() {
  // Button changed to "Book a Showing" link - no longer needs retry functionality
  // if (!retryBtn) return;
  // retryBtn.addEventListener('click', () => {
  //   enqueueFetch(false);
  // });
}

function hydrateFilters() {
  const fromUrl = getFiltersFromUrl();
  const fromSession = getFiltersFromSession();
  const merged = mergeFilters(fromSession, fromUrl);
  if (!merged.sort) merged.sort = 'newest';
  state.filters = merged;
  updateSummary();
}

function usePlaceholderListings() {
  state.usingPlaceholder = true;
  state.listings = PLACEHOLDER_LISTINGS.map(listing => ({ ...listing }));
  state.total = state.listings.length;
  state.map?.setListings(state.listings);
  setMapPlaceholderVisible(false);
  renderListings(state.listings);
  updateSummary();
  toggleLoadMore(false);
  clearError();
  showPlaceholderNotice();
}

function showPlaceholderNotice() {
  if (state.placeholderNoticeShown) return;
  state.placeholderNoticeShown = true;
  appendChatMessage('assistant', 'Showing sample listings while we finish wiring the live MLS feed.');
}

function initialiseSearchPage() {
  hydrateFilters();
  initialiseMap();
  initChat();
  initLoadMore();
  initRetry();
  attachCardEvents();
  enqueueFetch(true);
}

if (document.readyState !== 'loading') {
  initialiseSearchPage();
} else {
  document.addEventListener('DOMContentLoaded', initialiseSearchPage);
}

function createStaticMapFallback(container) {
  container.innerHTML = '';
  container.classList.add('static-map');
  const layer = document.createElement('div');
  layer.className = 'static-map__layer';
  layer.setAttribute('role', 'presentation');
  container.appendChild(layer);

  const markerIndex = new Map();

  function computeBounds(listings) {
    const latitudes = listings.filter(item => item.lat != null).map(item => item.lat);
    const longitudes = listings.filter(item => item.lng != null).map(item => item.lng);
    if (!latitudes.length || !longitudes.length) {
      return {
        minLat: 33.4,
        maxLat: 33.8,
        minLng: -118.1,
        maxLng: -117.6
      };
    }
    return {
      minLat: Math.min(...latitudes),
      maxLat: Math.max(...latitudes),
      minLng: Math.min(...longitudes),
      maxLng: Math.max(...longitudes)
    };
  }

  function clampPercent(value, min = 4, max = 96) {
    return Math.min(max, Math.max(min, value));
  }

  function setListings(listings = []) {
    layer.innerHTML = '';
    markerIndex.clear();
    if (!listings.length) return;

    const bounds = computeBounds(listings);
    const latRange = Math.max(0.00001, bounds.maxLat - bounds.minLat);
    const lngRange = Math.max(0.00001, bounds.maxLng - bounds.minLng);

    listings.forEach(listing => {
      if (listing.lat == null || listing.lng == null) return;

      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'listing-marker static-map__marker';

      let leftPercent = ((listing.lng - bounds.minLng) / lngRange) * 100;
      let topPercent = ((bounds.maxLat - listing.lat) / latRange) * 100;

      const yNorm = clampPercent(topPercent, 4, 96) / 100;
      const coastlinePercent = 36 + yNorm * 22;

      if (Number.isFinite(leftPercent) && !Number.isNaN(leftPercent)) {
        leftPercent = Math.max(leftPercent, coastlinePercent);
      } else {
        leftPercent = coastlinePercent;
      }

      leftPercent = clampPercent(leftPercent, Math.max(coastlinePercent + 2, 6), 94);
      topPercent = clampPercent(topPercent);
      marker.style.left = `${leftPercent}%`;
      marker.style.top = `${topPercent}%`;

      const price = listing.price ? formatCurrency(listing.price) : 'Call for pricing';
      const meta = [
        listing.beds ? `${listing.beds} bd` : null,
        listing.baths ? `${listing.baths} ba` : null,
        listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : null
      ].filter(Boolean).join(BULLET);

      const previewImage = listing.image || PREVIEW_PLACEHOLDER;

      marker.innerHTML = `
        <span class="listing-marker__icon" aria-hidden="true"></span>
        <div class="static-map__preview">
          <img class="tooltip-card__image" src="${previewImage}" alt="${listing.address || 'Property preview'}" loading="lazy" />
          <div class="static-map__preview-body">
            <p class="tooltip-card__price">${price}</p>
            <p class="tooltip-card__address">${listing.address || `${listing.city}, ${listing.state}`}</p>
            ${meta ? `<p class="tooltip-card__meta">${meta}</p>` : ''}
          </div>
        </div>
      `;

      marker.addEventListener('mouseenter', () => highlightListing(listing.id));
      marker.addEventListener('focus', () => highlightListing(listing.id));
      marker.addEventListener('mouseleave', () => clearHighlight());
      marker.addEventListener('blur', () => clearHighlight());
      marker.addEventListener('click', () => {
        if (listing.url && listing.url !== '#') {
          window.open(listing.url, '_blank', 'noopener');
        }
      });

      layer.appendChild(marker);
      markerIndex.set(listing.id, marker);
    });
  }

  function highlightListing(id) {
    markerIndex.forEach((marker, listingId) => {
      if (listingId === id) {
        marker.classList.add('listing-marker--active');
      } else {
        marker.classList.remove('listing-marker--active');
      }
    });
  }

  function clearHighlight() {
    markerIndex.forEach(marker => marker.classList.remove('listing-marker--active'));
  }

  function focusListing(id) {
    const marker = markerIndex.get(id);
    if (marker) {
      highlightListing(id);
      marker.focus({ preventScroll: false });
    }
  }

  return {
    setListings,
    highlightListing,
    clearHighlight,
    focusListing
  };
}
