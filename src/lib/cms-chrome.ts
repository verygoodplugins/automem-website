import { getMenu, getSiteSettings, sanitizeHref } from 'emdash';
import type { MenuItem } from 'emdash';

export interface ChromeLink {
  href: string;
  label: string;
  target?: string;
  rel?: string;
}

export interface CmsChrome {
  siteTitle: string;
  primaryMenuItems: ChromeLink[];
  footerMenuItems: ChromeLink[];
}

export const fallbackPrimaryMenuItems: ChromeLink[] = [
  { href: '/docs/overview', label: 'Docs' },
  { href: '/docs/core-concepts/memory-model/', label: 'Concepts' },
  { href: '/benchmarks', label: 'Benchmarks' },
  { href: '/blog', label: 'Blog' },
];

export const fallbackFooterMenuItems: ChromeLink[] = [
  {
    href: 'https://github.com/verygoodplugins/automem/blob/main/LICENSE',
    label: 'MIT License',
    target: '_blank',
    rel: 'noopener noreferrer',
  },
  {
    href: 'https://github.com/verygoodplugins/automem',
    label: 'GitHub',
    target: '_blank',
    rel: 'noopener noreferrer',
  },
  {
    href: 'https://automem.ai/discord',
    label: 'Discord',
    target: '_blank',
    rel: 'noopener noreferrer',
  },
  {
    href: 'https://instapods.com/apps/automem/?ref=jack',
    label: 'InstaPods',
    target: '_blank',
    rel: 'noopener noreferrer',
  },
];

function toChromeLink(item: MenuItem): ChromeLink {
  const href = sanitizeHref(item.url);
  const isExternal = /^https?:\/\//i.test(href);
  return {
    href,
    label: item.label,
    target: item.target,
    rel: item.target === '_blank' || isExternal ? 'noopener noreferrer' : undefined,
  };
}

async function resolveMenu(name: string, fallback: ChromeLink[]): Promise<ChromeLink[]> {
  try {
    const menu = await getMenu(name);
    const items = menu?.items.map(toChromeLink).filter((item) => item.href && item.label) ?? [];
    return items.length > 0 ? items : fallback;
  } catch (error) {
    console.warn(`[cms] Failed to load ${name} menu`, error);
    return fallback;
  }
}

export async function getCmsChrome(): Promise<CmsChrome> {
  const [settingsResult, primaryMenuItems, footerMenuItems] = await Promise.all([
    getSiteSettings().catch((error) => {
      console.warn('[cms] Failed to load site settings', error);
      return {};
    }),
    resolveMenu('primary', fallbackPrimaryMenuItems),
    resolveMenu('footer', fallbackFooterMenuItems),
  ]);

  const siteTitle = typeof settingsResult.title === 'string' && settingsResult.title.trim()
    ? settingsResult.title.trim()
    : 'AutoMem';

  return {
    siteTitle,
    primaryMenuItems,
    footerMenuItems,
  };
}
