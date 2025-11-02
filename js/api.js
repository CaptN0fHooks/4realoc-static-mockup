/**
 * Thin API client for the search proxy. The browser never touches the
 * Repliers API directly �?” the proxy injects credentials and ensures
 * we can iterate on request/response mapping without updating clients.
 */

import { filtersToQueryString } from './filters.js';

const API_ENDPOINT = '/api/website_search';
const DEFAULT_PAGE_SIZE = 20;

export function normalizeListing(raw) {
  if (!raw) return null;
  const fallbackId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `listing-${Math.random().toString(36).slice(2)}`;
  };
  return {
    id: raw.id ?? raw.listingId ?? raw.mlsNumber ?? fallbackId(),
    price: Number(raw.price || raw.listPrice || 0),
    address: [raw.address, raw.city, raw.state].filter(Boolean).join(', '),
    city: raw.city || '',
    state: raw.state || '',
    postalCode: raw.postalCode || raw.zip || '',
    beds: raw.beds ?? raw.bedrooms ?? null,
    baths: raw.baths ?? raw.bathrooms ?? null,
    sqft: raw.sqft ?? raw.squareFeet ?? null,
    lat: raw.lat ?? raw.latitude ?? null,
    lng: raw.lng ?? raw.longitude ?? null,
    image: Array.isArray(raw.images) && raw.images.length ? raw.images[0] : raw.image || null,
    daysOnMarket: raw.daysOnMarket ?? raw.dom ?? null,
    url: raw.url || raw.listingUrl || '#'
  };
}

function ensurePageDefaults(filters = {}) {
  const next = { ...filters };
  if (!next.page) next.page = 1;
  if (!next.pageSize) next.pageSize = DEFAULT_PAGE_SIZE;
  return next;
}

export async function searchListings(filters = {}) {
  const params = filtersToQueryString(ensurePageDefaults(filters));
  const endpoint = `${API_ENDPOINT}?${params}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Search request failed: ${response.status} ${errorText}`);
    }

    const payload = await response.json();
    const items = Array.isArray(payload.items) ? payload.items.map(normalizeListing).filter(Boolean) : [];

    return {
      items,
      total: payload.total ?? items.length,
      page: payload.page ?? filters.page ?? 1,
      pageSize: payload.pageSize ?? filters.pageSize ?? DEFAULT_PAGE_SIZE
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
