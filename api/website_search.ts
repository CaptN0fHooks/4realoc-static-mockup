import type { VercelRequest, VercelResponse } from '@vercel/node';

const REPLIERS_ENDPOINT = 'https://api.repliers.io/v1/website_search';
const ALLOWED_PARAMS = [
  'q',
  'minPrice',
  'maxPrice',
  'beds',
  'baths',
  'propertyType',
  'minSqft',
  'maxHOA',
  'minYear',
  'hasPool',
  'hasView',
  'page',
  'pageSize',
  'bbox',
  'sort'
];

function mapQueryParams(query: VercelRequest['query']): URLSearchParams {
  const params = new URLSearchParams();

  for (const key of ALLOWED_PARAMS) {
    const value = query[key];
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      value.forEach(item => {
        if (item !== undefined) params.append(key, String(item));
      });
    } else {
      params.append(key, String(value));
    }
  }

  // Backwards compatible aliases (min_price, max_price, etc.)
  if (!params.has('minPrice') && typeof query.min_price === 'string') {
    params.append('minPrice', query.min_price);
  }
  if (!params.has('maxPrice') && typeof query.max_price === 'string') {
    params.append('maxPrice', query.max_price);
  }

  return params;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.REPLIERS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'REPLIERS_API_KEY is not configured' });
  }

  const upstreamUrl = new URL(REPLIERS_ENDPOINT);
  const params = mapQueryParams(req.query);

  if (!params.has('page')) params.set('page', '1');
  if (!params.has('pageSize')) params.set('pageSize', '20');

  params.forEach((value, key) => {
    upstreamUrl.searchParams.append(key, value);
  });

  try {
    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json'
      }
    });

    const payload = await upstreamResponse.json().catch(() => ({}));

    if (!upstreamResponse.ok) {
      return res.status(upstreamResponse.status).json({
        error: payload?.message || 'Upstream request failed'
      });
    }

    return res.status(200).json({
      items: payload?.items ?? payload?.listings ?? [],
      total: payload?.total ?? payload?.totalResults ?? 0,
      page: payload?.page ?? Number(params.get('page') ?? 1),
      pageSize: payload?.pageSize ?? Number(params.get('pageSize') ?? 20)
    });
  } catch (error: any) {
    console.error('Repliers proxy error', error);
    return res.status(502).json({ error: 'Failed to reach Repliers API' });
  }
}
