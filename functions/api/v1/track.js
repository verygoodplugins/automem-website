import { recordFunnelEvent } from '../../lib/managed-cloud/store.js';
import { jsonResponse, readJson } from '../../lib/managed-cloud/utils.js';

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body.event_name) {
    return jsonResponse({ success: false, error: 'event_name is required.' }, { status: 400 });
  }
  await recordFunnelEvent(env, {
    token: body.token || null,
    event_name: body.event_name,
    page: body.page || null,
    properties: body.properties || {},
  });
  return jsonResponse({ success: true });
}
