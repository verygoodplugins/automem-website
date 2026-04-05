import { nowIso, safeJsonParse } from './utils.js';

function getDb(env) {
  return env?.D1 || env?.DB || null;
}

function getDevStore() {
  if (!globalThis.__AUTOMEM_MANAGED_CLOUD_DEV_STORE) {
    globalThis.__AUTOMEM_MANAGED_CLOUD_DEV_STORE = {
      accounts: new Map(),
      onboarding: new Map(),
      enrichment: new Map(),
      webhookEvents: new Set(),
      idempotency: new Map(),
      funnelEvents: [],
    };
  }
  return globalThis.__AUTOMEM_MANAGED_CLOUD_DEV_STORE;
}

function hydrateAccount(row) {
  if (!row) {
    return null;
  }
  return {
    ...row,
    connected_agents: safeJsonParse(row.connected_agents_json, []),
    features: safeJsonParse(row.features_json, {}),
  };
}

function hydrateOnboarding(row) {
  if (!row) {
    return null;
  }
  return {
    ...row,
    transcript: safeJsonParse(row.transcript_json, []),
    profile: safeJsonParse(row.profile_json, {}),
    preseed_summary: safeJsonParse(row.preseed_summary_json, {}),
    interview_complete: Boolean(row.interview_complete),
    skipped: Boolean(row.skipped),
    enrichment_requested: Boolean(row.enrichment_requested),
  };
}

function hydrateEnrichment(row) {
  if (!row) {
    return null;
  }
  return {
    ...row,
    approved: Boolean(row.approved),
    raw: safeJsonParse(row.raw_json, {}),
  };
}

function serializeAccount(account) {
  return {
    ...account,
    connected_agents_json: JSON.stringify(account.connected_agents || []),
    features_json: JSON.stringify(account.features || {}),
  };
}

function serializeOnboarding(session) {
  return {
    ...session,
    transcript_json: JSON.stringify(session.transcript || []),
    profile_json: JSON.stringify(session.profile || {}),
    preseed_summary_json: JSON.stringify(session.preseed_summary || {}),
    interview_complete: session.interview_complete ? 1 : 0,
    skipped: session.skipped ? 1 : 0,
    enrichment_requested: session.enrichment_requested ? 1 : 0,
  };
}

function serializeEnrichment(item) {
  return {
    ...item,
    approved: item.approved ? 1 : 0,
    raw_json: JSON.stringify(item.raw || {}),
  };
}

export async function findAccountByEmail(env, email) {
  const db = getDb(env);
  if (!db) {
    return getDevStore().accounts.get(email) || null;
  }
  const row = await db.prepare('SELECT * FROM managed_accounts WHERE email = ?').bind(email).first();
  return hydrateAccount(row);
}

export async function findAccountByToken(env, token) {
  const db = getDb(env);
  if (!db) {
    const store = getDevStore();
    for (const account of store.accounts.values()) {
      if (account.token === token) {
        return account;
      }
    }
    return null;
  }
  const row = await db.prepare('SELECT * FROM managed_accounts WHERE token = ?').bind(token).first();
  return hydrateAccount(row);
}

export async function findAccountByStripeCustomer(env, customerId) {
  const db = getDb(env);
  if (!db) {
    const store = getDevStore();
    for (const account of store.accounts.values()) {
      if (account.stripe_customer_id === customerId) {
        return account;
      }
    }
    return null;
  }
  const row = await db.prepare('SELECT * FROM managed_accounts WHERE stripe_customer_id = ?').bind(customerId).first();
  return hydrateAccount(row);
}

export async function findAccountByInstapodsPod(env, podId) {
  const db = getDb(env);
  if (!db) {
    const store = getDevStore();
    for (const account of store.accounts.values()) {
      if (account.instapods_pod_id === podId) {
        return account;
      }
    }
    return null;
  }
  const row = await db.prepare('SELECT * FROM managed_accounts WHERE instapods_pod_id = ?').bind(podId).first();
  return hydrateAccount(row);
}

