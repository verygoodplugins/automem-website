type BlogEntryLike = {
  id?: string;
  slug?: string;
};

export function publicBlogSlug(entry: BlogEntryLike): string {
  const rawSlug = entry.slug ?? entry.id ?? '';
  const withoutIndex = rawSlug.replace(/\/index$/, '');
  const lastSegment = withoutIndex.split('/').filter(Boolean).at(-1) ?? withoutIndex;

  return lastSegment.replace(/^\d+-/, '');
}
