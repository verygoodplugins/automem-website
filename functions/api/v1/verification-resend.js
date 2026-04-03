import { sendManagedCloudVerificationEmail } from '../../lib/managed-cloud/providers.js';
import { findAccountByToken, recordFunnelEvent } from '../../lib/managed-cloud/store.js';
import { jsonResponse } from '../../lib/managed-cloud/utils.js';

export async function onRequestPost({ request, env, params }) {
  const account = await findAccountByToken(env, params.token);
  if (!account) {
    return jsonResponse({ success: false, error: 'Account not found.' }, { status: 404 });
  }
  await sendManagedCloudVerificationEmail(env, request, account).catch(() => null);
  await recordFunnelEvent(env, {
    token: params.token,
    event_name: 'verification_resent',
    page: '/onboarding',
  });
  return jsonResponse({ success: true });
}
