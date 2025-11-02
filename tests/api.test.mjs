import assert from 'node:assert/strict';
import { searchListings, normalizeListing } from '../js/api.js';

const samplePayload = {
  items: [{
    id: 'OC123',
    price: 985000,
    address: '1 Coastline Dr',
    city: 'Laguna Beach',
    state: 'CA',
    postalCode: '92651',
    beds: 3,
    baths: 2,
    sqft: 1820,
    lat: 33.542,
    lng: -117.785,
    image: 'https://example.com/photo.jpg',
    daysOnMarket: 12,
    url: 'https://example.com/listing/OC123'
  }],
  total: 42,
  page: 1,
  pageSize: 20
};

global.fetch = async (requestUrl) => {
  assert.ok(
    String(requestUrl).includes('/api/website_search'),
    'API client should call the local proxy endpoint'
  );

  return {
    ok: true,
    json: async () => samplePayload
  };
};

const results = await searchListings({ minPrice: 500000, beds: 3 });
assert.equal(results.items.length, 1, 'searchListings should return items from payload');
assert.equal(results.total, 42, 'searchListings should return total');
assert.equal(results.items[0].id, 'OC123', 'searchListings should normalise listing id');

const listing = normalizeListing({
  price: 1000000,
  address: '100 Oceanfront',
  city: 'Newport Beach',
  state: 'CA',
  beds: 4,
  baths: 3,
  lat: 33.6,
  lng: -117.9
});

assert.equal(listing.address, '100 Oceanfront, Newport Beach, CA', 'normalizeListing should produce combined address');
assert.equal(listing.price, 1000000, 'normalizeListing preserves price');

console.log('api.test.mjs passed');
