---
title: "Miles Builds WordPress Sites. But Should It?"
description: "bymiles.ai is an agentic AI that spins up WordPress websites in minutes. Impressive. But in 2026, is WordPress still the right canvas for an AI to paint on? We compare WordPress to Starlight and make the case for a better default."
date: "2026-03-13"
tags:
  - cms
  - wordpress
  - starlight
  - agentic-ai
  - web-development
---

I just watched a demo of [bymiles.ai](https://bymiles.ai). Miles is an AI agent that designs and builds WordPress websites — custom blocks, plugin integration, production-ready code — from a plain-English description. The demo sites look sharp. The pitch is compelling: describe what you want, get a real website in the time it takes to drink a coffee.

Miles is genuinely impressive. But watching it made me think about a different question: *why WordPress?*

Not as a criticism of Miles specifically — it's a smart product decision to target the platform that runs 43% of the web. But as an exercise: if you were building an agentic content site from scratch in 2026, what would you actually reach for?

Let's compare.

## What Miles Gets Right About WordPress

WordPress has real advantages as an AI build target:

- **Massive ecosystem.** 60,000+ plugins. Every feature someone could want has a plugin. An agent can compose them like Lego.
- **Familiar editorial UX.** Non-technical users know WordPress. Handing a site to a client is straightforward.
- **Block editor extensibility.** Custom Gutenberg blocks are well-understood. Miles can generate them reliably because the patterns are well-established.
- **Hosting ubiquity.** Every host runs WordPress. Deployment is a solved problem.

For Miles's use case — building client sites for agencies and freelancers — WordPress makes total sense. You're delivering something clients can maintain themselves, on infrastructure they already understand.

But what if you're building for a different use case?

## The WordPress Tax

WordPress ships with a PHP runtime, a MySQL database, an admin panel, a plugin update system, a REST API, a cron job runner, a comment system, a user management layer, and about 20 years of backwards-compatibility debt.

For a content site — a blog, documentation, a marketing page — you're paying that entire tax to serve what are essentially static HTML files.

The attack surface alone is a problem. WordPress is the most-targeted CMS on the internet. Not because it's insecure by design, but because it's everywhere and complex. Every plugin is a potential vector. Every admin panel is a login form on the public internet. Running WordPress means running a security posture, not just a website.

Then there's the performance layer. To make WordPress fast, you add caching plugins, CDN configuration, image optimization plugins, database query optimization... you're fighting the architecture to get performance that a static site gives you for free.

## Enter Starlight

[Starlight](https://starlight.astro.build) is Astro's documentation and content framework. It's markdown-first, zero-runtime, and deploys to a CDN as flat HTML files.

Here's what the stack looks like:

- **Content:** Markdown or MDX files in `/src/content/`
- **Build:** Astro compiles to static HTML at deploy time
- **Hosting:** Cloudflare Pages, Netlify, Vercel — any CDN
- **Version control:** Every post is a file. Every change is a git commit.

No database. No PHP. No admin panel exposed to the internet. No plugins to update. No login page to brute-force.

The performance characteristics are night and day. A Starlight site on Cloudflare Pages loads from an edge node closest to the visitor. There's nothing to execute server-side. The TTFB is measured in single-digit milliseconds.

## The Agentic Angle

Here's where it gets interesting for AutoMem's world: **Starlight is dramatically more agent-friendly than WordPress.**

Consider the workflow difference:

**WordPress (Miles's approach):**
1. Agent generates code
2. Agent deploys to WordPress via REST API or direct file writes
3. Content lives in a database
4. Version history lives in WordPress's revisions table
5. Agents can't diff revisions, can't branch, can't run CI

**Starlight (git-native approach):**
1. Agent writes a markdown file
2. Agent opens a pull request
3. Cloudflare Pages builds a preview URL automatically
4. Human reviews at the preview URL
5. Merge to deploy — zero additional steps

The entire review-and-deploy loop is standard git. Agents understand git. CI/CD pipelines understand git. You get branch previews, diffs, rollbacks, and blame history for free — because those are just features of git, not features you have to build.

We run exactly this workflow for the AutoMem website and docs. A code change that touches a documentation file triggers a worker that reads the diff, checks it against the docs, and opens a PR if they're out of sync. That's only possible because the docs are files in a repo, not rows in a database.

## The Honest Tradeoffs

Starlight isn't the right choice for everything:

- **Non-technical editors.** If your client needs to update their own content without touching a terminal, WordPress wins. Starlight's editorial experience is a text editor and git, which is not for everyone.
- **Dynamic content.** User accounts, e-commerce, forms that write to a database — WordPress handles this natively. Starlight is static by design.
- **Existing WordPress sites.** If you're already on WordPress with years of content, the migration cost is real. Starlight doesn't erase that debt.

Miles is solving a real problem for a real market. For agencies delivering client sites, WordPress is the correct answer.

But for developer tools, technical blogs, documentation sites, SaaS marketing pages — anything where the audience is comfortable with a PR workflow and the content is written by developers — the WordPress tax is optional. You can opt out.

## The Agent-Built Site Endgame

The most interesting thing about Miles isn't that it builds WordPress sites. It's that it demonstrates agentic site-building is real and ready.

The next version of that story — the one I'd build — is an agent that writes markdown, opens PRs, and deploys to a CDN. No database to corrupt. No plugins to patch. No admin panel to secure.

Just files, git, and an agent that knows how to use both.

Miles chose the biggest existing target. That's a good product decision. But the target itself might be due for a rethink.
