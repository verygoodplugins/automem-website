import type { MiddlewareHandler } from 'astro';
import {
  createHomepageMarkdownResponse,
  wantsHomepageMarkdown,
  withAgentDiscoveryHeaders,
} from './lib/agent-readiness.mjs';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { request, locals, url } = context;

  // Astro v6 + Cloudflare: use cloudflare:workers import instead of locals.runtime.env
  let env: Record<string, any> = {};
  let waitUntil: ((p: Promise<any>) => void) | undefined;
  try {
    const cf = await import('cloudflare:workers');
    env = cf.env as any ?? {};
  } catch {
    // Not running in Cloudflare runtime (e.g. local dev without bindings)
  }
  const pathname = (url?.pathname || '/').replace(/\/+$/, '') || '/';

  if (wantsHomepageMarkdown(request, pathname)) {
    return createHomepageMarkdownResponse(request.method);
  }

  // Keep preview CMS auth/setup on one stable hostname so passkeys, sessions,
  // and setup state are exercised against a single preview surface instead of
  // Cloudflare's per-deploy hash URLs.
  const emdashPreviewBaseUrl = typeof env.EMDASH_PREVIEW_BASE_URL === 'string'
    ? env.EMDASH_PREVIEW_BASE_URL
    : '';
  if (pathname.startsWith('/_emdash') && emdashPreviewBaseUrl) {
    try {
      const canonicalUrl = new URL(emdashPreviewBaseUrl);
      if (canonicalUrl.origin !== url.origin) {
        canonicalUrl.pathname = url.pathname;
        canonicalUrl.search = url.search;
        return new Response(null, {
          status: 307,
          headers: {
            Location: canonicalUrl.toString(),
            'Cache-Control': 'no-store',
          },
        });
      }
    } catch {
      // Ignore invalid preview base URL and continue serving the current request.
    }
  }

  // Intercept emdash preview-url responses to fix the path using collection url_pattern
  if (pathname.match(/^\/_emdash\/api\/content\/[^/]+\/[^/]+\/preview-url$/) && request.method === 'POST') {
    const response = await next();
    try {
      const json = await response.clone().json() as any;
      if (json?.data?.url) {
        const emdash = (locals as any)?.emdash;
        const match = pathname.match(/^\/_emdash\/api\/content\/([^/]+)\/([^/]+)\/preview-url$/);
        if (match && emdash?.db) {
          const [, collection, id] = match;
          const colRow = await emdash.db.selectFrom('_emdash_collections').select('url_pattern').where('slug', '=', collection).executeTakeFirst();
          if (colRow?.url_pattern) {
            const entry = await emdash.db.selectFrom(`ec_${collection}`).select('slug').where('id', '=', id).executeTakeFirst();
            const slug = entry?.slug || id;
            const newPath = colRow.url_pattern.replace('{slug}', slug).replace('{id}', id).replace('{collection}', collection);
            const oldUrl = new URL(json.data.url, 'http://localhost');
            const previewToken = oldUrl.searchParams.get('_preview');
            json.data.url = `${newPath}?_preview=${previewToken}`;
            return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
        }
      }
    } catch {}
    return response;
  }

  try {
    // API: Signup
    if (pathname === '/api/signup' && request.method === 'POST') {
      const { onRequestPost } = await import('../functions/api/signup.js');
      return onRequestPost({ request, env, waitUntil });
    }

    // Admin: Waitlist JSON/CSV
    if (pathname === '/admin/waitlist') {
      const mod = await import('../functions/admin/waitlist.js');
      if (request.method === 'POST') return mod.onRequestPost({ request, env });
      return mod.onRequestGet({ request, env });
    }

    // Public runtime config for client (Turnstile site key)
    if (pathname === '/api/public-config' && request.method === 'GET') {
      const body = JSON.stringify({ turnstileSiteKey: env.PUBLIC_TURNSTILE_SITE_KEY || '' });
      return new Response(body, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    if (pathname === '/api/site-search' && request.method === 'GET') {
      return next();
    }

    // Confirm/Unsubscribe
    if (pathname === '/confirm' && request.method === 'GET') {
      const { onRequestGet } = await import('../functions/confirm.js');
      return onRequestGet({ request, env });
    }

    if (pathname === '/unsubscribe' && request.method === 'GET') {
      const { onRequestGet } = await import('../functions/unsubscribe.js');
      return onRequestGet({ request, env });
    }

    // For unmatched API/admin routes, return JSON 404 instead of HTML fallback
    if (
      pathname === '/api' || pathname.startsWith('/api/') ||
      pathname === '/admin' || pathname.startsWith('/admin/')
    ) {
      return new Response(JSON.stringify({ success: false, error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }
  } catch (err) {
    // If our handler fails, fall through with a 500 JSON
    return new Response(JSON.stringify({ success: false, error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  const response = await next();
  if (request.method === 'GET' || request.method === 'HEAD') {
    return withAgentDiscoveryHeaders(response, url);
  }

  return response;
};
