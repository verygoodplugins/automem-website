import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const { onRequestGet } = await import('../../functions/unsubscribe.js');
  const env = (ctx.locals as any)?.runtime?.env ?? {};
  return onRequestGet({ request: ctx.request, env });
};
