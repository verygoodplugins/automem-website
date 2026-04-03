import { createCheckoutSession } from '../../lib/managed-cloud/providers.js';
import { findAccountByToken, recordFunnelEvent } from '../../lib/managed-cloud/store.js';
import { jsonResponse, readJson } from '../../lib/managed-cloud/utils.js';

export async function onRequestPost({ request, env, params }) {
  const account = await findAccountByToken(env, params.token);
  if (!account) {
    return jsonResponse({ success: false, error: 'Account not found.' }, { status: 404 });
  }
  const body = await readJson(request);
  const plan = String(body.plan || '').toLowerCase();
  if (!['pro', 'ultimate'].includes(plan)) {
    return jsonResponse({ success: false, error: 'Choose a valid plan.' }, { status: 400 });
  }
  const session = await createCheckoutSession(env, request, account, plan);
  await recordFunnelEvent(env, {
    token: params.token,
    event_name: 'checkout_started',
    page: '/subscribe',
    properties: { plan },
  });
  return jsonResponse({ success: true, url: session.url });
}
