// Confirm email endpoint: /confirm?token=...
import { verifyToken } from './lib/tokens.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const secret = env.CONFIRM_SECRET || env.ADMIN_TOKEN || '';

  const email = await verifyToken(token, secret);
  if (!email) {
    return new Response('<h1>Invalid or expired confirmation link.</h1>', {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }

  try {
    const db = env.D1 || env.DB;
    if (!db) {
      return new Response('<h1>Database binding missing</h1>', { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    await db.prepare(
      'UPDATE waitlist SET confirmed = 1 WHERE email = ?'
    ).bind(email.toLowerCase()).run();

    // Optionally redirect to homepage with a toast param
    const base = env.BASE_URL || `${url.protocol}//${url.host}`;
    const redirect = new URL(base);
    redirect.searchParams.set('confirmed', '1');
    return Response.redirect(redirect.toString(), 302);
  } catch (e) {
    return new Response('<h1>Confirmation failed. Please try again.</h1>', {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
}
