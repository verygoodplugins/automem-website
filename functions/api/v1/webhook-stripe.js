import { findAccountByStripeCustomer, recordWebhookEvent, hasWebhookEvent, updateAccount } from '../../lib/managed-cloud/store.js';
import { jsonResponse } from '../../lib/managed-cloud/utils.js';
import { verifyStripeWebhook } from '../../lib/managed-cloud/providers.js';

function tierFromPlan(plan = '') {
  const normalized = String(plan || '').toLowerCase();
  return ['pro', 'ultimate'].includes(normalized) ? normalized : 'starter';
}

export async function onRequestPost({ request, env }) {
  const { event } = await verifyStripeWebhook(env, request);
  const eventId = event.id || `stripe-${Date.now()}`;
  if (await hasWebhookEvent(env, 'stripe', eventId)) {
    return jsonResponse({ success: true, deduped: true });
  }

  const object = event.data?.object || {};
  const customerId = object.customer || object.customer_id || object.customer_details?.customer;
  const account = customerId ? await findAccountByStripeCustomer(env, customerId) : null;

  if (account) {
    const metadataPlan = object.metadata?.plan || object.subscription_details?.metadata?.plan;
    const subscriptionId = object.subscription || object.id;
    if (event.type === 'checkout.session.completed') {
      await updateAccount(env, account.token, {
        tier: tierFromPlan(metadataPlan),
        status: 'active',
        stripe_subscription_id: subscriptionId,
      });
    }
    if (event.type === 'invoice.paid') {
      await updateAccount(env, account.token, {
        status: 'active',
      });
    }
    if (event.type === 'invoice.payment_failed') {
      await updateAccount(env, account.token, {
        status: 'locked',
      });
    }
    if (event.type === 'customer.subscription.deleted') {
      await updateAccount(env, account.token, {
        status: 'cancelled',
        stripe_subscription_id: object.id || account.stripe_subscription_id,
      });
    }
    if (event.type === 'customer.subscription.updated') {
      await updateAccount(env, account.token, {
        status: object.status === 'active' ? 'active' : account.status,
        tier: tierFromPlan(object.metadata?.plan || metadataPlan || account.tier),
        stripe_subscription_id: object.id || account.stripe_subscription_id,
      });
    }
  }

  await recordWebhookEvent(env, 'stripe', eventId, event.type, event);
  return jsonResponse({ success: true });
}
