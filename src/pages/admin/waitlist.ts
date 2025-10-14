import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const mod = await import('../../../functions/admin/waitlist.js');
  const env = (ctx.locals as any)?.runtime?.env ?? {};
  return mod.onRequestGet({ request: ctx.request, env });
};

export const POST: APIRoute = async (ctx) => {
  const mod = await import('../../../functions/admin/waitlist.js');
  const env = (ctx.locals as any)?.runtime?.env ?? {};
  return mod.onRequestPost({ request: ctx.request, env });
};
