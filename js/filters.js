/**
 * Utility helpers for parsing and serialising property search filters.
 * These helpers stay framework-agnostic so they can be reused across
 * the homepage chatbot, search page, and future native apps.
 */

const NUMBER_TOKEN = /(\d+(?:[\.,]\d+)?)(\s*(m|k|million|thousand))?/i;

const PROPERTY_TYPE_KEYWORDS = [
  { token: /single\s*family|house|detached/i, value: 'house' },
  { token: /condo|minium/i, value: 'condo' },
  { token: /town\s*home|town\s*house/i, value: 'townhome' },
  { token: /duplex/i, value: 'duplex' },
  { token: /loft/i, value: 'loft' },
  { token: /land|lot/i, value: 'land' }
];

/**
 * Convert a price string such as "1.2m" or "850k" to a number.
 */
function normaliseNumber(rawNumber, unit = '') {
  if (!rawNumber) return undefined;
  const sanitised = parseFloat(String(rawNumber).replace(/,/g, '.'));
  if (Number.isNaN(sanitised)) return undefined;

  const multiplier = (() => {
    const token = (unit || '').toLowerCase();
    if (token.startsWith('m')) return 1_000_000;
    if (token.startsWith('k') || token.includes('thousand')) return 1_000;
    return 1;
  })();

  return Math.round(sanitised * multiplier);
}

/**
 * Attempt to parse a human sentence into structured filters.
 */
export function parseUserQueryToFilters(input = '') {
  if (!input || typeof input !== 'string') return {};

  const text = input.trim();
  if (!text) return {};

  const filters = {};
  const lower = text.toLowerCase();

  // Price ceilings (e.g. "under 1.2m", "max 950k")
  const maxPriceMatch = lower.match(/(?:under|below|max(?:imum)?|<=?|up to)\s*\$?\s*([\d\.,]+)\s*(m|k|million|thousand)?/);
  if (maxPriceMatch) {
    filters.maxPrice = normaliseNumber(maxPriceMatch[1], maxPriceMatch[2]);
  }

  // Price floors (e.g. "above 800k", "minimum 1.3M")
  const minPriceMatch = lower.match(/(?:over|above|min(?:imum)?|>=?)\s*\$?\s*([\d\.,]+)\s*(m|k|million|thousand)?/);
  if (minPriceMatch) {
    filters.minPrice = normaliseNumber(minPriceMatch[1], minPriceMatch[2]);
  }

  // Beds / baths "3+ beds", "2 bath"
  const bedsMatch = lower.match(/(\d+)\s*\+?\s*(?:bed|bd|br|bedroom)s?/);
  if (bedsMatch) {
    filters.beds = Number.parseInt(bedsMatch[1], 10);
  }

  const bathsMatch = lower.match(/(\d+)\s*\+?\s*(?:bath|ba|bathroom)s?/);
  if (bathsMatch) {
    filters.baths = Number.parseInt(bathsMatch[1], 10);
  }

  // Square footage "over 1500 sqft"
  const sqftMatch = lower.match(/(?:over|above|min(?:imum)?|at least)?\s*([\d,\.]+)\s*(?:sq\s*ft|square\s*feet|sf)/);
  if (sqftMatch) {
    filters.minSqft = normaliseNumber(sqftMatch[1]);
  }

  // HOA maximum
  const hoaMatch = lower.match(/hoa (?:fees?|dues?)\s*(?:under|below|<=?)\s*\$?\s*([\d\.,]+)/);
  if (hoaMatch) {
    filters.maxHOA = normaliseNumber(hoaMatch[1]);
  }

  // Year built "after 2015"
  const yearMatch = lower.match(/(?:built|after)\s*(?:in\s*)?((?:19|20)\d{2})/);
  if (yearMatch) {
    filters.minYear = Number.parseInt(yearMatch[1], 10);
  }

  if (/pool/i.test(text)) filters.hasPool = true;
  if (/\b(view|ocean view|coastal view|city view)\b/i.test(text)) filters.hasView = true;

  // Sort preferences
  if (/(newest|latest)/i.test(text)) {
    filters.sort = 'newest';
  } else if (/low(?:est)? price|cheapest|price asc/i.test(text)) {
    filters.sort = 'priceAsc';
  } else if (/high(?:est)? price|price desc/i.test(text)) {
    filters.sort = 'priceDesc';
  }

  // Property type detection
  const propertyTypes = PROPERTY_TYPE_KEYWORDS
    .filter(entry => entry.token.test(text))
    .map(entry => entry.value);
  if (propertyTypes.length) {
    filters.propertyType = Array.from(new Set(propertyTypes));
  }

  // Quick extraction for comma separated locations / free text
  const locationPieces = text
    .split(/[,;]+/)
    .map(piece => piece.trim())
    .filter(piece => piece && !NUMBER_TOKEN.test(piece) && !/(bed|bath|pool|price|hoa|view|min|max|under|over|above|newest|latest|cheap|expensive|sq|sf|built|year|condo|house|townhome|duplex|loft|land)/i.test(piece));

  if (locationPieces.length) {
    filters.q = locationPieces.join(', ');
  } else if (!filters.q && !maxPriceMatch && !minPriceMatch) {
    // As a fallback, keep the entire query for backend fuzzy match.
    filters.q = text;
  }

  return filters;
}

export function filtersToQueryString(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(','));
    } else if (typeof value === 'boolean') {
      params.set(key, value ? 'true' : 'false');
    } else if (key === 'bbox' && Array.isArray(value) && value.length === 4) {
      params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

export function mergeFilters(base = {}, patch = {}) {
  const merged = { ...base };
  Object.entries(patch).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      merged[key] = value.slice();
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = { ...(base[key] || {}), ...value };
    } else {
      merged[key] = value;
    }
  });
  return merged;
}

export function getFiltersFromUrl(search = (typeof window !== 'undefined' ? window.location.search : '')) {
  const params = new URLSearchParams(search);
  const filters = {};

  if (params.get('q')) filters.q = params.get('q');
  if (params.get('minPrice')) filters.minPrice = Number(params.get('minPrice'));
  if (params.get('maxPrice')) filters.maxPrice = Number(params.get('maxPrice'));
  if (params.get('beds')) filters.beds = Number(params.get('beds'));
  if (params.get('baths')) filters.baths = Number(params.get('baths'));
  if (params.get('minSqft')) filters.minSqft = Number(params.get('minSqft'));
  if (params.get('maxHOA')) filters.maxHOA = Number(params.get('maxHOA'));
  if (params.get('minYear')) filters.minYear = Number(params.get('minYear'));
  if (params.get('sort')) filters.sort = params.get('sort');
  if (params.get('page')) filters.page = Number(params.get('page'));

  if (params.has('hasPool')) filters.hasPool = params.get('hasPool') === 'true';
  if (params.has('hasView')) filters.hasView = params.get('hasView') === 'true';

  if (params.get('propertyType')) {
    filters.propertyType = params.get('propertyType').split(',').map(part => part.trim()).filter(Boolean);
  }

  if (params.get('bbox')) {
    const raw = params.get('bbox').split(',').map(parseFloat);
    if (raw.length === 4 && raw.every(num => !Number.isNaN(num))) {
      filters.bbox = raw;
    }
  }

  return filters;
}

export function filtersToSession(filters) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem('searchFilters', JSON.stringify(filters));
  } catch (error) {
    console.warn('Failed to persist search filters to sessionStorage', error);
  }
}

export function getFiltersFromSession() {
  if (typeof sessionStorage === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem('searchFilters');
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('Failed to read search filters from sessionStorage', error);
    return {};
  }
}
