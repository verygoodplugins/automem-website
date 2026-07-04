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

  assert.deepEqual(packageJson.scripts['cms:seed:validate'], 'emdash seed seed/seed.json --database data/emdash.db --validate');
  assert.deepEqual(packageJson.scripts['cms:seed:apply'], 'emdash seed seed/seed.json --database data/emdash.db --on-conflict=update');
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
  const migration = await readSource('../scripts/migrate-blog-to-emdash.mjs');

  assert.notEqual(tagArchive, '', 'tag archive route should exist');
  assert.notEqual(categoryArchive, '', 'category archive route should exist');
  assert.notEqual(searchPage, '', 'search route should exist');
  assert.notEqual(cmsPage, '', 'CMS page route should exist');
  assert.notEqual(migration, '', 'blog migration script should exist');

  assert.match(tagArchive, /getTerm\(['"]tag['"]/);
  assert.match(tagArchive, /getEntriesByTerm\(['"]posts['"],\s*['"]tag['"]/);
  assert.match(categoryArchive, /getTerm\(['"]category['"]/);
  assert.match(categoryArchive, /getEntriesByTerm\(['"]posts['"],\s*['"]category['"]/);
  assert.match(searchPage, /LiveSearch/);
  assert.match(cmsPage, /getEmDashEntry\(['"]pages['"]/);
  assert.match(cmsPage, /PortableText/);
  assert.match(migration, /data\/emdash\.db/);
  assert.match(migration, /EMDASH_URL/);
  assert.match(migration, /markdownToPortableText/);
  assert.match(migration, /\/content\/posts\?q=\$\{encodeURIComponent\(slug\)\}&limit=20/);
});
