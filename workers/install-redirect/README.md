# install-redirect worker

Backs the short installer URL: `curl -fsSL get.automem.ai | sh`

A standalone Cloudflare Worker bound to the custom domain `get.automem.ai`. It
302-redirects every request to the canonical script at
`https://automem.ai/install.sh` (served from `public/install.sh` by the Pages
site), keeping a single source of truth — update `public/install.sh` and the
short URL follows automatically.

This worker is **not** part of the Astro/Pages build. Deploy it on its own:

```bash
npx wrangler deploy -c workers/install-redirect/wrangler.jsonc
```

The custom domain (DNS record + cert) is provisioned automatically by the
`routes: [{ pattern: "get.automem.ai", custom_domain: true }]` entry on first
deploy.
