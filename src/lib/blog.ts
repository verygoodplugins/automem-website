export function getBlogSlug(entry: { id: string; slug?: string }) {
  if (entry.slug) {
    return entry.slug;
  }

  return entry.id
    .replace(/\/index\.(md|mdx)$/i, '')
    .replace(/\.(md|mdx)$/i, '')
    .replace(/\/index$/i, '');
}
