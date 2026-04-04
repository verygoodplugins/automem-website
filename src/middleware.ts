import type { MiddlewareHandler } from 'astro';

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

  // For public routes (not /_emdash, not /api, not /admin), intercept emdash's
  // cold-start setup redirect. The emdash middleware calls getDb() on every public
  // page and redirects to /_emdash/admin/setup when it fails on Cloudflare Pages.
  // We catch this and serve the pre-rendered static HTML via the ASSETS binding.
  if (!pathname.startsWith('/_emdash') && !pathname.startsWith('/api') &&
      !pathname.startsWith('/admin') && pathname !== '/confirm' &&
      pathname !== '/unsubscribe') {
    const response = await next();
    // Detect emdash setup redirect (302 or Astro meta-refresh with 200)
    const location = response.headers.get('location');
    const isSetupRedirect = location?.includes('/_emdash/admin/setup');
    let isMetaRefreshRedirect = false;
    let bodyText: string | undefined;
    if (!isSetupRedirect) {
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('text/html')) {
        bodyText = await response.text();
        isMetaRefreshRedirect = bodyText.includes('/_emdash/admin/setup') && bodyText.includes('Redirecting');
      }
    }
    if ((isSetupRedirect || isMetaRefreshRedirect) && env.ASSETS) {
      // Use the Cloudflare Pages ASSETS binding to fetch the static file directly
      // (regular fetch() loops back through the worker)
      const assetPath = pathname === '/' ? '/index.html' : `${pathname}/index.html`;
      try {
        const asset = await env.ASSETS.fetch(new Request(new URL(assetPath, url.origin)));
        if (asset.ok) return asset;
      } catch { /* fall through */ }
    }
    // Return original response (reconstruct if we consumed the body)
    if (bodyText !== undefined) {
      return new Response(bodyText, { status: response.status, statusText: response.statusText, headers: response.headers });
    }
    return response;
  }

  // Intercept emdash preview-url responses to fix the path using collection url_pattern
  if (pathname.match(/^\/_emdash\/api\/content\/[^/]+\/[^/]+\/preview-url$/) && request.method === 'POST') {
    const response = await next();
    try {
      const json = await response.clone().json() as any;
      if (json?.data?.url) {
        // Replace /posts/{id} or /posts/{slug} with /blog/{slug} pattern
        const emdash = (locals as any)?.emdash;
        const match = pathname.match(/^\/_emdash\/api\/content\/([^/]+)\/([^/]+)\/preview-url$/);
        if (match && emdash?.db) {
          const [, collection, id] = match;
          const colRow = await emdash.db.selectFrom('_emdash_collections').select('url_pattern').where('slug', '=', collection).executeTakeFirst();
          if (colRow?.url_pattern) {
            const entry = await emdash.db.selectFrom(`ec_${collection}`).select('slug').where('id', '=', id).executeTakeFirst();
            const slug = entry?.slug || id;
            const newPath = colRow.url_pattern.replace('{slug}', slug).replace('{id}', id).replace('{collection}', collection);
            // Preserve the _preview token
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

  return next();
};
