import { DEFAULT_TRIAL_DAYS } from '../../lib/managed-cloud/constants.js';
import { createInstapodsPod, createStripeCustomer, sendManagedCloudVerificationEmail } from '../../lib/managed-cloud/providers.js';
import { createDefaultOnboardingSession, findAccountByEmail, insertAccount, putIdempotencyRecord, getIdempotencyRecord, recordFunnelEvent } from '../../lib/managed-cloud/store.js';
import { buildFeaturesForTier, buildAbsoluteUrl, addDays, generateManagedToken, isValidEmail, jsonResponse, normalizeEmail, nowIso, readJson } from '../../lib/managed-cloud/utils.js';

async function verifyTurnstile(request, env, turnstileToken) {
  if (!env?.TURNSTILE_SECRET_KEY) {
    return true;
  }
  if (!turnstileToken) {
    return false;
  }
  const form = new URLSearchParams();
  form.set('secret', env.TURNSTILE_SECRET_KEY);
  form.set('response', turnstileToken);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) {
    form.set('remoteip', ip);
  }
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  const payload = await response.json();
  return Boolean(payload.success);
}

export async function onRequestPost({ request, env, waitUntil }) {
  const body = await readJson(request);
  const url = new URL(request.url);
  const email = normalizeEmail(body.email || url.searchParams.get('email'));
  const name = String(body.name || url.searchParams.get('name') || '').trim();
  const source = String(body.source || url.searchParams.get('source') || '/start');

  if (!await verifyTurnstile(request, env, body.turnstileToken || url.searchParams.get('turnstileToken'))) {
    return jsonResponse({ success: false, error: 'Verification failed.' }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return jsonResponse({ success: false, error: 'Enter a valid email address.' }, { status: 400 });
  }

  const idempotencyKey = request.headers.get('x-idempotency-key');
  if (idempotencyKey) {
    const existingRecord = await getIdempotencyRecord(env, idempotencyKey);
    if (existingRecord?.response) {
      return jsonResponse(existingRecord.response);
    }
  }

  const existing = await findAccountByEmail(env, email);
  if (existing) {
    const response = {
      success: true,
      token: existing.token,
      status: existing.status,
      requires_email_verification: !existing.email_verified_at,
      onboarding_url: buildAbsoluteUrl(request, env, '/onboarding', { token: existing.token }),
      trial_days_remaining: DEFAULT_TRIAL_DAYS,
    };
    await recordFunnelEvent(env, {
      token: existing.token,
      event_name: 'signup_revisit',
      page: source,
      properties: { email },
    });
    return jsonResponse(response);
  }

  const created_at = nowIso();
  const token = generateManagedToken();
  const stripeCustomer = await createStripeCustomer(env, { email, name });

  const accountDraft = {
    token,
    email,
    name,
    email_verified_at: null,
    stripe_customer_id: stripeCustomer.id,
    stripe_subscription_id: null,
    instapods_pod_id: null,
    pod_url: null,
    mcp_url: null,
    tier: 'starter',
    status: 'provisioning',
    connected_agents: [],
    features: buildFeaturesForTier('starter'),
    trial_start: created_at,
    trial_end: addDays(created_at, DEFAULT_TRIAL_DAYS),
    created_at,
    updated_at: created_at,
  };

  const instapodsPod = await createInstapodsPod(env, accountDraft);
  const account = await insertAccount(env, {
    ...accountDraft,
    instapods_pod_id: instapodsPod.pod_id,
    pod_url: instapodsPod.url,
    mcp_url: instapodsPod.mcp_url,
    status: instapodsPod.status || 'provisioning',
  });
  await createDefaultOnboardingSession(env, token);
  await recordFunnelEvent(env, {
    token,
    event_name: 'signup_created',
    page: source,
    properties: {
      has_name: Boolean(name),
    },
  });

  if (typeof waitUntil === 'function') {
    waitUntil(sendManagedCloudVerificationEmail(env, request, account).catch(() => null));
  } else {
    await sendManagedCloudVerificationEmail(env, request, account).catch(() => null);
  }

  const response = {
    success: true,
    token,
    status: account.status,
    requires_email_verification: true,
    onboarding_url: buildAbsoluteUrl(request, env, '/onboarding', { token }),
    trial_days_remaining: DEFAULT_TRIAL_DAYS,
  };
  if (idempotencyKey) {
    await putIdempotencyRecord(env, {
      idempotency_key: idempotencyKey,
      scope: 'signup',
      response,
    });
  }
  return jsonResponse(response);
}
