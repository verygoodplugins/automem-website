import type { MiddlewareHandler } from 'astro';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { request, locals, url } = context;
  const env = (locals as any)?.runtime?.env ?? {};
  const waitUntil = (locals as any)?.runtime?.waitUntil;
  const { pathname } = url;

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

    // Confirm/Unsubscribe
    if (pathname === '/confirm' && request.method === 'GET') {
      const { onRequestGet } = await import('../functions/confirm.js');
      return onRequestGet({ request, env });
    }

    if (pathname === '/unsubscribe' && request.method === 'GET') {
      const { onRequestGet } = await import('../functions/unsubscribe.js');
      return onRequestGet({ request, env });
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

