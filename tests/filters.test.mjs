import assert from 'node:assert/strict';
import {
  parseUserQueryToFilters,
  filtersToQueryString,
  mergeFilters
} from '../js/filters.js';

const parsed = parseUserQueryToFilters('HB or Newport, under 1.2M, 3+ beds, pool');
assert.equal(parsed.maxPrice, 1200000, 'maxPrice should parse million shorthand');
assert.equal(parsed.beds, 3, 'beds should parse numeric filter');
assert.equal(parsed.hasPool, true, 'hasPool should flag pool preference');
assert.equal(parsed.q, 'HB or Newport', 'q should capture location fragment');

const merged = mergeFilters(parsed, { baths: 2 });
assert.equal(merged.baths, 2, 'mergeFilters should merge new keys');
assert.equal(merged.maxPrice, 1200000, 'mergeFilters preserves existing keys');

const queryString = filtersToQueryString(merged);
assert.ok(queryString.includes('maxPrice=1200000'), 'filtersToQueryString serialises numeric values');
assert.ok(queryString.includes('beds=3'), 'filtersToQueryString includes beds');
assert.ok(queryString.includes('baths=2'), 'filtersToQueryString includes baths');

console.log('filters.test.mjs passed');
