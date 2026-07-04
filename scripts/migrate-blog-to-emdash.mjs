#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';
import yaml from 'js-yaml';
import {
  EmDashClient,
  createTransport,
  csrfInterceptor,
  devBypassInterceptor,
  markdownToPortableText,
  tokenInterceptor,
} from 'emdash/client';

const BLOG_DIR = path.resolve('src/content/blog');
const LOCAL_DB_PATH = path.resolve('data/emdash.db');
const DEFAULT_EMDASH_URL = 'http://localhost:4321';
const BYLINE = {
  slug: 'jack-arturo',
  displayName: 'Jack Arturo',
  bio: 'Developer, open source advocate, and builder of AI tools. Creator of AutoMem, WP Fusion, and EchoDash.',
  websiteUrl: 'https://automem.ai/authors/jack-arturo',
  isGuest: false,
};

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const applyProduction = args.has('--apply-production');
const emdashUrl = process.env.EMDASH_URL ?? DEFAULT_EMDASH_URL;
const emdashToken = process.env.EMDASH_TOKEN;
const siteUrl = process.env.SITE_URL ?? 'https://automem.ai';
let portableTextKeyCounter = 0;

function usage() {
  console.log(`Usage: npm run cms:migrate-blog -- [--dry-run] [--apply-production]

Environment:
  EMDASH_URL     EmDash site URL. Defaults to ${DEFAULT_EMDASH_URL}.
  EMDASH_TOKEN   Required for non-local targets.
  SITE_URL       Canonical site URL for SEO fields. Defaults to ${siteUrl}.

Local date patch target:
  data/emdash.db
`);
}

if (args.has('--help')) {
  usage();
  process.exit(0);
}

function isLocalUrl(value) {
  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
  } catch {
    return false;
  }
}

const isLocalTarget = isLocalUrl(emdashUrl);

if (!isLocalTarget && !applyProduction) {
  console.error(
    `Refusing to write to non-local EmDash target ${emdashUrl}. Re-run with --apply-production and EMDASH_TOKEN when this is intentional.`,
  );
  process.exit(1);
}

if (!isLocalTarget && !emdashToken) {
  console.error('EMDASH_TOKEN is required for non-local migration targets.');
  process.exit(1);
}

const client = new EmDashClient({
  baseUrl: emdashUrl,
  token: emdashToken,
  devBypass: !emdashToken && isLocalTarget,
});

const interceptors = [csrfInterceptor()];
if (emdashToken) {
  interceptors.push(tokenInterceptor(emdashToken));
} else if (isLocalTarget) {
  interceptors.push(devBypassInterceptor(emdashUrl));
}
const transport = createTransport({ interceptors });

