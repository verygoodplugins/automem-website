import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const mod = await import('../../../functions/admin/broadcast.js');
  const env = (ctx.locals as any)?.runtime?.env ?? {};
  const waitUntil = (ctx.locals as any)?.runtime?.waitUntil;
  return mod.onRequestPost({ request: ctx.request, env, waitUntil });
};

