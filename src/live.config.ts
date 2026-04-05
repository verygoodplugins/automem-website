const enableEmdash =
  process.env.ENABLE_EMDASH_CMS === '1' ||
  (!!process.env.CF_PAGES_BRANCH && process.env.CF_PAGES_BRANCH !== 'main');

let collections = {};

if (enableEmdash) {
  const { defineLiveCollection } = await import('astro:content');
  const runtimeModule = ['emdash', 'runtime'].join('/');
  const { emdashLoader } = await import(runtimeModule);
  const _emdash = defineLiveCollection({
    loader: emdashLoader(),
  });

  collections = { _emdash };
}

export { collections };
