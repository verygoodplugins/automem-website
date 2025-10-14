# Email Waitlist Setup Guide

## Overview
The AutoMem website includes a simple waitlist signup system that runs entirely on Cloudflare's infrastructure - no external services required.

## Architecture
- **Frontend**: Astro component with client-side JavaScript
- **Backend**: Cloudflare Pages Function (runs on Workers)
- **Database**: Cloudflare D1 (SQLite at the edge)
- **Optional**: Webhook to external email service

## Setup Instructions

### 1. Create D1 Database

```bash
# Login to Wrangler
npx wrangler login

# Create D1 database
npx wrangler d1 create automem-waitlist

# Note the database_id that's returned
```

### 2. Apply Database Schema

```bash
# Apply the schema to your D1 database
npx wrangler d1 execute automem-waitlist --file=./schema/d1-schema.sql
```

### 3. Update wrangler.toml

Add the D1 binding to your `wrangler.toml`:

```toml
[[d1_databases]]
binding = "D1"
database_name = "automem-waitlist"
database_id = "YOUR_DATABASE_ID_HERE"
```

Optional env variables in wrangler.toml (examples):

```toml
[env.production.vars]
PUBLIC_TURNSTILE_SITE_KEY = "YOUR_TURNSTILE_SITE_KEY" # client-side
TURNSTILE_SECRET_KEY = "YOUR_TURNSTILE_SECRET_KEY"   # server-side verify
DOUBLE_OPT_IN = "false"                              # set "true" to require email confirmation
RESEND_API_KEY = "YOUR_RESEND_API_KEY"              # to send confirmation emails
FROM_EMAIL = "no-reply@yourdomain.com"
FROM_NAME = "Your App"
BASE_URL = "https://yourdomain.com"                  # used for confirmation/unsubscribe links
```

### 4. Set Admin Token

In Cloudflare Pages dashboard, add environment variable:

- `ADMIN_TOKEN`: A secure random string for accessing admin endpoints. Use it via `Authorization: Bearer <token>` when calling admin APIs.

### 5. Deploy to Cloudflare Pages

```bash
# Build the project
npm run build

# Deploy to Pages
npx wrangler pages deploy dist --project-name=automem-website
```

### 6. Configure Environment Variables (Optional)

In Cloudflare Pages dashboard, add:

- `EMAIL_SERVICE_WEBHOOK`: URL for external email service (ConvertKit, Mailchimp, etc.)
- `ADMIN_TOKEN`: Secure token for admin access (required for admin endpoints)
- `PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`: Enable Turnstile bot protection
- `DOUBLE_OPT_IN`: If `true`, requires email confirmation
- `RESEND_API_KEY`, `FROM_EMAIL`, `FROM_NAME`, `BASE_URL`: For sending confirmation emails and building links
- `SEND_WELCOME_EMAIL`: If `true` (default), sends a welcome email with repo/docs links after signup (or after confirmation when double opt-in is enabled)

## Features

✅ **Email Validation**: Client and server-side validation  
✅ **Duplicate Prevention**: Checks if email already exists  
✅ **Position Tracking**: Shows user their position in the waitlist  
✅ **Source Tracking**: Records which page they signed up from  
✅ **Admin API**: Protected endpoints for data access  
✅ **CSV Export**: Download waitlist as CSV  
✅ **No Dependencies**: Runs entirely on Cloudflare

## Accessing Waitlist Data

### Via Admin API

```bash
# Get JSON data with stats (preferred)
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://automem.ai/admin/waitlist

# Backward compatible (query param still supported)
curl "https://automem.ai/admin/waitlist?token=YOUR_ADMIN_TOKEN"

# Download as CSV (preferred)
curl -X POST -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://automem.ai/admin/waitlist > waitlist.csv
```

### Via Wrangler CLI

```bash
# Query waitlist
npx wrangler d1 execute automem-waitlist --command="SELECT * FROM waitlist ORDER BY created_at DESC"

# Get stats
npx wrangler d1 execute automem-waitlist --command="SELECT * FROM waitlist_stats"

# Export to CSV
npx wrangler d1 execute automem-waitlist --command="SELECT email, created_at FROM waitlist" --json > waitlist.json
```

### Via D1 Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to Workers & Pages → D1
3. Select your database
4. Use the query editor

## Email Service Integration (Optional)

To sync with ConvertKit, Mailchimp, etc., the Pages Function includes webhook support:

```javascript
// In /functions/api/signup.js
if (env.EMAIL_SERVICE_WEBHOOK) {
  fetch(env.EMAIL_SERVICE_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email, 
      tags: ['automem-waitlist'],
      source 
    })
  })
}
```

