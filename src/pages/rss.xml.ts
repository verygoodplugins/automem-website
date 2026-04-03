import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const { emdash } = context.locals as any;
  let posts: any[] = [];

  if (emdash?.handleContentList) {
    const result = await emdash.handleContentList('posts', { status: 'published', limit: 100 });
    if (result.success) {
      posts = result.data.items.sort((a: any, b: any) => {
        const dateA = a.published_at ? new Date(a.published_at).valueOf() : 0;
        const dateB = b.published_at ? new Date(b.published_at).valueOf() : 0;
        return dateB - dateA;
      });
    }
  }

  return rss({
    title: 'AutoMem Blog',
    description: 'Articles about AI, memory systems, and building in the open',
    site: context.site || 'https://automem.ai',
    items: posts.map((post: any) => ({
      title: post.data?.title || post.title,
      description: post.data?.excerpt || post.excerpt || '',
      pubDate: post.published_at ? new Date(post.published_at) : new Date(),
      link: `/blog/${post.slug}/`,
      author: 'Jack Arturo',
    })),
    customData: `<language>en-us</language>`,
  });
}
