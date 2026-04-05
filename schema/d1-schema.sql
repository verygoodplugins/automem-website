-- AutoMem Waitlist Schema for Cloudflare D1
-- Run this in your D1 database after creating it

CREATE TABLE IF NOT EXISTS waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'website',
  created_at TEXT NOT NULL,
  confirmed BOOLEAN DEFAULT 0,
  unsubscribed BOOLEAN DEFAULT 0,
  metadata TEXT -- JSON field for extra data
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist(created_at DESC);

-- Optional: Admin stats view
CREATE VIEW IF NOT EXISTS waitlist_stats AS
SELECT 
  COUNT(*) as total_signups,
  SUM(CASE WHEN confirmed = 1 THEN 1 ELSE 0 END) as confirmed_count,
  SUM(CASE WHEN unsubscribed = 1 THEN 1 ELSE 0 END) as unsubscribed_count,
  DATE(MIN(created_at)) as first_signup,
  DATE(MAX(created_at)) as last_signup
FROM waitlist;

-- AutoMem Managed Cloud accounts
CREATE TABLE IF NOT EXISTS managed_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  email_verified_at TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  instapods_pod_id TEXT,
  pod_url TEXT,
  mcp_url TEXT,
  tier TEXT NOT NULL DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'provisioning',
  connected_agents_json TEXT NOT NULL DEFAULT '[]',
  features_json TEXT NOT NULL DEFAULT '{}',
  trial_start TEXT,
  trial_end TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_managed_accounts_token ON managed_accounts(token);
CREATE INDEX IF NOT EXISTS idx_managed_accounts_email ON managed_accounts(email);
CREATE INDEX IF NOT EXISTS idx_managed_accounts_status ON managed_accounts(status);

CREATE TABLE IF NOT EXISTS onboarding_sessions (
  token TEXT PRIMARY KEY,
  transcript_json TEXT NOT NULL DEFAULT '[]',
  profile_json TEXT NOT NULL DEFAULT '{}',
  current_question_index INTEGER NOT NULL DEFAULT 0,
  interview_complete INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  enrichment_requested INTEGER NOT NULL DEFAULT 0,
  preseed_summary_json TEXT NOT NULL DEFAULT '{}',
  completed_at TEXT,
  preseeded_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (token) REFERENCES managed_accounts(token) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enrichment_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,
  item_key TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 1,
  raw_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (token, item_key),
  FOREIGN KEY (token) REFERENCES managed_accounts(token) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_enrichment_items_token ON enrichment_items(token);

CREATE TABLE IF NOT EXISTS managed_webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  processed_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (provider, event_id)
);

CREATE TABLE IF NOT EXISTS managed_idempotency_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL,
  response_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS managed_funnel_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT,
  event_name TEXT NOT NULL,
  page TEXT,
  properties_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_managed_funnel_events_token ON managed_funnel_events(token);
