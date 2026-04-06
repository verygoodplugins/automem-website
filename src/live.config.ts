let collections = {};

const { defineLiveCollection } = await import('astro:content');
const { emdashLoader } = await import('emdash/runtime');
const _emdash = defineLiveCollection({
  loader: emdashLoader(),
});

collections = { _emdash };

export { collections };