async function api(method, apiPath, body) {
  const url = new URL(`/_emdash/api${apiPath}`, emdashUrl);
  const headers = { Accept: 'application/json' };
  let requestBody;

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const response = await transport.fetch(new Request(url, {
    method,
    headers,
    body: requestBody,
  }));
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok || payload.success === false) {
    const message = payload.error?.message ?? response.statusText ?? `HTTP ${response.status}`;
    const details = payload.error?.details ? `: ${JSON.stringify(payload.error.details)}` : '';
    const error = new Error(`${method} ${apiPath} failed: ${message}${details}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload.data;
}

function slugFromDir(name) {
  return name.replace(/^\d+-/, '');
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function portableTextKey(prefix = 'm') {
  return `${prefix}${(portableTextKeyCounter++).toString(36)}`;
}

function splitMarkdownTableRow(line) {
  let value = line.trim();
  if (value.startsWith('|')) value = value.slice(1);
  if (value.endsWith('|')) value = value.slice(0, -1);
  return value.split('|').map((cell) => cell.trim());
}

function isMarkdownTableSeparator(line) {
  const cells = splitMarkdownTableRow(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isMarkdownTableStart(lines, index) {
  return lines[index]?.includes('|') && isMarkdownTableSeparator(lines[index + 1] ?? '');
}

function parseInlineCell(value) {
  const spans = [];
  const markDefs = [];
  const pattern = /(\*\*(.+?)\*\*)|(_(.+?)_)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      spans.push({ _type: 'span', _key: portableTextKey('s'), text: value.slice(lastIndex, match.index), marks: [] });
    }

    if (match[2] != null) {
      spans.push({ _type: 'span', _key: portableTextKey('s'), text: match[2], marks: ['strong'] });
    } else if (match[4] != null) {
      spans.push({ _type: 'span', _key: portableTextKey('s'), text: match[4], marks: ['em'] });
    } else if (match[6] != null) {
      spans.push({ _type: 'span', _key: portableTextKey('s'), text: match[6], marks: ['code'] });
    } else if (match[8] != null && match[9] != null) {
      const key = portableTextKey('l');
      markDefs.push({ _key: key, _type: 'link', href: match[9] });
      spans.push({ _type: 'span', _key: portableTextKey('s'), text: match[8], marks: [key] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) {
    spans.push({ _type: 'span', _key: portableTextKey('s'), text: value.slice(lastIndex), marks: [] });
  }

  if (spans.length === 0) {
    spans.push({ _type: 'span', _key: portableTextKey('s'), text: value, marks: [] });
  }

  return { content: spans, markDefs };
}

function markdownTableToPortableText(lines) {
  const rows = lines.filter((line, index) => index !== 1).map((line, rowIndex) => ({
    _type: 'tableRow',
    _key: portableTextKey('r'),
    cells: splitMarkdownTableRow(line).map((cell) => ({
      _type: 'tableCell',
      _key: portableTextKey('c'),
      ...parseInlineCell(cell),
      isHeader: rowIndex === 0,
    })),
  }));

  return {
    _type: 'table',
    _key: portableTextKey(),
    rows,
    hasHeaderRow: true,
  };
}

function collectHtmlBlock(lines, startIndex) {
  const collected = [];
  let index = startIndex;

  while (index < lines.length) {
    collected.push(lines[index]);
    const joined = collected.join('\n');
    if (/<\/iframe>/i.test(joined) && (/<\/div>/i.test(joined) || !/<div\b/i.test(joined))) break;
    if (!/<iframe\b/i.test(joined) && /<\/div>/i.test(joined)) break;
    index++;
  }

  return { html: collected.join('\n'), nextIndex: Math.min(index + 1, lines.length) };
}

function shouldCollectHtmlBlock(lines, index) {
  const line = lines[index]?.trim() ?? '';
  if (/<iframe\b/i.test(line)) return true;
  if (!line.startsWith('<div')) return false;

  const lookahead = lines.slice(index, Math.min(index + 8, lines.length)).join('\n');
  return /<iframe\b/i.test(lookahead);
}

function htmlBlockToPortableText(html) {
  const src = html.match(/\bsrc=["']([^"']+)["']/i)?.[1];
  if (src) {
    return {
      _type: 'embed',
      _key: portableTextKey(),
      url: src,
      provider: /youtu\.be|youtube\.com/i.test(src) ? 'youtube' : undefined,
      html,
    };
  }

  return {
    _type: 'htmlBlock',
    _key: portableTextKey(),
    html,
  };
}

function markdownToCmsPortableText(markdown) {
  const blocks = [];
  const pendingMarkdown = [];
  const lines = markdown.split('\n');
  let index = 0;

  function flushMarkdown() {
    const source = pendingMarkdown.join('\n');
    pendingMarkdown.length = 0;
    if (source.trim()) {
      blocks.push(...markdownToPortableText(source));
    }
  }

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed.startsWith('```mermaid')) {
      flushMarkdown();
      const codeLines = [];
      index++;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index++;
      }
      if (index < lines.length) index++;
      blocks.push({
        _type: 'mermaid',
        _key: portableTextKey(),
        code: codeLines.join('\n'),
      });
      continue;
    }

    if (isMarkdownTableStart(lines, index)) {
      flushMarkdown();
      const tableLines = [lines[index], lines[index + 1]];
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim() !== '') {
        tableLines.push(lines[index]);
        index++;
      }
      blocks.push(markdownTableToPortableText(tableLines));
      continue;
    }

    if (shouldCollectHtmlBlock(lines, index)) {
      flushMarkdown();
      const { html, nextIndex } = collectHtmlBlock(lines, index);
      blocks.push(htmlBlockToPortableText(html));
      index = nextIndex;
      continue;
    }

    pendingMarkdown.push(line);
    index++;
  }

  flushMarkdown();
  return blocks;
}

function parseFrontmatter(source, filePath) {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) {
    throw new Error(`Missing YAML frontmatter in ${filePath}`);
  }

  const data = yaml.load(match[1]) ?? {};
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`Invalid YAML frontmatter in ${filePath}`);
  }

  return {
    data,
    body: source.slice(match[0].length),
  };
}

