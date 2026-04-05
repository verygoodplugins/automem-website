import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { onRequestPost as signup } from '../functions/api/v1/signup.js';
import { onRequestGet as status } from '../functions/api/v1/status.js';
import { onRequestGet as onboardingGet, onRequestPost as onboardingPost } from '../functions/api/v1/onboarding.js';
import { onRequestPost as enrich } from '../functions/api/v1/enrich.js';
import { onRequestPost as preseed } from '../functions/api/v1/preseed.js';
import { onRequestPost as subscribe } from '../functions/api/v1/subscribe.js';
import { onRequestPost as customerPortal } from '../functions/api/v1/customer-portal.js';
import { onRequestPost as stripeWebhook } from '../functions/api/v1/webhook-stripe.js';
import { onRequestGet as confirm } from '../functions/confirm.js';
import { createSignedToken } from '../functions/lib/tokens.js';

function jsonRequest(path, body, method = 'POST', headers = {}) {
  return new Request(`https://automem.ai${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function readJson(response) {
  return response.json();
}

beforeEach(() => {
  delete globalThis.__AUTOMEM_MANAGED_CLOUD_DEV_STORE;
});

test('managed cloud signup is idempotent and status upgrades mock provisioning', async () => {
  const env = { ADMIN_TOKEN: 'secret', BASE_URL: 'https://automem.ai' };
  const first = await signup({
    request: jsonRequest('/api/v1/signup', { email: 'maya@example.com', name: 'Maya' }),
    env,
  });
  const firstPayload = await readJson(first);
  assert.equal(first.status, 200);
  assert.match(firstPayload.token, /^am_live_[a-z0-9]+$/);

  const second = await signup({
    request: jsonRequest('/api/v1/signup', { email: 'maya@example.com', name: 'Maya' }),
    env,
  });
  const secondPayload = await readJson(second);
  assert.equal(secondPayload.token, firstPayload.token);

  const store = globalThis.__AUTOMEM_MANAGED_CLOUD_DEV_STORE;
  store.accounts.get('maya@example.com').created_at = '2026-01-01T00:00:00.000Z';

  const confirmToken = await createSignedToken(
    {
      purpose: 'managed-cloud-verification',
      email: 'maya@example.com',
      token: firstPayload.token,
      redirect_path: `/onboarding?token=${firstPayload.token}`,
    },
    env.ADMIN_TOKEN,
  );
  const confirmResponse = await confirm({
    request: new Request(`https://automem.ai/confirm?token=${encodeURIComponent(confirmToken)}`),
    env,
  });
  assert.equal(confirmResponse.status, 302);

  const statusResponse = await status({
    env,
    params: { token: firstPayload.token },
  });
  const statusPayload = await readJson(statusResponse);
  assert.equal(statusPayload.email_verified, true);
  assert.equal(statusPayload.status, 'ready');
  assert.equal(statusPayload.connected_agents.length, 0);
});

test('onboarding, enrichment, and preseed persist mocked managed cloud state', async () => {
  const env = { ADMIN_TOKEN: 'secret', BASE_URL: 'https://automem.ai' };
  const signupResponse = await signup({
    request: jsonRequest('/api/v1/signup', { email: 'sam@example.com', name: 'Sam' }),
    env,
  });
  const signupPayload = await readJson(signupResponse);
  const token = signupPayload.token;

  const store = globalThis.__AUTOMEM_MANAGED_CLOUD_DEV_STORE;
  const account = store.accounts.get('sam@example.com');
  account.status = 'ready';
  account.email_verified_at = '2026-04-03T00:00:00.000Z';

  const onboardingState = await onboardingGet({
    env,
    params: { token },
  });
  const initialPayload = await readJson(onboardingState);
  assert.ok(initialPayload.onboarding.transcript[0].content.includes('Welcome to AutoMem Managed Cloud'));

  await onboardingPost({
    request: jsonRequest(`/api/v1/onboarding/${token}/chat`, { message: "I'm Sam, a product engineer at Acme." }),
    env,
    params: { token },
  });
  await onboardingPost({
    request: jsonRequest(`/api/v1/onboarding/${token}/chat`, { message: 'Claude Code, Cursor, and ChatGPT.' }),
    env,
    params: { token },
  });
  await onboardingPost({
    request: jsonRequest(`/api/v1/onboarding/${token}/chat`, { message: 'Shipping our onboarding revamp this month.' }),
    env,
    params: { token },
  });
  await onboardingPost({
    request: jsonRequest(`/api/v1/onboarding/${token}/chat`, { message: 'Be direct and concise with examples.' }),
    env,
    params: { token },
  });
  const finalTurn = await onboardingPost({
    request: jsonRequest(`/api/v1/onboarding/${token}/chat`, { message: 'I work closely with growth and product design.' }),
    env,
    params: { token },
  });
  const finalTurnPayload = await readJson(finalTurn);
  assert.equal(finalTurnPayload.onboarding.interview_complete, true);

  const enrichmentResponse = await enrich({
    request: jsonRequest(`/api/v1/enrich/${token}`, {
      identity: { name: 'Sam', company: 'Acme', role: 'Product engineer' },
    }),
    env,
    params: { token },
  });
  const enrichmentPayload = await readJson(enrichmentResponse);
  assert.ok(enrichmentPayload.items.length >= 1);

  const preseedResponse = await preseed({
    env,
    params: { token },
  });
  const preseedPayload = await readJson(preseedResponse);
  assert.ok(preseedPayload.memories_created >= 4);

  const statusResponse = await status({
    env,
    params: { token },
  });
  const statusPayload = await readJson(statusResponse);
  assert.ok(statusPayload.stats.memories_stored >= 4);
  assert.ok(statusPayload.onboarding.preseeded_at);
});

test('billing routes and webhook updates work in mock mode', async () => {
  const env = { ADMIN_TOKEN: 'secret', BASE_URL: 'https://automem.ai' };
  const signupResponse = await signup({
    request: jsonRequest('/api/v1/signup', { email: 'billing@example.com', name: 'Bill' }),
    env,
  });
  const signupPayload = await readJson(signupResponse);
  const token = signupPayload.token;

  const subscribeResponse = await subscribe({
    request: jsonRequest(`/api/v1/subscribe/${token}`, { plan: 'pro' }),
    env,
    params: { token },
  });
  const subscribePayload = await readJson(subscribeResponse);
  assert.ok(subscribePayload.url.includes('/dashboard'));

  const portalResponse = await customerPortal({
    request: jsonRequest(`/api/v1/customer-portal/${token}`, {}),
    env,
    params: { token },
  });
  const portalPayload = await readJson(portalResponse);
  assert.ok(portalPayload.url.includes('/dashboard'));

  const customerId = globalThis.__AUTOMEM_MANAGED_CLOUD_DEV_STORE.accounts.get('billing@example.com').stripe_customer_id;
  const webhookResponse = await stripeWebhook({
    request: new Request('https://automem.ai/api/v1/webhook/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: customerId,
            subscription: 'sub_123',
            metadata: { plan: 'pro' },
          },
        },
      }),
    }),
    env,
  });
  const webhookPayload = await readJson(webhookResponse);
  assert.equal(webhookPayload.success, true);

  const deduped = await stripeWebhook({
    request: new Request('https://automem.ai/api/v1/webhook/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: { object: { customer: customerId, subscription: 'sub_123', metadata: { plan: 'pro' } } },
      }),
    }),
    env,
  });
  const dedupedPayload = await readJson(deduped);
  assert.equal(dedupedPayload.deduped, true);
});
