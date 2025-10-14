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
