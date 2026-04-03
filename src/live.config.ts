import { defineLiveCollection } from 'astro:content';
import { emdashLoader } from 'emdash/runtime';

const _emdash = defineLiveCollection({
  loader: emdashLoader(),
});

export const collections = { _emdash };
