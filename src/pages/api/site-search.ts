import type { APIRoute } from 'astro';
import type { SearchResult } from 'emdash';
import { sql, type Kysely } from 'kysely';

export const prerender = false;

const SITE_SEARCH_COLLECTIONS = new Set(['posts', 'pages']);
const WHITESPACE_SPLIT_PATTERN = /\s+/;
const FTS_OPERATORS_PATTERN = /\b(AND|OR|NOT|NEAR)\b/i;
const DOUBLE_QUOTE_PATTERN = /"/g;

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

function isFts5SyntaxError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('fts5: syntax error') || message.includes('unknown special query');
}

function escapeFtsQuery(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    const inner = trimmed.slice(1, -1);
    return `"${inner.replace(DOUBLE_QUOTE_PATTERN, '""')}"`;
  }

  const escaped = trimmed.replace(DOUBLE_QUOTE_PATTERN, '""');
  if (FTS_OPERATORS_PATTERN.test(trimmed)) return escaped;

  const terms = escaped.split(WHITESPACE_SPLIT_PATTERN).filter((term) => term.length > 0);
  return terms.map((term) => `"${term}"*`).join(' ');
}

function normalizeSearchSnippet(snippet: string | null) {
  return snippet ?? undefined;
}

async function resolveSearchDb(locals: unknown) {
  const db = (locals as { emdash?: { db?: Kysely<any> } } | undefined)?.emdash?.db;
  if (db) return db;

  const { getDb } = await import('emdash/runtime');
  return getDb();
}

function tableNames(collection: string) {
  return {
    fts: `_emdash_fts_${collection}`,
    content: `ec_${collection}`,
  };
}

async function tableExists(db: Kysely<any>, tableName: string) {
  const result = await sql<{ name: string }>`
    SELECT name
    FROM sqlite_master
    WHERE type IN ('table', 'view') AND name = ${tableName}
    LIMIT 1
  `.execute(db);

  return result.rows.length > 0;
}

async function searchCollectionWithDb(
  db: Kysely<any>,
  collection: string,
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  const escapedQuery = escapeFtsQuery(query);
  if (!escapedQuery) return [];

  const { fts, content } = tableNames(collection);
  if (!(await tableExists(db, fts))) return [];

  try {
    const result = await sql<{
      id: string;
      slug: string | null;
      locale: string;
      title: string | null;
      snippet: string | null;
      score: number;
    }>`
      SELECT
        c.id,
        c.slug,
        c.locale,
        c.title,
        snippet("${sql.raw(fts)}", -1, '<mark>', '</mark>', '...', 32) as snippet,
        bm25("${sql.raw(fts)}") as score
      FROM "${sql.raw(fts)}" f
      JOIN "${sql.raw(content)}" c ON f.id = c.id
      WHERE "${sql.raw(fts)}" MATCH ${escapedQuery}
      AND (c.status = 'published' OR (c.status = 'scheduled' AND c.scheduled_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))
      AND c.deleted_at IS NULL
      ORDER BY score
      LIMIT ${limit}
    `.execute(db);

    return result.rows.map((row) => ({
      collection,
      id: row.id,
      slug: row.slug,
      locale: row.locale,
      title: row.title ?? undefined,
      snippet: normalizeSearchSnippet(row.snippet),
      score: Math.abs(row.score),
    }));
  } catch (error) {
    if (isFts5SyntaxError(error)) return [];
    throw error;
  }
}

async function searchPublishedContentWithDb(
  db: Kysely<any>,
  query: string,
  collections: string[],
  limit: number,
) {
  const items = (
    await Promise.all(collections.map((collection) => searchCollectionWithDb(db, collection, query, limit * 2)))
  ).flat();

  items.sort((a, b) => b.score - a.score);
  return { items: items.slice(0, limit) };
}

export const GET: APIRoute = async ({ locals, url }) => {
  const query = url.searchParams.get('q')?.trim() ?? '';
  if (query.length < 2) {
    return jsonResponse({ success: true, data: { items: [] } });
  }

  try {
    const emdash = (locals as any)?.emdash;
    const collections = parseSearchCollections(url.searchParams.get('collections'));
    const limit = parseSearchLimit(url.searchParams.get('limit'));

    await emdash?.ensureSearchHealthy?.();

    const result = await searchPublishedContentWithDb(await resolveSearchDb(locals), query, collections, limit);
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
