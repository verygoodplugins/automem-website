import { findAccountByInstapodsPod, hasWebhookEvent, recordWebhookEvent, updateAccount } from '../../lib/managed-cloud/store.js';
import { jsonResponse, readJson } from '../../lib/managed-cloud/utils.js';

export async function onRequestPost({ request, env }) {
  const event = await readJson(request);
  const eventId = event.id || `instapods-${Date.now()}`;
  if (await hasWebhookEvent(env, 'instapods', eventId)) {
    return jsonResponse({ success: true, deduped: true });
  }
  const data = event.data || {};
  const podId = data.pod_id || data.id;
  const account = podId ? await findAccountByInstapodsPod(env, podId) : null;
  if (account) {
    const nextStatus = event.type === 'pod.ready'
      ? 'ready'
      : event.type === 'pod.error'
        ? 'locked'
        : data.status || account.status;
    await updateAccount(env, account.token, {
      status: nextStatus,
      pod_url: data.url || account.pod_url,
      mcp_url: data.url ? `${String(data.url).replace(/\/$/, '')}/mcp` : account.mcp_url,
    });
  }
  await recordWebhookEvent(env, 'instapods', eventId, event.type || 'instapods.event', event);
  return jsonResponse({ success: true });
}