export async function insertAccount(env, account) {
  const db = getDb(env);
  const record = serializeAccount(account);
  if (!db) {
    getDevStore().accounts.set(record.email, hydrateAccount(record));
    return hydrateAccount(record);
  }
  await db.prepare(
    `INSERT INTO managed_accounts (
      token, email, name, email_verified_at, stripe_customer_id, stripe_subscription_id,
      instapods_pod_id, pod_url, mcp_url, tier, status, connected_agents_json,
      features_json, trial_start, trial_end, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    record.token,
    record.email,
    record.name || null,
    record.email_verified_at || null,
    record.stripe_customer_id || null,
    record.stripe_subscription_id || null,
    record.instapods_pod_id || null,
    record.pod_url || null,
    record.mcp_url || null,
    record.tier,
    record.status,
    record.connected_agents_json,
    record.features_json,
    record.trial_start || null,
    record.trial_end || null,
    record.created_at,
    record.updated_at,
  ).run();
  return findAccountByToken(env, record.token);
}

export async function updateAccount(env, token, patch) {
  const db = getDb(env);
  const existing = await findAccountByToken(env, token);
  if (!existing) {
    return null;
  }
  const next = hydrateAccount(serializeAccount({
    ...existing,
    ...patch,
    updated_at: patch.updated_at || nowIso(),
  }));
  if (!db) {
    getDevStore().accounts.set(next.email, next);
    return next;
  }

  const raw = serializeAccount(next);
  const fields = {
    name: raw.name || null,
    email_verified_at: raw.email_verified_at || null,
    stripe_customer_id: raw.stripe_customer_id || null,
    stripe_subscription_id: raw.stripe_subscription_id || null,
    instapods_pod_id: raw.instapods_pod_id || null,
    pod_url: raw.pod_url || null,
    mcp_url: raw.mcp_url || null,
    tier: raw.tier,
    status: raw.status,
    connected_agents_json: raw.connected_agents_json,
    features_json: raw.features_json,
    trial_start: raw.trial_start || null,
    trial_end: raw.trial_end || null,
    updated_at: raw.updated_at,
  };
  const entries = Object.entries(fields);
  const assignments = entries.map(([key]) => `${key} = ?`).join(', ');
  await db.prepare(`UPDATE managed_accounts SET ${assignments} WHERE token = ?`)
    .bind(...entries.map(([, value]) => value), token)
    .run();
  return findAccountByToken(env, token);
}

export async function createDefaultOnboardingSession(env, token) {
  const db = getDb(env);
  const created_at = nowIso();
  const record = serializeOnboarding({
    token,
    transcript: [],
    profile: {},
    current_question_index: 0,
    interview_complete: false,
    skipped: false,
    enrichment_requested: false,
    preseed_summary: {},
    completed_at: null,
    preseeded_at: null,
    created_at,
    updated_at: created_at,
  });
  if (!db) {
    getDevStore().onboarding.set(token, hydrateOnboarding(record));
    return hydrateOnboarding(record);
  }
  await db.prepare(
    `INSERT OR IGNORE INTO onboarding_sessions (
      token, transcript_json, profile_json, current_question_index, interview_complete,
      skipped, enrichment_requested, preseed_summary_json, completed_at, preseeded_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    record.token,
    record.transcript_json,
    record.profile_json,
    record.current_question_index,
    record.interview_complete,
    record.skipped,
    record.enrichment_requested,
    record.preseed_summary_json,
    null,
    null,
    record.created_at,
    record.updated_at,
  ).run();
  return getOnboardingSession(env, token);
}

export async function getOnboardingSession(env, token) {
  const db = getDb(env);
  if (!db) {
    return getDevStore().onboarding.get(token) || null;
  }
  const row = await db.prepare('SELECT * FROM onboarding_sessions WHERE token = ?').bind(token).first();
  return hydrateOnboarding(row);
}

export async function upsertOnboardingSession(env, token, patch) {
  const db = getDb(env);
  const existing = await getOnboardingSession(env, token);
  const base = existing || await createDefaultOnboardingSession(env, token);
  const next = hydrateOnboarding(serializeOnboarding({
    ...base,
    ...patch,
    updated_at: patch.updated_at || nowIso(),
  }));
  if (!db) {
    getDevStore().onboarding.set(token, next);
    return next;
  }
  const raw = serializeOnboarding(next);
  await db.prepare(
    `UPDATE onboarding_sessions
     SET transcript_json = ?, profile_json = ?, current_question_index = ?, interview_complete = ?,
         skipped = ?, enrichment_requested = ?, preseed_summary_json = ?, completed_at = ?,
         preseeded_at = ?, updated_at = ?
     WHERE token = ?`
  ).bind(
    raw.transcript_json,
    raw.profile_json,
    raw.current_question_index,
    raw.interview_complete,
    raw.skipped,
    raw.enrichment_requested,
    raw.preseed_summary_json,
    raw.completed_at || null,
    raw.preseeded_at || null,
    raw.updated_at,
    token,
  ).run();
  return getOnboardingSession(env, token);
}

export async function getEnrichmentItems(env, token) {
  const db = getDb(env);
  if (!db) {
    return getDevStore().enrichment.get(token) || [];
  }
  const { results } = await db.prepare('SELECT * FROM enrichment_items WHERE token = ? ORDER BY created_at ASC').bind(token).all();
  return results.map(hydrateEnrichment);
}

export async function saveEnrichmentItems(env, token, items = []) {
  const db = getDb(env);
  const now = nowIso();
  const normalized = items.map((item) => serializeEnrichment({
    token,
    item_key: item.item_key,
    source_url: item.source_url,
    source_type: item.source_type,
    title: item.title,
    summary: item.summary,
    approved: item.approved !== false,
    raw: item.raw || {},
    created_at: item.created_at || now,
    updated_at: now,
  }));
  if (!db) {
    getDevStore().enrichment.set(token, normalized.map(hydrateEnrichment));
    return getEnrichmentItems(env, token);
  }
  for (const item of normalized) {
    await db.prepare(
      `INSERT INTO enrichment_items (
        token, item_key, source_url, source_type, title, summary, approved, raw_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(token, item_key) DO UPDATE SET
        source_url = excluded.source_url,
        source_type = excluded.source_type,
        title = excluded.title,
        summary = excluded.summary,
        approved = excluded.approved,
        raw_json = excluded.raw_json,
        updated_at = excluded.updated_at`
    ).bind(
      item.token,
      item.item_key,
      item.source_url,
      item.source_type,
      item.title,
      item.summary,
      item.approved,
      item.raw_json,
      item.created_at,
      item.updated_at,
    ).run();
  }
  return getEnrichmentItems(env, token);
}

export async function updateEnrichmentSelections(env, token, selections = []) {
  const db = getDb(env);
  if (!db) {
    const current = await getEnrichmentItems(env, token);
    const next = current.map((item) => {
      const selection = selections.find((candidate) => candidate.item_key === item.item_key);
      return selection ? { ...item, approved: Boolean(selection.approved) } : item;
    });
    getDevStore().enrichment.set(token, next);
    return next;
  }
  for (const selection of selections) {
    await db.prepare(
      'UPDATE enrichment_items SET approved = ?, updated_at = ? WHERE token = ? AND item_key = ?'
    ).bind(selection.approved ? 1 : 0, nowIso(), token, selection.item_key).run();
  }
  return getEnrichmentItems(env, token);
}

export async function recordFunnelEvent(env, event) {
  const db = getDb(env);
  const created_at = event.created_at || nowIso();
  if (!db) {
    getDevStore().funnelEvents.push({ ...event, created_at });
    return;
  }
  await db.prepare(
    'INSERT INTO managed_funnel_events (token, event_name, page, properties_json, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(
    event.token || null,
    event.event_name,
    event.page || null,
    JSON.stringify(event.properties || {}),
    created_at,
  ).run();
}

export async function hasWebhookEvent(env, provider, eventId) {
  const db = getDb(env);
  if (!db) {
    return getDevStore().webhookEvents.has(`${provider}:${eventId}`);
  }
  const row = await db.prepare(
    'SELECT event_id FROM managed_webhook_events WHERE provider = ? AND event_id = ?'
  ).bind(provider, eventId).first();
  return Boolean(row);
}

export async function recordWebhookEvent(env, provider, eventId, eventType, payload) {
  const db = getDb(env);
  const created_at = nowIso();
  if (!db) {
    getDevStore().webhookEvents.add(`${provider}:${eventId}`);
    return;
  }
  await db.prepare(
    `INSERT OR IGNORE INTO managed_webhook_events (
      provider, event_id, event_type, payload_json, processed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(provider, eventId, eventType, JSON.stringify(payload || {}), created_at, created_at).run();
}

export async function getIdempotencyRecord(env, key) {
  const db = getDb(env);
  if (!db) {
    return getDevStore().idempotency.get(key) || null;
  }
  const row = await db.prepare(
    'SELECT * FROM managed_idempotency_keys WHERE idempotency_key = ?'
  ).bind(key).first();
  if (!row) {
    return null;
  }
  return { ...row, response: safeJsonParse(row.response_json, {}) };
}

export async function putIdempotencyRecord(env, record) {
  const db = getDb(env);
  const next = {
    ...record,
    created_at: record.created_at || nowIso(),
    response: record.response || {},
  };
  if (!db) {
    getDevStore().idempotency.set(next.idempotency_key, next);
    return next;
  }
  await db.prepare(
    `INSERT OR REPLACE INTO managed_idempotency_keys (
      idempotency_key, scope, response_json, created_at
    ) VALUES (?, ?, ?, ?)`
  ).bind(
    next.idempotency_key,
    next.scope,
    JSON.stringify(next.response),
    next.created_at,
  ).run();
  return next;
}
