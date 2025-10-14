import type { MiddlewareHandler } from 'astro';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { request, locals, url } = context;
  const env = (locals as any)?.runtime?.env ?? {};
  const waitUntil = (locals as any)?.runtime?.waitUntil;
  const pathname = (url?.pathname || '/').replace(/\/+$/, '') || '/';

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
