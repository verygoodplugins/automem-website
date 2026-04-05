import { fetchPodStats, refreshProvisioningStatus } from '../../lib/managed-cloud/providers.js';
import { findAccountByToken, getOnboardingSession } from '../../lib/managed-cloud/store.js';
import { buildManualConfigSnippet, buildInstallCommand, daysRemaining, jsonResponse } from '../../lib/managed-cloud/utils.js';

export async function onRequestGet({ env, params }) {
  const account = await findAccountByToken(env, params.token);
  if (!account) {
    return jsonResponse({ success: false, error: 'Account not found.' }, { status: 404 });
  }
  const refreshed = await refreshProvisioningStatus(env, account);
  const onboarding = await getOnboardingSession(env, refreshed.token);
  const stats = await fetchPodStats(env, refreshed);

  return jsonResponse({
    success: true,
    token: refreshed.token,
    status: refreshed.status,
    pod_url: refreshed.pod_url,
    mcp_url: refreshed.mcp_url,
    tier: refreshed.tier,
    email_verified: Boolean(refreshed.email_verified_at),
    connected_agents: refreshed.connected_agents || [],
    trial_days_remaining: daysRemaining(refreshed.trial_end),
    features: refreshed.features || {},
    stats: {
      memories_stored: stats?.memories_stored || 0,
      associations: stats?.associations || 0,
      last_activity: stats?.last_activity || onboarding?.preseeded_at || null,
    },
    onboarding: {
      interview_complete: Boolean(onboarding?.interview_complete),
      skipped: Boolean(onboarding?.skipped),
      preseeded_at: onboarding?.preseeded_at || null,
      preseed_summary: onboarding?.preseed_summary || {},
    },
    install_command: buildInstallCommand(refreshed.token),
    manual_config: refreshed.mcp_url
      ? buildManualConfigSnippet(refreshed.mcp_url, refreshed.token)
      : null,
  });
}
