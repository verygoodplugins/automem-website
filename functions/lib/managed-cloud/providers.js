import {
  PLAN_PRICE_ENV,
  PROFESSIONAL_SOURCE_HOSTS,
  STRIPE_API_VERSION,
} from './constants.js';
import {
  buildAbsoluteUrl,
  nowIso,
  randomId,
} from './utils.js';
import {
  getOnboardingSession,
  updateAccount,
} from './store.js';
import { createSignedToken } from '../tokens.js';
import { buildManagedCloudVerifyEmail } from '../email.js';

function shortToken(token = '') {
  return token.replace(/^am_live_/, '').slice(0, 8) || randomId('').slice(0, 8);
}

function formEncode(fields = {}) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    form.append(key, String(value));
  }
  return form;
}

async function stripeRequest(env, path, body) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Stripe-Version': STRIPE_API_VERSION,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stripe request failed (${response.status}): ${text}`);
  }
  return response.json();
}

export async function createStripeCustomer(env, { email, name }) {
  if (!env?.STRIPE_SECRET_KEY) {
    return { id: randomId('cus_mock_') };
  }
  return stripeRequest(env, '/v1/customers', formEncode({ email, name }));
}

export async function createCheckoutSession(env, request, account, plan) {
  const success_url = buildAbsoluteUrl(request, env, '/dashboard', {
    token: account.token,
    checkout: 'success',
  });
  const cancel_url = buildAbsoluteUrl(request, env, '/subscribe', {
    token: account.token,
    checkout: 'cancelled',
  });
  if (!env?.STRIPE_SECRET_KEY) {
    return { url: success_url };
  }
  const priceEnvKey = PLAN_PRICE_ENV[plan];
  const priceId = priceEnvKey ? env[priceEnvKey] : null;
  if (!priceId) {
    throw new Error(`Missing Stripe price ID for ${plan}`);
  }
  const body = formEncode({
    mode: 'subscription',
    customer: account.stripe_customer_id,
    success_url,
    cancel_url,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': 1,
    'metadata[token]': account.token,
    'metadata[plan]': plan,
    'subscription_data[billing_mode][type]': 'flexible',
    'subscription_data[metadata][token]': account.token,
    'subscription_data[metadata][plan]': plan,
  });
  return stripeRequest(env, '/v1/checkout/sessions', body);
}

export async function createCustomerPortalSession(env, request, account) {
  const return_url = buildAbsoluteUrl(request, env, '/dashboard', { token: account.token });
  if (!env?.STRIPE_SECRET_KEY) {
    return { url: `${return_url}&portal=mock` };
  }
  return stripeRequest(env, '/v1/billing_portal/sessions', formEncode({
    customer: account.stripe_customer_id,
    return_url,
  }));
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function signHmac(secret, payload) {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyStripeWebhook(env, request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') || '';
  if (!env?.STRIPE_WEBHOOK_SECRET) {
    return { event: JSON.parse(body || '{}'), rawBody: body };
  }
  const parts = Object.fromEntries(signature.split(',').map((entry) => entry.split('=')));
  const signedPayload = `${parts.t}.${body}`;
  const expected = await signHmac(env.STRIPE_WEBHOOK_SECRET, signedPayload);
  if (expected !== parts.v1) {
    throw new Error('Invalid Stripe webhook signature');
  }
  return { event: JSON.parse(body || '{}'), rawBody: body };
}

export async function createInstapodsPod(env, account) {
  const features = JSON.stringify(account.features || {});
  if (!env?.INSTAPODS_API_KEY || !env?.INSTAPODS_API_URL) {
    const pod_url = `https://automem-${shortToken(account.token)}.instapods.mock`;
    return {
      pod_id: randomId('pod_mock_'),
      url: pod_url,
      mcp_url: `${pod_url}/mcp`,
      status: 'provisioning',
      created_at: nowIso(),
    };
  }
  const response = await fetch(`${env.INSTAPODS_API_URL.replace(/\/$/, '')}/v1/pods`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.INSTAPODS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app: 'automem',
      name: `automem-${shortToken(account.token)}`,
      plan: account.tier === 'ultimate' ? 'grow' : 'scale',
      region: env.INSTAPODS_REGION || 'eu-nbg',
      env: {
        AUTOMEM_API_TOKEN: account.token,
        AUTOMEM_TIER: account.tier,
        AUTOMEM_FEATURES: features,
      },
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Instapods provisioning failed (${response.status}): ${text}`);
  }
  const payload = await response.json();
  return {
    pod_id: payload.pod_id,
    url: payload.url,
    mcp_url: payload.url ? `${payload.url.replace(/\/$/, '')}/mcp` : null,
    status: payload.status || 'provisioning',
  };
}

export async function refreshProvisioningStatus(env, account) {
  if (!account || !['provisioning', 'creating'].includes(account.status)) {
    return account;
  }
  if (!env?.INSTAPODS_API_KEY || !env?.INSTAPODS_API_URL) {
    const ageMs = Date.now() - new Date(account.created_at).getTime();
    if (ageMs > 4000) {
      return updateAccount(env, account.token, {
        status: 'ready',
        mcp_url: account.mcp_url || `${account.pod_url}/mcp`,
      });
    }
    return account;
  }

  if (!account.instapods_pod_id) {
    return account;
  }
  const response = await fetch(
    `${env.INSTAPODS_API_URL.replace(/\/$/, '')}/v1/pods/${account.instapods_pod_id}`,
    { headers: { Authorization: `Bearer ${env.INSTAPODS_API_KEY}` } },
  );
  if (!response.ok) {
    return account;
  }
  const payload = await response.json();
  const nextStatus = payload.status === 'ready' ? 'ready' : account.status;
  return updateAccount(env, account.token, {
    status: nextStatus,
    pod_url: payload.url || account.pod_url,
    mcp_url: payload.url ? `${payload.url.replace(/\/$/, '')}/mcp` : account.mcp_url,
  });
}

function hostAllowed(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return PROFESSIONAL_SOURCE_HOSTS.some((candidate) => host === candidate || host.endsWith(`.${candidate}`));
  } catch {
    return false;
  }
}

function sourceTypeFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.includes('linkedin')) return 'linkedin';
    if (host.includes('github')) return 'github';
    if (host.includes('x.com') || host.includes('twitter')) return 'x';
    if (host.includes('youtube')) return 'video';
    return 'web';
  } catch {
    return 'web';
  }
}

function buildEnrichmentItem({ url, title, description }) {
  return {
    item_key: `${sourceTypeFromUrl(url)}:${url}`,
    source_url: url,
    source_type: sourceTypeFromUrl(url),
    title: title || url,
    summary: description || 'Public profile or professional source.',
    approved: true,
    raw: { url, title, description },
  };
}

export async function runBraveEnrichment(env, identity) {
  const query = [identity.name, identity.company, identity.role].filter(Boolean).join(' ').trim();
  if (!query) {
    return [];
  }
  if (!env?.BRAVE_SEARCH_API_KEY) {
    return [
      buildEnrichmentItem({
        url: `https://github.com/${query.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title: `${identity.name || 'Profile'} on GitHub`,
        description: `Public profile result for ${query}.`,
      }),
    ];
  }
  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': env.BRAVE_SEARCH_API_KEY,
      },
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Brave enrichment failed (${response.status}): ${text}`);
  }
  const payload = await response.json();
  const results = payload.web?.results || [];
  return results
    .filter((entry) => hostAllowed(entry.url))
    .slice(0, 8)
    .map((entry) => buildEnrichmentItem({
      url: entry.url,
      title: entry.title,
      description: entry.description,
    }));
}

export async function sendManagedCloudVerificationEmail(env, request, account) {
  if (!env?.RESEND_API_KEY) {
    return null;
  }
  const confirmationToken = await createSignedToken(
    {
      purpose: 'managed-cloud-verification',
      email: account.email,
      token: account.token,
      redirect_path: `/onboarding?token=${encodeURIComponent(account.token)}&confirmed=1`,
    },
    env.CONFIRM_SECRET || env.ADMIN_TOKEN || account.token,
    60 * 60 * 24 * 3,
  );
  const unsubscribeToken = await createSignedToken(
    {
      purpose: 'unsubscribe',
      email: account.email,
    },
    env.CONFIRM_SECRET || env.ADMIN_TOKEN || account.token,
    60 * 60 * 24 * 30,
  );
  const baseUrl = env.BASE_URL || new URL(request.url).origin;
  const confirmUrl = `${baseUrl}/confirm?token=${encodeURIComponent(confirmationToken)}`;
  const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const { subject, html, text } = buildManagedCloudVerifyEmail({
    baseUrl,
    confirmUrl,
    unsubscribeUrl,
    name: account.name,
  });
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${env.FROM_NAME || 'AutoMem'} <${env.FROM_EMAIL || 'no-reply@automem.ai'}>`,
      to: [account.email],
      subject,
      html,
      text,
    }),
  });
}

