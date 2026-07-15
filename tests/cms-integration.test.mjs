import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readSource(path) {
  try {
    return await readFile(new URL(path, import.meta.url), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return '';
    throw error;
  }
}

test('Astro content config no longer registers a file-backed blog collection', async () => {
  const contentConfig = await readSource('../src/content.config.ts');

  assert.doesNotMatch(contentConfig, /src\/content\/blog/);
  assert.doesNotMatch(contentConfig, /const blog\s*=/);
  assert.doesNotMatch(contentConfig, /getCollection\(['"]blog['"]/);
  assert.match(contentConfig, /export const collections = \{ docs \}/);
});

test('public blog surfaces are CMS-only at runtime', async () => {
  const blogIndex = await readSource('../src/pages/blog/index.astro');
  const blogDetail = await readSource('../src/pages/blog/[slug].astro');
  const rss = await readSource('../src/pages/rss.xml.ts');

  for (const source of [blogIndex, blogDetail, rss]) {
    assert.doesNotMatch(source, /astro:content/);
    assert.doesNotMatch(source, /getCollection\(['"]blog['"]/);
    assert.doesNotMatch(source, /contentPost/);
    assert.doesNotMatch(source, /fallbackPosts/);
    assert.doesNotMatch(source, /fileItems/);
  }

  assert.match(blogIndex, /Astro\.cache\.set\(cacheHint\)/);
  assert.match(blogIndex, /getTermsForEntries\(['"]posts['"]/);
  assert.match(blogIndex, /post\.data\.slug \?\? post\.id/);
  assert.doesNotMatch(blogIndex, /href=\{`\/blog\/\$\{post\.id\}`\}/);
  assert.match(blogDetail, /getSeoMeta/);
  assert.match(blogDetail, /hydrateCmsSeo/);
  assert.match(blogDetail, /getSeoMeta\(seoPost,/);
  assert.match(blogDetail, /getEntryTerms\(['"]posts['"],\s*post\.data\.id/);
  assert.match(blogDetail, /post\.data\.bylines\?\.\[0\]\?\.byline/);
  assert.match(blogDetail, /WidgetArea name="blog-sidebar"/);
  assert.match(blogDetail, /createPublicPageContext/);
  assert.match(rss, /getEmDashCollection\(['"]posts['"]/);
  assert.match(rss, /post\.data\.slug \?\? post\.id/);
  assert.doesNotMatch(rss, /\/blog\/\$\{post\.id\}/);
});

test('EmDash seed and CMS maintenance scripts are tracked', async () => {
  const seedUrl = new URL('../seed/seed.json', import.meta.url);
  const seedSource = await readFile(seedUrl, 'utf8').catch((error) => {
    if (error?.code === 'ENOENT') return '';
    throw error;
  });
  assert.notEqual(seedSource, '', 'seed/seed.json should exist');
  const seed = JSON.parse(seedSource);
  const packageJson = JSON.parse(await readSource('../package.json'));

  assert.deepEqual(packageJson.scripts['cms:seed:validate'], 'mkdir -p data && emdash seed seed/seed.json --database data/emdash.db --validate');
  assert.deepEqual(packageJson.scripts['cms:seed:apply'], 'mkdir -p data && emdash seed seed/seed.json --database data/emdash.db --on-conflict=update');
  assert.deepEqual(packageJson.scripts['cms:migrate-blog'], 'node scripts/migrate-blog-to-emdash.mjs');

  const collectionSlugs = new Set(seed.collections.map((collection) => collection.slug));
  assert.ok(collectionSlugs.has('posts'));
  assert.ok(collectionSlugs.has('pages'));

  const posts = seed.collections.find((collection) => collection.slug === 'posts');
  assert.ok(posts.supports.includes('search'));
  assert.ok(posts.supports.includes('seo'));
  assert.equal(posts.commentsEnabled, false);
  assert.equal(posts.urlPattern, '/blog/{slug}');

  assert.ok(seed.taxonomies.some((taxonomy) => taxonomy.name === 'tag'));
  assert.ok(seed.taxonomies.some((taxonomy) => taxonomy.name === 'category'));
  assert.ok(seed.menus.some((menu) => menu.name === 'primary'));
  assert.ok(seed.menus.some((menu) => menu.name === 'footer'));
  assert.ok(seed.widgetAreas.some((area) => area.name === 'blog-sidebar'));
  assert.ok(seed.sections.some((section) => section.slug === 'newsletter-signup'));
  assert.ok(seed.bylines.some((byline) => byline.slug === 'jack-arturo'));
});

test('CMS route additions are present and wired to EmDash APIs', async () => {
  const tagArchive = await readSource('../src/pages/blog/tag/[slug].astro');
  const categoryArchive = await readSource('../src/pages/blog/category/[slug].astro');
  const searchPage = await readSource('../src/pages/search.astro');
  const cmsPage = await readSource('../src/pages/pages/[slug].astro');
  const siteSearchApi = await readSource('../src/pages/api/site-search.ts');
  const migration = await readSource('../scripts/migrate-blog-to-emdash.mjs');
  const middleware = await readSource('../src/middleware.ts');
  const layout = await readSource('../src/layouts/Layout.astro');
  const cmsChrome = await readSource('../src/lib/cms-chrome.ts');

  assert.notEqual(tagArchive, '', 'tag archive route should exist');
  assert.notEqual(categoryArchive, '', 'category archive route should exist');
  assert.notEqual(searchPage, '', 'search route should exist');
  assert.notEqual(siteSearchApi, '', 'public site search API route should exist');
  assert.notEqual(cmsPage, '', 'CMS page route should exist');
  assert.notEqual(migration, '', 'blog migration script should exist');

  assert.match(tagArchive, /getTerm\(['"]tag['"]/);
  assert.match(tagArchive, /getEntriesByTerm\(['"]posts['"],\s*['"]tag['"]/);
  assert.match(categoryArchive, /getTerm\(['"]category['"]/);
  assert.match(categoryArchive, /getEntriesByTerm\(['"]posts['"],\s*['"]category['"]/);
  assert.doesNotMatch(searchPage, /LiveSearch/);
  assert.match(searchPage, /\/api\/site-search/);
  assert.match(searchPage, /item\.url/);
  assert.match(searchPage, /appendHighlightedSnippet/);
  assert.doesNotMatch(searchPage, /innerHTML\s*=\s*item\.snippet/);
  assert.match(middleware, /pathname === ['"]\/api\/site-search['"]/);
  assert.match(siteSearchApi, /searchPublishedContentWithDb/);
  assert.match(siteSearchApi, /import\(['"]emdash\/runtime['"]\)/);
  assert.match(siteSearchApi, /resolveSearchDb/);
  assert.match(siteSearchApi, /ensureSearchHealthy/);
  assert.match(siteSearchApi, /normalizeSearchSnippet/);
  assert.doesNotMatch(siteSearchApi, /SNIPPET_AMP_RE/);
  assert.doesNotMatch(siteSearchApi, /&quot;|&#39;|&amp;|&lt;|&gt;/);
  assert.doesNotMatch(siteSearchApi, /:\s*await search\(query,\s*searchOptions\)/);
  assert.match(siteSearchApi, /c\.status\s*=\s*'published'/);
  assert.match(siteSearchApi, /c\.status\s*=\s*'scheduled'/);
  assert.match(siteSearchApi, /c\.scheduled_at\s*<=\s*strftime/);
  assert.match(siteSearchApi, /snippet\("[^"]+",\s*-1,\s*['"]<mark>['"]/);
  assert.doesNotMatch(siteSearchApi, /snippet\("[^"]+",\s*2,\s*['"]<mark>['"]/);
  assert.match(siteSearchApi, /\/blog\/\$\{slugOrId\}/);
  assert.match(siteSearchApi, /\/pages\/\$\{slugOrId\}/);
  assert.ok(
    middleware.indexOf("pathname === '/api/site-search'") < middleware.indexOf('For unmatched API/admin routes'),
    'site-search API should run before the generic /api 404 guard',
  );
  assert.match(cmsPage, /getEmDashEntry\(['"]pages['"]/);
  assert.match(cmsPage, /hydrateCmsSeo/);
  assert.match(cmsPage, /getSeoMeta\(seoPage,/);
  assert.match(cmsPage, /PortableText/);
  assert.match(cmsChrome, /sanitizeHref/);
  assert.match(cmsChrome, /const href = sanitizeHref\(item\.url\)/);
  assert.match(layout, /<title>\{pageTitle\}<\/title>/);
  assert.match(layout, /pageContext\?\.title\s*\?\?/);
  assert.match(layout, /<EmDashHead page=\{pageContext\} \/>/);
  assert.match(migration, /data\/emdash\.db/);
  assert.match(migration, /EMDASH_URL/);
  assert.match(migration, /markdownToPortableText/);
  assert.match(migration, /markdownToCmsPortableText\(post\.body\)/);
  assert.ok(
    migration.indexOf('if (dryRun) {\n    for (const post of markdownPosts)') < migration.indexOf('const byline = await ensureByline();'),
    'dry-run branch should be reached before CMS API reads',
  );
  assert.match(migration, /_type: ['"]table['"]/);
  assert.match(migration, /blocks\.push\(\.\.\.markdownTableToPortableText\(tableLines\)\)/);
  assert.match(migration, /markDefs\.push\(\{ _key: key, _type: ['"]link['"], href: match\[9\] \}\)/);
  assert.doesNotMatch(migration, /return markdownToPortableText\(lines\.join\(['"]\\n['"]\)\)/);
  assert.match(migration, /_type: ['"]embed['"]/);
  assert.match(migration, /_type: ['"]mermaid['"]/);
  assert.match(migration, /client\.get\(['"]posts['"], slug, \{ raw: true \}\)/);
  assert.match(migration, /publishedAt: status === ['"]published['"] \? post\.date\.toISOString\(\) : undefined/);
  assert.match(migration, /async function publishWithHistoricalDate/);
  assert.match(migration, /async function setHistoricalPublishedDate/);
  assert.match(migration, /\/content\/posts\/\$\{encodeURIComponent\(contentId\)\}\/publish/);
  assert.match(migration, /await api\(['"]PUT['"],\s*`\/content\/posts\/\$\{encodeURIComponent\(contentId\)\}`,\s*\{\s*publishedAt,\s*\}\)/);
  assert.match(migration, /await setHistoricalPublishedDate\(contentId,\s*publishedAt\)/);
  assert.doesNotMatch(migration, /await api\(['"]POST['"],\s*`\/content\/posts\/\$\{encodeURIComponent\(contentId\)\}\/publish`,\s*\{\s*publishedAt,\s*\}\)/);
  assert.match(migration, /verifyPublishedDate/);
  assert.doesNotMatch(migration, /verifyPublishedDate\(saved\.id, post\.date\.toISOString\(\)\)/);
  assert.doesNotMatch(migration, /hasPublishedDate/);
});

test('blog index does not cache CMS failures or stale listing HTML', async () => {
  const blogIndex = await readSource('../src/pages/blog/index.astro');
  const errorIndex = blogIndex.indexOf('if (error) {');
  const cacheIndex = blogIndex.indexOf("Astro.response.headers.set('Cache-Control', 'no-store')");

  assert.ok(errorIndex > -1, 'blog index should handle CMS errors explicitly');
  assert.ok(cacheIndex > -1, 'blog index should prevent stale listing HTML after successful CMS reads');
  assert.ok(errorIndex < cacheIndex, 'CMS error handling should happen before successful response cache headers are set');
  assert.match(blogIndex, /['"]Cache-Control['"]:\s*['"]no-store/);
  assert.doesNotMatch(blogIndex, /s-maxage=3600/);
  assert.match(blogIndex, /return new Response\(/);
  assert.match(blogIndex, /status:\s*503/);
});

test('blog index orders ready scheduled posts by their effective publish time', async () => {
  const blogIndex = await readSource('../src/pages/blog/index.astro');

  assert.match(blogIndex, /scheduledAt\?: Date/);
  assert.match(blogIndex, /function effectivePostDate/);
  assert.match(blogIndex, /post\.data\.publishedAt\s*\?\?\s*post\.data\.scheduledAt\s*\?\?\s*post\.data\.createdAt/);
  assert.match(blogIndex, /const orderedPosts = \[\.\.\.posts\]\.sort/);
  assert.match(blogIndex, /effectivePostDate\(b\)\?\.getTime\(\)\s*\?\?\s*0/);
  assert.match(blogIndex, /const pagePosts = orderedPosts\.slice/);
  assert.match(blogIndex, /const postIds = pagePosts\.map/);
  assert.match(blogIndex, /pagePosts\.forEach/);
  assert.match(blogIndex, /const date = effectivePostDate\(post\)/);
});

test('blog detail and RSS use scheduledAt for ready scheduled posts', async () => {
  const blogDetail = await readSource('../src/pages/blog/[slug].astro');
  const rss = await readSource('../src/pages/rss.xml.ts');

  assert.match(blogDetail, /scheduledAt\?: Date/);
  assert.match(blogDetail, /function effectivePostDate/);
  assert.match(blogDetail, /post\.data\.publishedAt\s*\?\?\s*post\.data\.scheduledAt\s*\?\?\s*post\.data\.createdAt/);
  assert.match(blogDetail, /const date = effectivePostDate\(post\)/);

  assert.match(rss, /scheduledAt\?: Date/);
  assert.match(rss, /function effectivePostDate/);
  assert.match(rss, /post\.data\.publishedAt\s*\?\?\s*post\.data\.scheduledAt\s*\?\?\s*post\.data\.createdAt\s*\?\?\s*new Date\(\)/);
  assert.match(rss, /const orderedPosts = \[\.\.\.posts\]\.sort/);
  assert.match(rss, /effectivePostDate\(b\)\.getTime\(\)\s*-\s*effectivePostDate\(a\)\.getTime\(\)/);
  assert.match(rss, /items: orderedPosts\.map/);
  assert.match(rss, /pubDate: effectivePostDate\(post\)/);
});

test('blog detail does not cache or report CMS lookup failures as missing posts', async () => {
  const blogDetail = await readSource('../src/pages/blog/[slug].astro');
  const errorIndex = blogDetail.indexOf('if (error) {');
  const notFoundIndex = blogDetail.indexOf('if (!post) {');
  const cacheIndex = blogDetail.indexOf('Astro.cache.set(cacheHint)');

  assert.ok(errorIndex > -1, 'blog detail should handle CMS errors explicitly');
  assert.ok(notFoundIndex > -1, 'blog detail should still return 404 for missing posts');
  assert.ok(cacheIndex > -1, 'blog detail should cache successful CMS reads');
  assert.ok(errorIndex < notFoundIndex, 'CMS error handling should happen before missing-post 404 handling');
  assert.ok(errorIndex < cacheIndex, 'CMS error handling should happen before successful-response cache hints');
  assert.match(blogDetail, /['"]Cache-Control['"]:\s*['"]no-store/);
  assert.match(blogDetail, /return new Response\(/);
  assert.match(blogDetail, /status:\s*503/);
});

test('CMS entry routes treat missing live entries as 404s, not CMS outages', async () => {
  const entryErrors = await readSource('../src/lib/cms-entry-errors.ts');
  const blogDetail = await readSource('../src/pages/blog/[slug].astro');
  const cmsPage = await readSource('../src/pages/pages/[slug].astro');

  assert.match(entryErrors, /LiveEntryNotFoundError/);
  assert.match(entryErrors, /export function isCmsEntryNotFoundError/);

  for (const source of [blogDetail, cmsPage]) {
    assert.match(source, /import \{ isCmsEntryNotFoundError \}/);
    assert.match(source, /if \(error && isCmsEntryNotFoundError\(error\)\)/);
    assert.match(source, /if \(error\)/);
    assert.match(source, /status:\s*404/);

    const notFoundErrorIndex = source.indexOf('if (error && isCmsEntryNotFoundError(error))');
    const cmsErrorIndex = source.indexOf('if (error) {');
    assert.ok(notFoundErrorIndex > -1, 'route should handle live-entry misses explicitly');
    assert.ok(cmsErrorIndex > -1, 'route should still handle real CMS errors explicitly');
    assert.ok(notFoundErrorIndex < cmsErrorIndex, 'missing-entry normalization should happen before generic CMS errors');
  }
});

test('CMS pages do not cache or report CMS lookup failures as missing pages', async () => {
  const cmsPage = await readSource('../src/pages/pages/[slug].astro');
  const errorIndex = cmsPage.indexOf('if (error) {');
  const notFoundIndex = cmsPage.indexOf('if (!page) {');
  const cacheIndex = cmsPage.indexOf('Astro.cache.set(cacheHint)');

  assert.ok(errorIndex > -1, 'CMS page route should handle CMS errors explicitly');
  assert.ok(notFoundIndex > -1, 'CMS page route should still return 404 for missing pages');
  assert.ok(cacheIndex > -1, 'CMS page route should cache successful CMS reads');
  assert.ok(errorIndex < notFoundIndex, 'CMS page error handling should happen before missing-page 404 handling');
  assert.ok(errorIndex < cacheIndex, 'CMS page error handling should happen before successful-response cache hints');
  assert.match(cmsPage, /['"]Cache-Control['"]:\s*['"]no-store/);
  assert.match(cmsPage, /return new Response\(/);
  assert.match(cmsPage, /status:\s*503/);
});

test('featured CMS images preserve media alt text instead of forcing titles', async () => {
  const blogIndex = await readSource('../src/pages/blog/index.astro');
  const blogDetail = await readSource('../src/pages/blog/[slug].astro');

  assert.doesNotMatch(blogIndex, /alt=\{post\.data\.title\}/);
  assert.doesNotMatch(blogDetail, /alt=\{post\.data\.title\}/);
});

test('CMS SEO hydration helper reads EmDash SEO rows for dynamic content pages', async () => {
  const seoHelper = await readSource('../src/lib/cms-seo.ts');
  const blogDetail = await readSource('../src/pages/blog/[slug].astro');
  const cmsPage = await readSource('../src/pages/pages/[slug].astro');

  assert.notEqual(seoHelper, '', 'CMS SEO helper should exist');
  assert.match(seoHelper, /FROM _emdash_seo/);
  assert.match(seoHelper, /import\(['"]emdash\/runtime['"]\)/);
  assert.match(seoHelper, /return getDb\(\)/);
  assert.match(seoHelper, /collection = \$\{collection\}/);
  assert.match(seoHelper, /content_id = \$\{entry\.data\.id\}/);
  assert.match(seoHelper, /data:\s*\{\s*\.\.\.entry\.data,\s*seo/);
  assert.match(blogDetail, /await hydrateCmsSeo\(Astro\.locals,\s*['"]posts['"],\s*post\)/);
  assert.match(cmsPage, /await hydrateCmsSeo\(Astro\.locals,\s*['"]pages['"],\s*page\)/);
});

test('CMS page SEO and page context use public slugs instead of internal ids', async () => {
  const cmsPage = await readSource('../src/pages/pages/[slug].astro');

  assert.match(cmsPage, /slug\?: string \| null/);
  assert.match(cmsPage, /const pageSlug = page\.data\.slug \?\? slug!/);
  assert.match(cmsPage, /path:\s*`\/pages\/\$\{pageSlug\}`/);
  assert.match(cmsPage, /slug:\s*pageSlug/);
  assert.doesNotMatch(cmsPage, /path:\s*`\/pages\/\$\{page\.id\}`/);
  assert.doesNotMatch(cmsPage, /slug:\s*page\.id/);
});

test('tag and category archives use scheduledAt for ready scheduled posts', async () => {
  const tagArchive = await readSource('../src/pages/blog/tag/[slug].astro');
  const categoryArchive = await readSource('../src/pages/blog/category/[slug].astro');

  for (const archive of [tagArchive, categoryArchive]) {
    assert.match(archive, /scheduledAt\?: Date/);
    assert.match(archive, /function effectivePostDate/);
    assert.match(archive, /post\.data\.publishedAt\s*\?\?\s*post\.data\.scheduledAt\s*\?\?\s*post\.data\.createdAt/);
    assert.match(archive, /const sortedPosts = posts\.toSorted/);
    assert.match(archive, /effectivePostDate\(b\)\?\.getTime\(\)\s*\?\?\s*0/);
    assert.match(archive, /effectivePostDate\(a\)\?\.getTime\(\)\s*\?\?\s*0/);
    assert.match(archive, /const date = effectivePostDate\(post\)/);
  }
});

test('RSS applies its item cap after effective-date ordering', async () => {
  const rss = await readSource('../src/pages/rss.xml.ts');

  assert.match(rss, /const RSS_POST_LIMIT = 100/);
  assert.doesNotMatch(rss, /limit:\s*100/);
  assert.match(rss, /const orderedPosts = \[\.\.\.posts\]\.sort\([\s\S]*\)\.slice\(0,\s*RSS_POST_LIMIT\)/);
  assert.match(rss, /items: orderedPosts\.map/);
});
