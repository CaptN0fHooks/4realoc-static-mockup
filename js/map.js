/**
 * Lightweight Leaflet wrapper that keeps map state and marker wiring
 * contained in one place. Consumers interact through the returned
 * instance methods (setListings, highlightListing, etc.).
 */

const DEFAULT_CENTER = [33.615, -117.9];
const DEFAULT_ZOOM = 11;

const HOUSE_ICON_HTML = '<span class="listing-marker__icon" aria-hidden="true"></span>';

function ensureLeaflet() {
  if (typeof L === 'undefined') {
    throw new Error('Leaflet library not loaded. Ensure leaflet.js is included before map.js');
  }
}

function toBbox(bounds) {
  if (!bounds) return null;
  return [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth()
  ];
}

export function initMap(containerId, callbacks = {}) {
  ensureLeaflet();
  const { onBoundsChange, onMarkerClick, onMarkerHover } = callbacks;

  const map = L.map(containerId, {
    zoomControl: false,
    attributionControl: true,
    preferCanvas: true
  }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
  }).addTo(map);

  const markerLayer = L.layerGroup().addTo(map);
  const markerIndex = new Map();

  const defaultMarkerIcon = L.divIcon({
    className: 'listing-marker',
    html: HOUSE_ICON_HTML,
    iconSize: [32, 32],
    iconAnchor: [16, 28],
    tooltipAnchor: [0, -28],
    popupAnchor: [0, -30]
  });

  const highlightClass = 'listing-marker--active';

  function clearMarkers() {
    markerLayer.clearLayers();
    markerIndex.clear();
  }

  function buildPopup(listing) {
    const price = listing.price ? `\$${listing.price.toLocaleString()}` : 'Price on request';
    const meta = [
      listing.beds ? `${listing.beds} bed${listing.beds > 1 ? 's' : ''}` : null,
      listing.baths ? `${listing.baths} bath${listing.baths > 1 ? 's' : ''}` : null,
      listing.sqft ? `${listing.sqft.toLocaleString()} sq ft` : null
    ].filter(Boolean).join(' \u2022 ');

    const daysOnMarket = listing.daysOnMarket != null ? `<span class="map-popup__dom">${listing.daysOnMarket} days on market</span>` : '';
    const image = listing.image ? `<img class="map-popup__img" src="${listing.image}" alt="${listing.address} exterior photo" loading="lazy" />` : '';

    const link = listing.url ? `<a class="map-popup__link" href="${listing.url}" target="_blank" rel="noopener">View details</a>` : '';

    return `
      <div class="map-popup">
        ${image}
        <div class="map-popup__body">
          <p class="map-popup__price">${price}</p>
          <p class="map-popup__address">${listing.address}</p>
          ${meta ? `<p class="map-popup__meta">${meta}</p>` : ''}
          ${daysOnMarket}
          ${link}
          <p class="map-popup__disclaimer">Listing data courtesy of respective listing agents/brokerages.</p>
        </div>
      </div>
    `;
  }

  function setListings(listings = []) {
    clearMarkers();
    listings.forEach(listing => {
      if (listing.lat == null || listing.lng == null) return;
      const marker = L.marker([listing.lat, listing.lng], { icon: defaultMarkerIcon, interactive: true });
      marker.on('mouseover', () => {
        marker.getElement()?.classList.add(highlightClass);
        if (onMarkerHover) onMarkerHover(listing, true);
      });
      marker.on('mouseout', () => {
        if (!highlightId || highlightId !== listing.id) {
          marker.getElement()?.classList.remove(highlightClass);
        }
        if (onMarkerHover) onMarkerHover(listing, false);
      });
      marker.on('click', () => {
        marker.bindPopup(buildPopup(listing), { maxWidth: 320 }).openPopup();
        if (onMarkerClick) onMarkerClick(listing);
      });
      marker.bindTooltip(buildTooltip(listing), {
        direction: 'top',
        offset: [0, -20],
        sticky: true,
        className: 'map-preview-tooltip'
      });
      marker.addTo(markerLayer);
      markerIndex.set(listing.id, marker);
    });

    if (listings.length) {
      const bounds = L.latLngBounds(listings.filter(listing => listing.lat != null && listing.lng != null).map(listing => [listing.lat, listing.lng]));
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.15), { animate: true });
      }
    }
  }

  let boundsDebounce = null;
  map.on('moveend', () => {
    if (!onBoundsChange) return;
    if (boundsDebounce) cancelAnimationFrame(boundsDebounce);
    boundsDebounce = requestAnimationFrame(() => {
      const bbox = toBbox(map.getBounds());
      onBoundsChange(bbox);
    });
  });

  let highlightId = null;
  function highlightListing(id) {
    highlightId = id;
    markerIndex.forEach((marker, listingId) => {
      const element = marker.getElement();
      if (!element) return;
      if (listingId === id) {
        element.classList.add(highlightClass);
        marker.bringToFront();
      } else {
        element.classList.remove(highlightClass);
      }
    });
  }

  function clearHighlight() {
    highlightId = null;
    markerIndex.forEach(marker => {
      marker.getElement()?.classList.remove(highlightClass);
    });
  }

  function focusListing(id) {
    const marker = markerIndex.get(id);
    if (marker) {
      marker.openPopup();
      map.panTo(marker.getLatLng(), { animate: true });
    }
  }

  return {
    setListings,
    getCurrentBbox: () => toBbox(map.getBounds()),
    highlightListing,
    clearHighlight,
    focusListing
  };
}

function buildTooltip(listing) {
  const price = listing.price ? `\$${listing.price.toLocaleString()}` : 'Price on request';
  const meta = [
    listing.beds ? `${listing.beds} bd` : null,
    listing.baths ? `${listing.baths} ba` : null,
    listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : null
  ].filter(Boolean).join(' \u2022 ');

  return `
    <article class="tooltip-card">
      <p class="tooltip-card__price">${price}</p>
      <p class="tooltip-card__address">${listing.address || 'Orange County, CA'}</p>
      ${meta ? `<p class="tooltip-card__meta">${meta}</p>` : ''}
    </article>
  `;
}