### ConvertKit Example

Set `EMAIL_SERVICE_WEBHOOK` to:
```
https://api.convertkit.com/v3/forms/YOUR_FORM_ID/subscribe?api_key=YOUR_API_KEY
```

### Zapier/Make Example

Create a webhook trigger and set that URL as `EMAIL_SERVICE_WEBHOOK`.

## Analytics

Track conversions with Google Analytics:

```javascript
// Already included in the component
if (typeof window.gtag !== 'undefined') {
  window.gtag('event', 'conversion', {
    'event_category': 'Waitlist',
    'event_label': 'Homepage Signup'
  });
}
```

## Alternative: Simple Form Services

If you prefer not to use D1, here are simpler alternatives:

### Option 1: Web3Forms (No Backend Required)
```html
<form action="https://api.web3forms.com/submit" method="POST">
  <input type="hidden" name="access_key" value="YOUR_ACCESS_KEY">
  <input type="email" name="email" required>
  <button type="submit">Get Early Access</button>
</form>
```

### Option 2: Formspree
```html
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
  <input type="email" name="email" required>
  <button type="submit">Get Early Access</button>
</form>
```

### Option 3: ConvertKit Direct
```html
<script async data-uid="YOUR_FORM_ID" src="https://your-site.ck.page/YOUR_FORM_ID/index.js"></script>
```

## Cost

- **Cloudflare D1**: Free tier includes 100,000 reads/day, 1,000 writes/day
- **Pages Functions**: 100,000 requests/day free
- **Total Cost**: $0 for most early-stage projects

## Security Notes

- Data at rest: Cloudflare provides infrastructure-level encryption at rest for D1. This app stores emails in plaintext within the DB; add application-level encryption if required.
- Rate limiting: Configure at Cloudflare (WAF rules/Rate Limiting) or add Turnstile. Not enabled by default in this repo.
- Admin endpoints: Now support `Authorization: Bearer` header (query param remains for compatibility). Server responses include `Cache-Control: no-store`.
- Consider adding CAPTCHA/Turnstile for high-traffic or public launches.
- GDPR: Add privacy policy link and consent checkbox if needed; implement delete/unsubscribe if required.

## Testing Locally

```bash
# Install Wrangler
npm install -g wrangler

# Run local development with D1
npx wrangler pages dev dist --d1=D1=YOUR_DATABASE_ID

Tip: set env vars locally when developing with Pages Functions:

```bash
EXPORTS="--var ADMIN_TOKEN=devtoken --var EMAIL_SERVICE_WEBHOOK=https://example.test"
npx wrangler pages dev dist $EXPORTS --d1=D1=YOUR_DATABASE_ID
```

# Test signup
curl -X POST http://localhost:8788/api/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test admin endpoint (set ADMIN_TOKEN in .dev.vars)
curl "http://localhost:8788/admin/waitlist?token=YOUR_ADMIN_TOKEN"
```
## Double Opt-In (Optional)

When `DOUBLE_OPT_IN` is set to `true`, signups are stored with `confirmed = 0` and a confirmation email is sent via Resend (if `RESEND_API_KEY` is set). The email includes:

- Confirm link: `GET /confirm?token=...` → sets `confirmed = 1`
- Unsubscribe link: `GET /unsubscribe?token=...` → sets `unsubscribed = 1`

Tokens are HMAC-signed using `CONFIRM_SECRET` (or `ADMIN_TOKEN` as fallback) and expire after 3 days.

Endpoints added:

```text
GET /confirm?token=...
GET /unsubscribe?token=...
```

If `RESEND_API_KEY` is not set, users are added unconfirmed and no email is sent.

## Bot Protection (Turnstile)

If `PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are set, the signup form renders a Turnstile widget and `/api/signup` verifies the token server-side. Missing or invalid tokens are rejected.
After confirmation, a welcome email is sent if `SEND_WELCOME_EMAIL` is not set to `false`.
## Broadcasts (Manual)

Send a fun Day 1 follow‑up email to confirmed subscribers.

```bash
# Dry run: preview count + sample recipients
curl -X POST https://automem.ai/admin/broadcast \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "day1",
    "dryRun": true,
    "confirmedOnly": true,
    "limit": 0
  }'

# Send to everyone confirmed (careful!)
curl -X POST https://automem.ai/admin/broadcast \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "day1",
    "confirmedOnly": true
  }'
```

Advanced: override subject/html/text in the JSON body to send a custom message.
