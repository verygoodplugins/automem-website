export interface ManagedCloudStatus {
  token: string;
  status: string;
  pod_url: string | null;
  mcp_url: string | null;
  tier: string;
  email_verified: boolean;
  trial_days_remaining: number | null;
  connected_agents: string[];
  stats: {
    memories_stored: number;
    associations: number;
    last_activity: string | null;
  };
  onboarding: {
    interview_complete: boolean;
    skipped: boolean;
    preseeded_at: string | null;
    preseed_summary?: {
      memories_created?: number;
      associations_created?: number;
    };
  };
  install_command: string;
  manual_config: string | null;
}

export function canRevealInstall(status: ManagedCloudStatus | null) {
  if (!status) {
    return false;
  }
  const podReady = ['ready', 'active'].includes(status.status);
  const onboardingDone = Boolean(status.onboarding?.preseeded_at || status.onboarding?.skipped);
  return Boolean(status.email_verified && podReady && onboardingDone);
}

export function statusCopy(status: string) {
  if (status === 'active') return 'Active';
  if (status === 'ready') return 'Ready';
  if (status === 'locked') return 'Locked';
  if (status === 'cancelled') return 'Cancelled';
  return 'Provisioning';
}

export function trialCopy(daysRemaining: number | null, tier: string) {
  if (tier !== 'starter') {
    return tier === 'ultimate' ? 'Ultimate plan' : 'Pro plan';
  }
  if (daysRemaining === null) {
    return 'Free trial';
  }
  if (daysRemaining <= 0) {
    return 'Trial ended';
  }
  return `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left in trial`;
}

export async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }
  return payload as T;
}

export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }
  return payload as T;
}

export function copyToClipboard(value: string) {
  return navigator.clipboard?.writeText(value);
}
