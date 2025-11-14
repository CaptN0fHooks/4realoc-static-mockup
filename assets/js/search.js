// search.js
console.log("search.js loaded");

// Read data sent from index.html
const filters = JSON.parse(sessionStorage.getItem("aiSearchFilters") || "{}");
const idxUrl = sessionStorage.getItem("aiIdxUrl");

// Helper: capitalize each word
function capitalizeWords(str) {
  if (!str) return "";
  return str
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

// Helper: format price as ≤ $3M / ≤ $900k etc.
function formatMaxPrice(num) {
  if (!num || isNaN(num)) return null;
  const n = Number(num);
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `≤ $${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (n >= 1000) {
    const k = n / 1000;
    return `≤ $${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `≤ $${n.toLocaleString()}`;
}

// Update IDX iframe if provided
if (idxUrl) {
  const iframe = document.getElementById("idx-frame");
  if (iframe) {
    iframe.src = idxUrl;
    console.log("IDX URL loaded into iframe:", idxUrl);
  }
}

// Update header title / subtitle
const headerTitle = document.querySelector(".search-title");
const headerSubtitle = document.querySelector(".search-subtitle");

if (filters && headerTitle) {
  if (filters.raw_query) {
    headerTitle.textContent = "Your Matches For:";
    if (headerSubtitle) {
      headerSubtitle.textContent = filters.raw_query;
    }
  } else {
    headerTitle.textContent = "Your Property Matches";
  }
}

// Build the summary line: City • ≤ $3M • 3+ Beds • Ocean View
const summaryEl = document.getElementById("searchFiltersSummary");
if (summaryEl && filters) {
  const parts = [];

  // City (first one only for now)
  if (Array.isArray(filters.cities) && filters.cities.length > 0) {
    const city = capitalizeWords(filters.cities[0]);
    parts.push(city);
  }

  // Max price
  if (filters.max_price) {
    const priceLabel = formatMaxPrice(filters.max_price);
    if (priceLabel) parts.push(priceLabel);
  }

  // Bedrooms
  if (filters.min_beds) {
    parts.push(`${filters.min_beds}+ Beds`);
  }

  // Features (only show a couple)
  const features = Array.isArray(filters.features) ? filters.features : [];
  const featureLabels = [];

  if (features.includes("ocean_view")) featureLabels.push("Ocean View");
  else if (features.includes("view")) featureLabels.push("View");

  if (features.includes("pool")) featureLabels.push("Pool");
  if (features.includes("gated")) featureLabels.push("Gated");
  if (features.includes("garage")) featureLabels.push("Garage");

  featureLabels.forEach((label) => parts.push(label));

  if (parts.length > 0) {
    summaryEl.textContent = parts.join("   •   ");
  } else {
    summaryEl.textContent = "";
  }
}

console.log("Filters received:", filters);

// --- Filter mock curated listings ---
let curatedResults = window.featuredMockListings || [];

if (filters.cities && filters.cities.length > 0) {
  curatedResults = curatedResults.filter(listing =>
    filters.cities.some(city =>
      listing.address.toLowerCase().includes(city.toLowerCase())
    )
  );
}

if (filters.max_price) {
  curatedResults = curatedResults.filter(listing =>
    listing.price <= filters.max_price
  );
}

if (filters.min_beds) {
  curatedResults = curatedResults.filter(listing =>
    listing.beds >= filters.min_beds
  );
}

if (filters.features && filters.features.length > 0) {
  curatedResults = curatedResults.filter(listing =>
    filters.features.some(f => listing.features.includes(f))
  );
}

console.log("Curated matches:", curatedResults);

// Render tile cards into curated-tiles container
const tilesEl = document.getElementById("curated-tiles");

if (tilesEl) {
  tilesEl.innerHTML = ""; // clear placeholders

  if (curatedResults.length === 0) {
    tilesEl.innerHTML = `<div class="listing-card-placeholder">No curated listings match these filters yet.</div>`;
  } else {
    curatedResults.forEach(listing => {
      const card = document.createElement("div");
      card.className = "listing-card-placeholder";
      card.innerHTML = `
        <span>
          <strong>${listing.address}</strong><br>
          $${listing.price.toLocaleString()} • ${listing.beds} bd • ${listing.baths} ba • ${listing.sqft} sqft
        </span>
        <span>View</span>
      `;
      tilesEl.appendChild(card);
    });
  }
}

// --- Initialize Leaflet Map ---
const mapContainer = document.getElementById("curated-map");
if (mapContainer && curatedResults.length > 0 && typeof L !== "undefined") {
  // Clear placeholder text
  mapContainer.innerHTML = "";

  // Set default center (Laguna / Newport region)
  const map = L.map("curated-map").setView([33.55, -117.78], 12);

  // Base tiles (clean, minimal)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);

  // Create markers ONCE, with popups, and reuse them for fitBounds
  const markers = [];

  curatedResults.forEach((listing) => {
    if (listing.latitude && listing.longitude) {
      const marker = L.marker([listing.latitude, listing.longitude])
        .addTo(map)
        .bindPopup(
          `<strong>${listing.address}</strong><br>
          $${listing.price.toLocaleString()}<br>
          ${listing.beds} bd • ${listing.baths} ba`
        );

      markers.push(marker);
    }
  });

  // Auto-fit map to those same markers
  if (markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.25));
  }
} else {
  if (!mapContainer) console.warn("No #curated-map container found");
  if (!curatedResults.length) console.warn("No curated results to map");
  if (typeof L === "undefined") console.warn("Leaflet (L) is not defined");
}
