import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const { onRequestPost } = await import('../../../functions/api/signup.js');
  const env = (ctx.locals as any)?.runtime?.env ?? {};
  const waitUntil = (ctx.locals as any)?.runtime?.waitUntil;
  return onRequestPost({ request: ctx.request, env, waitUntil });
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
};

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
};
