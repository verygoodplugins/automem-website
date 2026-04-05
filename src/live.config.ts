import { defineLiveCollection } from 'astro:content';
import { emdashLoader } from 'emdash/runtime';

const enableEmdash =
  process.env.ENABLE_EMDASH_CMS === '1' ||
  (!!process.env.CF_PAGES_BRANCH && process.env.CF_PAGES_BRANCH !== 'main');

const _emdash = defineLiveCollection({
  loader: emdashLoader(),
});

export const collections = enableEmdash ? { _emdash } : {};
