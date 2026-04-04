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

  // For public routes (not /_emdash, not /api, not /admin), bypass the emdash
  // middleware chain entirely. The emdash middleware's cold-start setup check
  // calls getDb() which can fail on Cloudflare Pages, redirecting pre-rendered
  // pages to /_emdash/admin/setup. By calling next() and checking for the
  // setup redirect, we can catch and prevent it.
  if (!pathname.startsWith('/_emdash') && !pathname.startsWith('/api') &&
      !pathname.startsWith('/admin') && pathname !== '/confirm' &&
      pathname !== '/unsubscribe') {
    const response = await next();
    // If emdash redirected to setup, it returns a 302 or a meta-refresh page.
    // Detect this and fetch the static pre-rendered HTML instead.
    const location = response.headers.get('location');
    if (location?.includes('/_emdash/admin/setup')) {
      // 302 redirect to setup — fetch the static HTML file
      const htmlUrl = new URL(pathname === '/' ? '/index.html' : `${pathname}/index.html`, url.origin);
      return fetch(htmlUrl);
    }
    // Also check for Astro's meta-refresh redirect (returns 200 with small HTML body)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const body = await response.text();
      if (body.includes('/_emdash/admin/setup') && body.includes('Redirecting')) {
        const htmlUrl = new URL(pathname === '/' ? '/index.html' : `${pathname}/index.html`, url.origin);
        return fetch(htmlUrl);
      }
      // Not a redirect — return the original response with body reconstructed
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
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
