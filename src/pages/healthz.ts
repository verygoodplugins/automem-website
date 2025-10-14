import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const env = (ctx.locals as any)?.runtime?.env ?? {};
  let d1 = 'unknown';
  try {
    const db = (env as any).D1 || (env as any).DB;
    if (db) {
      await db.prepare('SELECT 1').first();
      d1 = 'ok';
    } else {
      d1 = 'missing';
    }
  } catch (e) {
    d1 = 'error';
  }
  return new Response(JSON.stringify({ up: true, d1 }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
};

