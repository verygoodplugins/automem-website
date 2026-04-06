export const prerender = true;

import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { getBlogSlug } from '../lib/blog';

export async function GET(context: APIContext) {
  const blog = await getCollection('blog');

  // Filter out drafts and sort by date
  const posts = blog
    .filter(post => !post.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: 'AutoMem Blog',
    description: 'Articles about AI, memory systems, and building in the open',
    site: context.site || 'https://automem.ai',
    items: posts.map(post => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/blog/${getBlogSlug(post)}/`,
      categories: post.data.tags || [],
      author: 'Jack Arturo',
    })),
    customData: `<language>en-us</language>`,
  });
}
