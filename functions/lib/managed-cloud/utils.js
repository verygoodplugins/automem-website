import { DEFAULT_TRIAL_DAYS, TIER_FEATURES } from './constants.js';

const TOKEN_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function nowIso() {
  return new Date().toISOString();
}

export function addDays(baseIso = nowIso(), days = DEFAULT_TRIAL_DAYS) {
  const date = new Date(baseIso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function safeJsonParse(value, fallback) {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', headers.get('Cache-Control') || 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

export async function readJson(request) {
  try {
    const text = await request.text();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

export function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function randomId(prefix = '') {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let token = '';
  for (const byte of bytes) {
    token += TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length];
  }
  return `${prefix}${token}`;
}

export function generateManagedToken() {
  return randomId('am_live_');
}

export function daysRemaining(targetIso) {
  if (!targetIso) {
    return null;
  }
  const ms = new Date(targetIso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function buildAbsoluteUrl(request, env, pathname, params = {}) {
  const base = env.BASE_URL || new URL(request.url).origin;
  const url = new URL(pathname, base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export function buildManualConfigSnippet(mcpUrl, token) {
  return JSON.stringify(
    {
      mcpServers: {
        automem: {
          url: mcpUrl,
          transport: 'streamable-http',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    },
    null,
    2,
  );
}

export function buildInstallCommand(token) {
  return `npx automem-cli init --token ${token}`;
}

export function buildFeaturesForTier(tier = 'starter') {
  if (TIER_FEATURES?.[tier]) {
    return TIER_FEATURES[tier];
  }
  return {
    qdrant_enabled: tier !== 'starter',
    graph_expansion: tier !== 'starter',
    max_connections: tier === 'ultimate' ? 250 : tier === 'pro' ? 25 : 1,
    embeddings: tier === 'ultimate' ? 'premium' : tier === 'pro' ? 'managed' : 'byo',
    automem_watch: tier !== 'starter',
    data_export: tier !== 'starter',
  };
}

export function toSnakeCaseRecord(record = {}) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`),
      value,
    ]),
  );
}
