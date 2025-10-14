import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const env = (ctx.locals as any)?.runtime?.env ?? {};
  const body = {
    turnstileSiteKey: env.PUBLIC_TURNSTILE_SITE_KEY || ''
  };
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*'
    }
  });
};

