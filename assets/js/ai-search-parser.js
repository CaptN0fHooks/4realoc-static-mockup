// Turns a plain English search into simple filters we can use server-side.
// Example: "Laguna Beach ocean view home under 3m with pool 3 beds"

(function (global) {
  // These are the cities we care about for now.
  // If the text includes these words, we treat them as target areas.
  var KNOWN_CITIES = [
    'laguna beach',
    'newport beach',
    'newport coast',
    'corona del mar',
    'huntington beach',
    'dana point',
    'seal beach',
    'costa mesa',
    'irvine'
  ];

  // Simple keywords that tell us what features they want.
  var FEATURE_KEYWORDS = {
    pool: ['pool'],
    ocean_view: ['ocean view', 'oceanview', 'sea view', 'water view'],
    garage: ['garage'],
    new_construction: ['new build', 'new construction', 'brand new'],
    gated: ['gated', 'guard gated'],
    beachfront: ['on the sand', 'beachfront', 'on the beach'],
    view: ['view', 'harbor view', 'city view']
  };

  // Turn things like "1.2m" or "900k" into actual numbers.
  function toNumber(numStr, unit) {
    var n = parseFloat(numStr.replace(/,/g, ''));
    if (isNaN(n)) return null;
    if (!unit) return n;
    unit = unit.toLowerCase();
    if (unit === 'm' || unit === 'million') return n * 1000000;
    if (unit === 'k' || unit === 'thousand') return n * 1000;
    return n;
  }

  // Look for price hints: "under 2m", "below 1.5m", "over 900k", etc.
  function parsePrice(text) {
    var lower = text.toLowerCase();

    var maxMatch =
      lower.match(/(under|below)\s+([\d.,]+)\s*(m|million|k|thousand)?/) || null;

    var minMatch =
      lower.match(/(over|above)\s+([\d.,]+)\s*(m|million|k|thousand)?/) || null;

    var maxPrice = maxMatch ? toNumber(maxMatch[2], maxMatch[3]) : null;
    var minPrice = minMatch ? toNumber(minMatch[2], minMatch[3]) : null;

    // If we don't see "under/below", but we see "$1.5m", treat that as a soft max.
    if (!maxPrice) {
      var any = lower.match(/\$?\s*([\d.,]+)\s*(m|million|k|thousand)/);
      if (any) maxPrice = toNumber(any[1], any[2]);
    }

    return {
      minPrice: minPrice || null,
      maxPrice: maxPrice || null
    };
  }

  // Look for "3 bed", "4 beds", "3br", etc. Use as minimum beds.
  function parseBeds(text) {
    var lower = text.toLowerCase();
    var match = lower.match(/(\d+)\s*(\+)?\s*(bed|beds|br|bdrm)/);
    if (!match) return null;
    var beds = parseInt(match[1], 10);
    if (isNaN(beds)) return null;
    return beds;
  }

  // See which of our known cities are mentioned.
  function parseCities(text) {
    var lower = text.toLowerCase();
    var cities = [];
    KNOWN_CITIES.forEach(function (city) {
      if (lower.indexOf(city) !== -1) {
        cities.push(city);
      }
    });
    return cities;
  }

  // Check which feature keywords appear.
  function parseFeatures(text) {
    var lower = text.toLowerCase();
    var features = [];
    Object.keys(FEATURE_KEYWORDS).forEach(function (key) {
      var words = FEATURE_KEYWORDS[key];
      for (var i = 0; i < words.length; i++) {
        if (lower.indexOf(words[i]) !== -1) {
          features.push(key);
          break;
        }
      }
    });
    // Remove duplicates.
    return Array.from(new Set(features));
  }

  // Main function everyone else will use.
  function parseAiSearchQuery(query) {
    if (!query || typeof query !== 'string') {
      return {
        text: '',
        minPrice: null,
        maxPrice: null,
        minBeds: null,
        cities: [],
        features: []
      };
    }

    var price = parsePrice(query);
    var beds = parseBeds(query);
    var cities = parseCities(query);
    var features = parseFeatures(query);

    return {
      text: query.trim(),
      minPrice: price.minPrice,
      maxPrice: price.maxPrice,
      minBeds: beds || null,
      cities: cities,
      features: features
    };
  }

  // Expose this so search-results.js (and others) can call it.
  global.parseAiSearchQuery = parseAiSearchQuery;
})(window);