export async function generateInterviewReply(env, session, userMessage) {
  if (!env?.ANTHROPIC_API_KEY) {
    return null;
  }
  const transcript = [...(session.transcript || []), ...(userMessage ? [{ role: 'user', content: userMessage }] : [])]
    .map((entry) => ({ role: entry.role, content: entry.content }));
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
      max_tokens: 220,
      system:
        'You are the AutoMem onboarding assistant. Ask one warm, brief question at a time and keep the full interview under five exchanges. Acknowledge the user briefly before moving forward.',
      messages: transcript,
    }),
  });
  if (!response.ok) {
    return null;
  }
  const payload = await response.json();
  const content = payload.content?.map((part) => part.text).join('\n').trim();
  return content || null;
}

export async function submitPreseedPayload(env, account, payload) {
  if (!account?.pod_url) {
    return {
      memories_created: payload.memories.length,
      associations_created: payload.associations.length,
      mocked: true,
    };
  }
  if (!env?.AUTOMEM_CORE_PRESEED_ENABLED || String(env.AUTOMEM_CORE_PRESEED_ENABLED) === 'false') {
    return {
      memories_created: payload.memories.length,
      associations_created: payload.associations.length,
      mocked: true,
    };
  }
  const response = await fetch(
    `${account.pod_url.replace(/\/$/, '')}${env.AUTOMEM_CORE_PRESEED_PATH || '/api/v1/preseed'}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.token}`,
        'Content-Type': 'application/json',
        'X-AutoMem-Internal': 'preseed',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Preseed request failed (${response.status}): ${text}`);
  }
  return response.json();
}

export async function fetchPodStats(env, account) {
  if (!account?.pod_url || account.status === 'provisioning') {
    return null;
  }
  if (!env?.AUTOMEM_CORE_STATS_ENABLED || String(env.AUTOMEM_CORE_STATS_ENABLED) === 'false') {
    const onboarding = await getOnboardingSession(env, account.token);
    const summary = onboarding?.preseed_summary || {};
    return {
      memories_stored: summary.memories_created || 0,
      associations: summary.associations_created || 0,
      last_activity: summary.preseeded_at || onboarding?.preseeded_at || null,
    };
  }
  try {
    const response = await fetch(
      `${account.pod_url.replace(/\/$/, '')}${env.AUTOMEM_CORE_STATS_PATH || '/api/v1/stats'}`,
      {
        headers: {
          Authorization: `Bearer ${account.token}`,
        },
      },
    );
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}
