import rss from '@astrojs/rss';
import { getEmDashCollection } from 'emdash';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const { entries: posts } = await getEmDashCollection("posts", {
    orderBy: { published_at: "desc" },
  });

  return rss({
    title: 'AutoMem Blog',
    description: 'Articles about AI, memory systems, and building in the open',
    site: context.site || 'https://automem.ai',
    items: posts.map(post => ({
      title: post.data.title,
      description: post.data.description ?? '',
      pubDate: post.data.publishedAt ?? post.data.createdAt ?? new Date(),
      link: `/blog/${post.slug ?? post.id}/`,
      author: 'Jack Arturo',
    })),
    customData: `<language>en-us</language>`,
  });
}
