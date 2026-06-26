import rss from '@astrojs/rss';
import { getEmDashCollection } from 'emdash';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { publicBlogSlug } from '../lib/blog-slugs';

export async function GET(context: APIContext) {
  const { entries: posts, error } = await getEmDashCollection("posts", {
    orderBy: { published_at: "desc" },
  });

  if (error) {
    console.error('Failed to fetch posts for RSS feed:', error);
    return new Response('Internal Server Error', { status: 500 });
  }

  const emdashItems = posts.map((post) => ({
    slug: post.slug ?? post.id,
    title: post.data.title,
    description: post.data.description ?? '',
    pubDate: post.data.publishedAt ?? post.data.createdAt ?? new Date(),
  }));

  // Merge CMS posts with file-based markdown posts, deduped by public slug, so
  // markdown-only entries (e.g. release posts not yet migrated into emdash) also
  // reach RSS subscribers instead of being dropped. emdash wins on collision —
  // mirrors the /blog index merge.
  const emdashSlugs = new Set(emdashItems.map((item) => item.slug));
  const contentPosts = await getCollection('blog', ({ data }) => !data.draft);
  const fileItems = contentPosts
    .map((entry) => ({
      slug: publicBlogSlug(entry),
      title: entry.data.title,
      description: entry.data.description ?? '',
      pubDate: entry.data.date,
    }))
    .filter((item) => !emdashSlugs.has(item.slug));

  const items = [...emdashItems, ...fileItems].sort(
    (a, b) => (b.pubDate?.getTime?.() ?? 0) - (a.pubDate?.getTime?.() ?? 0),
  );

  return rss({
    title: 'AutoMem Blog',
    description: 'Articles about AI, memory systems, and building in the open',
    site: context.site || 'https://automem.ai',
    items: items.map((item) => ({
      title: item.title,
      description: item.description,
      pubDate: item.pubDate ?? new Date(),
      link: `/blog/${item.slug}/`,
      author: 'Jack Arturo',
    })),
    customData: `<language>en-us</language>`,
  });
}
