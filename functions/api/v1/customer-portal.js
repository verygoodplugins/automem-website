import { createCustomerPortalSession } from '../../lib/managed-cloud/providers.js';
import { findAccountByToken, recordFunnelEvent } from '../../lib/managed-cloud/store.js';
import { jsonResponse } from '../../lib/managed-cloud/utils.js';

export async function onRequestPost({ request, env, params }) {
  const account = await findAccountByToken(env, params.token);
  if (!account) {
    return jsonResponse({ success: false, error: 'Account not found.' }, { status: 404 });
  }
  if (!account.stripe_customer_id) {
    return jsonResponse({ success: false, error: 'Stripe customer is not configured yet.' }, { status: 400 });
  }
  const session = await createCustomerPortalSession(env, request, account);
  await recordFunnelEvent(env, {
    token: params.token,
    event_name: 'customer_portal_opened',
    page: '/dashboard',
  });
  return jsonResponse({ success: true, url: session.url });
}
