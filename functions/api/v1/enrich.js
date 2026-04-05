import { runBraveEnrichment } from '../../lib/managed-cloud/providers.js';
import { findAccountByToken, getEnrichmentItems, getOnboardingSession, recordFunnelEvent, saveEnrichmentItems, updateEnrichmentSelections, upsertOnboardingSession } from '../../lib/managed-cloud/store.js';
import { jsonResponse, readJson } from '../../lib/managed-cloud/utils.js';

export async function onRequestPost({ request, env, params }) {
  const account = await findAccountByToken(env, params.token);
  if (!account) {
    return jsonResponse({ success: false, error: 'Account not found.' }, { status: 404 });
  }
  const body = await readJson(request);

  if (Array.isArray(body.items)) {
    const items = await updateEnrichmentSelections(env, params.token, body.items);
    return jsonResponse({ success: true, items });
  }

  const session = await getOnboardingSession(env, params.token);
  const identity = body.identity || session?.profile?.identity || {};
  if (!identity?.raw && !identity?.name) {
    return jsonResponse({ success: false, error: 'Identity details are required before enrichment can run.' }, { status: 400 });
  }
  const items = await runBraveEnrichment(env, identity);
  const saved = await saveEnrichmentItems(env, params.token, items);
  await upsertOnboardingSession(env, params.token, { enrichment_requested: true });
  await recordFunnelEvent(env, {
    token: params.token,
    event_name: 'enrichment_requested',
    page: '/onboarding',
    properties: { result_count: saved.length },
  });
  return jsonResponse({ success: true, items: saved });
}