function parseDate(value, filePath) {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date in ${filePath}: ${String(value)}`);
  }
  return date;
}

async function readMarkdownPosts() {
  const entries = await readdir(BLOG_DIR, { withFileTypes: true });
  const posts = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirName = entry.name;
    const filePath = path.join(BLOG_DIR, dirName, 'index.md');
    if (!existsSync(filePath)) continue;

    const source = await readFile(filePath, 'utf8');
    if (!source.trim()) continue;

    const { data, body } = parseFrontmatter(source, filePath);
    const tags = Array.isArray(data.tags) ? data.tags.map((tag) => String(tag)) : [];

    posts.push({
      filePath,
      dirName,
      slug: slugFromDir(dirName),
      title: String(data.title ?? ''),
      description: String(data.description ?? ''),
      draft: Boolean(data.draft),
      date: parseDate(data.date, filePath),
      tags,
      body,
    });
  }

  return posts.sort((a, b) => a.dirName.localeCompare(b.dirName));
}

async function getExistingPost(slug) {
  try {
    return await client.get('posts', slug, { raw: true });
  } catch (error) {
    if (error?.status === 404) return null;
    throw error;
  }
}

async function ensureByline() {
  const result = await api('GET', `/admin/bylines?search=${encodeURIComponent(BYLINE.slug)}`);
  const existing = result.items?.find((item) => item.slug === BYLINE.slug);
  if (existing) return existing;

  if (dryRun) {
    console.log(`[dry-run] would create byline ${BYLINE.slug}`);
    return { id: 'dry-run-byline', ...BYLINE };
  }

  return api('POST', '/admin/bylines', BYLINE);
}

const termsCache = new Map();

async function getTermsMap(taxonomy) {
  if (termsCache.has(taxonomy)) {
    return termsCache.get(taxonomy);
  }

  const terms = new Map();
  const result = await api('GET', `/taxonomies/${encodeURIComponent(taxonomy)}/terms?limit=100`);
  const items = result.items ?? result.terms ?? [];

  for (const term of items) {
    terms.set(term.slug, term);
  }

  termsCache.set(taxonomy, terms);
  return terms;
}

async function ensureTerm(taxonomy, slug, label) {
  const terms = await getTermsMap(taxonomy);
  const existing = terms.get(slug);
  if (existing) return existing;

  if (dryRun) {
    console.log(`[dry-run] would create ${taxonomy} term ${slug}`);
    return { id: `dry-run-${taxonomy}-${slug}`, slug, label };
  }

  const result = await api('POST', `/taxonomies/${encodeURIComponent(taxonomy)}/terms`, { slug, label });
  const created = result.term ?? result;
  terms.set(created.slug, created);
  return created;
}

function categorySlugsForTags(tags) {
  const tagSet = new Set(tags.map(slugify));
  const categories = new Set();

  if (tagSet.has('release') || tagSet.has('announcement')) categories.add('release');
  if (tagSet.has('architecture') || tagSet.has('mcp') || tagSet.has('integrations')) categories.add('architecture');
  if (tagSet.has('tutorial') || tagSet.has('beginners') || tagSet.has('self-hosting') || tagSet.has('docker')) {
    categories.add('tutorial');
  }
  if (tagSet.has('benchmarking') || tagSet.has('rag') || tagSet.has('ai') || tagSet.has('agentic-ai')) {
    categories.add('research');
  }

  if (categories.size === 0) categories.add('research');
  return [...categories];
}

async function setTerms(contentId, taxonomy, termIds) {
  if (dryRun) return;
  await api('POST', `/content/posts/${encodeURIComponent(contentId)}/terms/${encodeURIComponent(taxonomy)}`, {
    termIds,
  });
}

async function publishWithHistoricalDate(contentId, publishedAt) {
  await api('POST', `/content/posts/${encodeURIComponent(contentId)}/publish`, {
    publishedAt,
  });

  if (!(await hasPublishedDate(contentId, publishedAt))) {
    await api('PUT', `/content/posts/${encodeURIComponent(contentId)}`, {
      publishedAt,
    });
  }

  await verifyPublishedDate(contentId, publishedAt);
}

function datesMatch(actual, expected) {
  if (!actual) return false;
  return new Date(actual).getTime() === new Date(expected).getTime();
}

async function readPublishedDate(contentId) {
  const result = await api('GET', `/content/posts/${encodeURIComponent(contentId)}`);
  const item = result.item ?? result;
  return item?.publishedAt ?? item?.published_at ?? null;
}

async function hasPublishedDate(contentId, expected) {
  return datesMatch(await readPublishedDate(contentId), expected);
}

async function verifyPublishedDate(contentId, expected) {
  const actual = await readPublishedDate(contentId);

  if (!datesMatch(actual, expected)) {
    throw new Error(
      `Remote CMS did not preserve historical publishedAt for ${contentId}. Expected ${expected}, received ${actual ?? 'null'}.`,
    );
  }
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function buildPublishedDatePatch(records) {
  const lines = [
    '-- Explicit historical published_at patch for migrated markdown posts.',
    '-- Run only after the CMS content rows exist.',
  ];

  for (const record of records) {
    lines.push(
      `UPDATE ec_posts SET published_at = ${sqlString(record.date.toISOString())} WHERE slug = ${sqlString(record.slug)};`,
    );
  }

  return `${lines.join('\n')}\n`;
}

function runSqlitePatch(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn('sqlite3', [LOCAL_DB_PATH], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(stderr || `sqlite3 exited with code ${code}`);
        error.code = code;
        reject(error);
      }
    });

    child.stdin.end(sql);
  });
}

async function patchLocalPublishedDates(records) {
  const sql = buildPublishedDatePatch(records);

  if (!isLocalTarget || !existsSync(LOCAL_DB_PATH)) {
    console.log('\nHistorical date patch SQL:');
    console.log(sql);
    if (!isLocalTarget) {
      console.log('Historical dates were also sent through the EmDash content APIs. Keep this SQL as an audit fallback for the target database.');
    }
    return;
  }

  if (dryRun) {
    console.log('\n[dry-run] would apply local historical date patch:');
    console.log(sql);
    return;
  }

  try {
    await runSqlitePatch(sql);
    console.log(`Patched historical published_at dates in ${path.relative(process.cwd(), LOCAL_DB_PATH)}.`);
  } catch (error) {
    console.warn(`Could not apply local date patch automatically: ${error.message}`);
    console.log('\nApply this SQL manually:');
    console.log(sql);
  }
}

async function ensureLocalDbPathIsExplicit() {
  if (!isLocalTarget) return;
  if (!existsSync(LOCAL_DB_PATH)) {
    console.warn(`Local CMS database ${path.relative(process.cwd(), LOCAL_DB_PATH)} was not found.`);
    return;
  }

  const info = await stat(LOCAL_DB_PATH);
  if (!info.isFile()) {
    throw new Error(`${LOCAL_DB_PATH} is not a file`);
  }
}

async function main() {
  await ensureLocalDbPathIsExplicit();

  const markdownPosts = await readMarkdownPosts();
  if (markdownPosts.length === 0) {
    console.log('No markdown posts found to migrate.');
    return;
  }

  console.log(`Migrating ${markdownPosts.length} markdown posts to ${emdashUrl}${dryRun ? ' (dry run)' : ''}.`);

  if (dryRun) {
    const migrated = [];

    for (const post of markdownPosts) {
      markdownToCmsPortableText(post.body);
      const status = post.draft ? 'draft' : 'published';
      console.log(`[dry-run] would upsert ${post.slug} (${status})`);
      migrated.push({ slug: post.slug, date: post.date });
    }

    await patchLocalPublishedDates(migrated);
    console.log(`Migration dry run finished: ${migrated.length} posts inspected.`);
    return;
  }

  const byline = await ensureByline();
  const migrated = [];

  for (const post of markdownPosts) {
    const content = markdownToCmsPortableText(post.body);
    const status = post.draft ? 'draft' : 'published';
    const tagTerms = await Promise.all(
      post.tags.map((tag) => {
        const tagSlug = slugify(tag);
        return ensureTerm('tag', tagSlug, tag);
      }),
    );
    const categoryTerms = await Promise.all(
      categorySlugsForTags(post.tags).map((categorySlug) => ensureTerm(
        'category',
        categorySlug,
        categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      )),
    );

    const input = {
      slug: post.slug,
      ...(status === 'draft' ? { status } : {}),
      data: {
        title: post.title,
        excerpt: post.description,
        content,
      },
      bylines: byline?.id ? [{ bylineId: byline.id, roleLabel: 'Author' }] : undefined,
      seo: {
        title: post.title,
        description: post.description,
        canonical: `${siteUrl.replace(/\/$/, '')}/blog/${post.slug}`,
        noIndex: post.draft,
      },
      publishedAt: status === 'published' ? post.date.toISOString() : undefined,
    };

    const existing = await getExistingPost(post.slug);
    let saved;

    if (existing) {
      const result = await api('PUT', `/content/posts/${encodeURIComponent(existing.id)}`, {
        ...input,
        _rev: existing._rev,
      });
      saved = result.item;
      console.log(`Updated ${post.slug}`);
    } else {
      const result = await api('POST', '/content/posts', input);
      saved = result.item;
      console.log(`Created ${post.slug}`);
    }

    if (status === 'published') {
      await publishWithHistoricalDate(saved.id, post.date.toISOString());
    }

    await Promise.all([
      setTerms(saved.id, 'tag', tagTerms.map((term) => term.id)),
      setTerms(saved.id, 'category', categoryTerms.map((term) => term.id)),
    ]);

    migrated.push({ slug: post.slug, date: post.date });
  }

  await patchLocalPublishedDates(migrated);
  console.log(`Migration finished: ${migrated.length} posts processed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
