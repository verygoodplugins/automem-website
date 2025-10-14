# AutoMem.AI Website

The official website for AutoMem.AI - Intelligent Memory Service for AI Agents.

## Tech Stack

- **Framework**: Astro 4.16
- **Styling**: Tailwind CSS
- **Deployment**: Cloudflare Pages
- **Database**: Cloudflare D1 (for waitlist)
- **Content**: MDX for documentation

## Features

- ✨ Landing page with hero section and feature showcase
- 📧 Email waitlist signup with D1 database storage
- 📚 Documentation structure with MDX support
- ⚡ Edge-optimized with Cloudflare Pages
- 🎨 Custom AutoMem branding and color scheme

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Waitlist Setup

The site includes an email waitlist system powered by Cloudflare D1:

```bash
# Create D1 database
npx wrangler d1 create automem-waitlist

# Apply schema
npx wrangler d1 execute automem-waitlist --file=./schema/d1-schema.sql

# Update wrangler.toml with your database ID
```

See [WAITLIST_SETUP.md](./WAITLIST_SETUP.md) for detailed instructions.

## Deployment to Cloudflare Pages

### Method 1: Git Integration (Recommended)

1. Push this repository to GitHub
2. Go to [Cloudflare Pages](https://pages.cloudflare.com)
3. Connect your GitHub account
4. Select the repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node version**: 18 or higher

### Method 2: Direct Upload

```bash
# Build the project
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=automem-website
```

### Method 3: GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - run: npm ci
      - run: npm run build
      
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: automem-website
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

## Custom Domain Setup

1. In Cloudflare Pages dashboard, go to your project
2. Navigate to "Custom domains"
3. Add `automem.ai` as your custom domain
4. Update DNS records as instructed

## Environment Variables

For production deployments, you may need to set:

- `PUBLIC_API_URL`: AutoMem API endpoint
- `PUBLIC_GITHUB_URL`: GitHub repository URL
- `EMAIL_SERVICE_WEBHOOK`: (Optional) Webhook URL for external email service

These can be set in the Cloudflare Pages dashboard under Settings > Environment variables.

## Project Structure

```
automem-website/
├── src/
│   ├── components/    # Reusable components (EmailSignup.astro)
│   ├── layouts/       # Page layouts
│   ├── pages/        # Route pages
│   └── styles/       # Global styles
├── public/           # Static assets
├── functions/        # Cloudflare Pages Functions
│   └── api/         # API endpoints
│       └── signup.js # Waitlist signup handler
├── schema/          # Database schemas
│   └── d1-schema.sql # D1 waitlist table
├── astro.config.mjs  # Astro configuration
├── tailwind.config.mjs # Tailwind configuration
└── wrangler.toml    # Cloudflare configuration
```

## Adding Content

### New Pages

Create `.astro` files in `src/pages/`:

```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout title="Page Title">
  <!-- Your content here -->
</Layout>
```

### Documentation Pages

Create `.mdx` files in `src/pages/docs/`:

```mdx
---
layout: ../layouts/DocsLayout.astro
title: "Doc Title"
---

# Documentation Content

Your markdown content here...
```

## Performance

The site is optimized for:

- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Lighthouse Score**: 95+ on all metrics
- **Edge Caching**: Cloudflare CDN
- **Image Optimization**: Automatic via Astro

## License

MIT
