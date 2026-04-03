import { buildPreseedPayload } from '../../lib/managed-cloud/preseed.js';
import { findAccountByToken, getEnrichmentItems, getOnboardingSession, recordFunnelEvent, upsertOnboardingSession } from '../../lib/managed-cloud/store.js';
import { jsonResponse, nowIso } from '../../lib/managed-cloud/utils.js';
import { submitPreseedPayload } from '../../lib/managed-cloud/providers.js';

export async function onRequestPost({ env, params }) {
  const account = await findAccountByToken(env, params.token);
  if (!account) {
    return jsonResponse({ success: false, error: 'Account not found.' }, { status: 404 });
  }
  const session = await getOnboardingSession(env, params.token);
  if (!session) {
    return jsonResponse({ success: false, error: 'Onboarding session not found.' }, { status: 404 });
  }
  if (session.preseeded_at) {
    return jsonResponse({
      success: true,
      ...session.preseed_summary,
      preseeded_at: session.preseeded_at,
    });
  }

  const enrichmentItems = await getEnrichmentItems(env, params.token);
  const payload = buildPreseedPayload(session.profile || {}, enrichmentItems);
  const result = await submitPreseedPayload(env, account, payload);
  const preseeded_at = nowIso();
  await upsertOnboardingSession(env, params.token, {
    preseeded_at,
    preseed_summary: {
      ...result,
      preseeded_at,
    },
  });
  await recordFunnelEvent(env, {
    token: params.token,
    event_name: 'preseed_completed',
    page: '/onboarding',
    properties: result,
  });

  return jsonResponse({
    success: true,
    ...result,
    preseeded_at,
  });
}
