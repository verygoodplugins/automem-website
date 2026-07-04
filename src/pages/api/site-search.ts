import type { APIRoute } from 'astro';
import { search, searchWithDb } from 'emdash';
import type { SearchResult } from 'emdash';

export const prerender = false;

const SITE_SEARCH_COLLECTIONS = new Set(['posts', 'pages']);

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'public, max-age=60');

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

function parseSearchLimit(value: string | null) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return 12;
  return Math.min(Math.max(parsed, 1), 24);
}

function parseSearchCollections(value: string | null) {
  if (!value) return ['posts', 'pages'];

  const collections = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => SITE_SEARCH_COLLECTIONS.has(item));

  return collections.length > 0 ? collections : ['posts', 'pages'];
}

function publicSearchUrl(item: Pick<SearchResult, 'collection' | 'id' | 'slug'>) {
  const slugOrId = encodeURIComponent(item.slug || item.id);

  if (item.collection === 'posts') return `/blog/${slugOrId}`;
  if (item.collection === 'pages') return `/pages/${slugOrId}`;
  return `/${encodeURIComponent(item.collection)}/${slugOrId}`;
}

export const GET: APIRoute = async ({ locals, url }) => {
  const query = url.searchParams.get('q')?.trim() ?? '';
  if (query.length < 2) {
    return jsonResponse({ success: true, data: { items: [] } });
  }

  try {
    const emdash = (locals as any)?.emdash;
    const searchOptions = {
      collections: parseSearchCollections(url.searchParams.get('collections')),
      status: 'published',
      limit: parseSearchLimit(url.searchParams.get('limit')),
    };

    await emdash?.ensureSearchHealthy?.();

    const result = emdash?.db
      ? await searchWithDb(emdash.db, query, searchOptions)
      : await search(query, searchOptions);
    const items = (result.items ?? []).map((item) => ({
      id: item.id,
      slug: item.slug,
      collection: item.collection,
      title: item.title,
      snippet: item.snippet,
      score: item.score,
      url: publicSearchUrl(item),
    }));

    return jsonResponse({ success: true, data: { items } });
  } catch (error) {
    console.error('[site-search] Search failed', error);
    return jsonResponse(
      { success: false, error: 'Search failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
};
