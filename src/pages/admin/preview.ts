import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const mod = await import('../../../functions/admin/preview.js');
  const env = (ctx.locals as any)?.runtime?.env ?? {};
  return mod.onRequestPost({ request: ctx.request, env });
};

