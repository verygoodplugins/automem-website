import { defineCollection, defineLiveCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { emdashLoader } from 'emdash/runtime';

const docs = defineCollection({
  loader: docsLoader(),
  schema: docsSchema(),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const _emdash = defineLiveCollection({
  loader: emdashLoader(),
});

export const collections = { docs, blog, _emdash };
