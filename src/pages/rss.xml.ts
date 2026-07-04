import rss from '@astrojs/rss';
import { getEmDashCollection } from 'emdash';
import type { ContentBylineCredit } from 'emdash';
import type { APIContext } from 'astro';

interface CmsPostData {
  slug?: string | null;
  title: string;
  excerpt?: string;
  publishedAt?: Date;
  scheduledAt?: Date;
  createdAt?: Date;
  bylines?: ContentBylineCredit[];
}

function effectivePostDate(post: { data: CmsPostData }) {
  return post.data.publishedAt ?? post.data.scheduledAt ?? post.data.createdAt ?? new Date();
}

export async function GET(context: APIContext) {
  const { entries, error } = await getEmDashCollection('posts', {
    status: 'published',
    limit: 100,
    orderBy: { published_at: 'desc' },
  });
  const posts = entries as Array<{ id: string; data: CmsPostData }>;

  if (error) {
    console.error('Failed to fetch CMS posts for RSS feed:', error);
    return new Response('Internal Server Error', { status: 500 });
  }

  const orderedPosts = [...posts].sort(
    (a, b) => effectivePostDate(b).getTime() - effectivePostDate(a).getTime(),
  );

  return rss({
    title: 'AutoMem Blog',
    description: 'Articles about AI, memory systems, and building in the open',
    site: context.site || 'https://automem.ai',
    items: orderedPosts.map((post) => {
      const postSlug = post.data.slug ?? post.id;
      const byline = post.data.bylines?.[0]?.byline;
      return {
        title: post.data.title,
        description: post.data.excerpt ?? '',
        pubDate: effectivePostDate(post),
        link: `/blog/${postSlug}/`,
        author: byline?.displayName ?? 'Jack Arturo',
      };
    }),
    customData: `<language>en-us</language>`,
  });
}
