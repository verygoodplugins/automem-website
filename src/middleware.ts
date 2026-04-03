import type { MiddlewareHandler } from 'astro';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { request, locals, url } = context;

  // Astro v6 + Cloudflare: use cloudflare:workers import instead of locals.runtime.env
  let env: Record<string, any> = {};
  let waitUntil: ((p: Promise<any>) => void) | undefined;
  try {
    const cf = await import('cloudflare:workers');
    env = cf.env as any ?? {};
    waitUntil = (cf as any).executionCtx?.waitUntil?.bind((cf as any).executionCtx);
  } catch {
    // Not running in Cloudflare runtime (e.g. local dev without bindings)
  }
  const pathname = (url?.pathname || '/').replace(/\/+$/, '') || '/';

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
    const statusMatch = pathname.match(/^\/api\/v1\/status\/([^/]+)$/);
    if (statusMatch && request.method === 'GET') {
      const { onRequestGet } = await import('../functions/api/v1/status.js');
      return onRequestGet({ request, env, params: { token: decodeURIComponent(statusMatch[1]) } });
    }

    const subscribeMatch = pathname.match(/^\/api\/v1\/subscribe\/([^/]+)$/);
    if (subscribeMatch && request.method === 'POST') {
      const { onRequestPost } = await import('../functions/api/v1/subscribe.js');
      return onRequestPost({ request, env, params: { token: decodeURIComponent(subscribeMatch[1]) } });
    }

    const portalMatch = pathname.match(/^\/api\/v1\/customer-portal\/([^/]+)$/);
    if (portalMatch && request.method === 'POST') {
      const { onRequestPost } = await import('../functions/api/v1/customer-portal.js');
      return onRequestPost({ request, env, params: { token: decodeURIComponent(portalMatch[1]) } });
    }

    const onboardingChatMatch = pathname.match(/^\/api\/v1\/onboarding\/([^/]+)\/chat$/);
    if (onboardingChatMatch && request.method === 'POST') {
      const { onRequestPost } = await import('../functions/api/v1/onboarding.js');
      return onRequestPost({ request, env, params: { token: decodeURIComponent(onboardingChatMatch[1]) } });
    }

    const onboardingStateMatch = pathname.match(/^\/api\/v1\/onboarding\/([^/]+)$/);
    if (onboardingStateMatch && request.method === 'GET') {
      const { onRequestGet } = await import('../functions/api/v1/onboarding.js');
      return onRequestGet({ request, env, params: { token: decodeURIComponent(onboardingStateMatch[1]) } });
    }

    const enrichMatch = pathname.match(/^\/api\/v1\/enrich\/([^/]+)$/);
    if (enrichMatch && request.method === 'POST') {
      const { onRequestPost } = await import('../functions/api/v1/enrich.js');
      return onRequestPost({ request, env, params: { token: decodeURIComponent(enrichMatch[1]) } });
    }

    const preseedMatch = pathname.match(/^\/api\/v1\/preseed\/([^/]+)$/);
    if (preseedMatch && request.method === 'POST') {
      const { onRequestPost } = await import('../functions/api/v1/preseed.js');
      return onRequestPost({ request, env, params: { token: decodeURIComponent(preseedMatch[1]) } });
    }

    const resendVerificationMatch = pathname.match(/^\/api\/v1\/verification\/([^/]+)\/resend$/);
    if (resendVerificationMatch && request.method === 'POST') {
      const { onRequestPost } = await import('../functions/api/v1/verification-resend.js');
      return onRequestPost({ request, env, params: { token: decodeURIComponent(resendVerificationMatch[1]) } });
    }

    if (pathname === '/api/v1/signup' && request.method === 'POST') {
      const { onRequestPost } = await import('../functions/api/v1/signup.js');
      return onRequestPost({ request, env, waitUntil });
    }

    if (pathname === '/api/v1/track' && request.method === 'POST') {
      const { onRequestPost } = await import('../functions/api/v1/track.js');
      return onRequestPost({ request, env });
    }

    if (pathname === '/api/v1/webhook/stripe' && request.method === 'POST') {
      const { onRequestPost } = await import('../functions/api/v1/webhook-stripe.js');
      return onRequestPost({ request, env });
    }

    if (pathname === '/api/v1/webhook/instapods' && request.method === 'POST') {
      const { onRequestPost } = await import('../functions/api/v1/webhook-instapods.js');
      return onRequestPost({ request, env });
    }

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
