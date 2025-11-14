// ai-search-parser.js
console.log("ai-search-parser.js loaded");

// VERY lightweight parser (no API calls yet)
// We'll upgrade this later with OpenAI for deeper intelligence.

window.parseAiSearchQuery = function (text) {
  if (!text || typeof text !== "string") {
    return { raw_query: text };
  }

  const lower = text.toLowerCase();

  const data = {
    raw_query: text,
    cities: [],
    min_price: null,
    max_price: null,
    min_beds: null,
    features: []
  };

  // --- Find cities (simple version) ---
  const knownCities = [
    "laguna beach",
    "newport beach",
    "newport coast",
    "huntington beach",
    "irvine",
    "costa mesa",
    "aliso viejo",
    "dana point",
    "san clemente"
  ];

  knownCities.forEach(city => {
    if (lower.includes(city)) {
      data.cities.push(city);
    }
  });

  // --- Price detection ---
  const priceMatch = lower.match(/\$?([\d,.]+)\s*m/);
  if (priceMatch) {
    const num = parseFloat(priceMatch[1].replace(/,/g, ""));
    if (!isNaN(num)) {
      data.max_price = num * 1_000_000;
    }
  }

  // Also catch things like "under 900k"
  const underK = lower.match(/under\s+([\d,.]+)\s*k/);
  if (underK) {
    data.max_price = parseFloat(underK[1]) * 1000;
  }

  // --- Bedrooms detection ---
  const bedMatch = lower.match(/(\d+)\+?\s*beds?/);
  if (bedMatch) {
    data.min_beds = parseInt(bedMatch[1], 10);
  }

  // --- Features ---
  if (lower.includes("ocean view")) data.features.push("ocean_view");
  if (lower.includes("view")) data.features.push("view");
  if (lower.includes("pool")) data.features.push("pool");
  if (lower.includes("gated")) data.features.push("gated");
  if (lower.includes("garage")) data.features.push("garage");

  return data;
};
