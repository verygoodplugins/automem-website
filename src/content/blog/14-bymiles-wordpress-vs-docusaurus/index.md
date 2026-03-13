---
title: "An AI That Builds WordPress Sites in 2026: Brilliant Timing or Wrong Bet?"
description: "bymiles.ai is an agentic AI that spins up WordPress websites on demand. It's technically impressive. But Meta's Docusaurus represents a different philosophy — one that might be better suited to how agents actually work."
date: "2026-03-13"
tags:
  - cms
  - wordpress
  - docusaurus
  - agentic-ai
  - web-development
---

[bymiles.ai](https://bymiles.ai) launched with a sharp premise: describe a website, get a website. Miles is an AI agent — not just a code generator, but something with actual agency over the build process — that produces WordPress sites with custom blocks, integrated plugins, and production-ready code.

The timing is interesting. WordPress is in a weird moment: still dominant by market share, increasingly under pressure from JAMstack alternatives, and now being used as the output target for agentic AI. Meanwhile, Meta has been quietly maintaining [Docusaurus](https://docusaurus.io) — an open-source static site framework — and it's become genuinely excellent.

Let's do the comparison honestly.

## What Miles Is Actually Doing

Miles isn't a theme generator. It's closer to a junior developer who happens to work at superhuman speed. It reads a brief, makes design decisions, writes custom Gutenberg blocks in React, configures plugins, and hands you a working WordPress installation.

That's a legitimately hard technical problem, and Miles solves it. The demo sites look like real sites, not cookie-cutter templates.

The choice of WordPress as the build target makes strategic sense:

1. **Market size.** 43% of the web runs WordPress. That's where the clients are.
2. **Pattern density.** WordPress has been built and rebuilt so many times that training data is everywhere. An AI has more to learn from than any other CMS.
3. **Plugin composability.** Need a contact form? WooCommerce? A booking system? There's a plugin. An agent can assemble features without writing them from scratch.

For Miles's core use case — building client sites for agencies — this is probably the right call.

## The Docusaurus Alternative

[Docusaurus](https://docusaurus.io) is Meta's open-source framework for documentation and content sites. It's React-based, markdown-first, and builds to static HTML. The output deploys anywhere that serves static files.

What makes Docusaurus interesting as a comparison point:

**It was designed for developer-authored content.** Markdown in, fast site out. No database, no PHP, no admin panel. Content is files. Files live in git.

**It's battle-tested at scale.** Meta, Supabase, Figma, Jest, React Native, and hundreds of other major projects run their docs on Docusaurus. The framework handles serious content volume without breaking a sweat.

**The versioning story is native.** Docusaurus has built-in versioned documentation — a feature that WordPress requires plugins and significant configuration to replicate. For any project that ships multiple versions, this alone is worth the migration.

**MDX support.** Markdown plus JSX. You can embed interactive React components directly in content. Try doing that in the WordPress block editor without writing a custom plugin.

## The Performance Gap

This is where the comparison gets uncomfortable for WordPress.

A default WordPress installation — even a well-configured one — serves dynamic PHP responses that hit a database, pass through a caching layer (if you've set one up), and return HTML. The stack:

```
Request → PHP → MySQL → Cache check → HTML
```

A Docusaurus site on Cloudflare Pages:

```
Request → Edge CDN → Static HTML
```

The difference isn't marginal. Core Web Vitals on a static site are structurally better because there's nothing to execute. You're not optimizing a slow path — the slow path doesn't exist.

For SEO-sensitive content sites, this matters directly. Google's ranking signals include page experience. Docusaurus sites are fast by default; WordPress sites are fast by configuration.

## The Agentic Workflow Difference

Here's the argument that's most relevant to what Miles is trying to build:

**WordPress is not agent-native. Docusaurus is.**

When an agent creates a WordPress site, the content lives in a MySQL database. To update it, the agent hits the REST API. To review changes, a human logs into the admin panel. To roll back, you restore a database snapshot.

None of that is natural for an agent-driven workflow.

When an agent creates a Docusaurus site, the content is markdown files in a git repository. To update it, the agent opens a pull request. To review changes, you look at a diff and click a preview URL (Cloudflare Pages generates these automatically for every branch). To roll back, you revert a commit.

Git is the native interface for agents. Diffs are readable. Branches are cheap. CI/CD is a first-class citizen. Every change has a paper trail.

We run this exact pattern at AutoMem. The docs site is Starlight (Astro's sibling to Docusaurus), deployed to Cloudflare Pages. When code changes in the main repo, an automated worker checks whether the docs need updating and opens a PR. A human reviews the diff. Merge to deploy.

That loop — agent writes, human reviews, git deploys — is only possible because the content is files, not database rows.

## Where WordPress Still Wins

This isn't a takedown of Miles or WordPress. There are real cases where WordPress is the correct answer:

**Non-technical content editors.** If the person updating the site is a marketing manager who has never opened a terminal, WordPress's visual editor is a genuine UX advantage. Docusaurus's editorial experience is a text editor and a git push.

**Complex dynamic features.** E-commerce, membership sites, booking systems, user-generated content — WordPress handles these with mature plugins. Docusaurus is a static framework. It doesn't do dynamic.

**Legacy content migration.** Years of WordPress content don't export to Docusaurus cleanly. The migration cost is real and non-trivial.

**Client handoff.** Miles is explicitly targeting agencies delivering sites to clients. Clients know WordPress. Handing a Docusaurus repo to a non-technical client is a support ticket waiting to happen.

## The Real Question Miles Is Answering

Miles isn't trying to build the best possible architecture. It's trying to build the most useful product for the most clients.

By that measure, WordPress is the right answer today.

But the meta-question — what does agentic site-building look like when you optimize for agent workflows instead of human familiarity — points toward git-native, file-based, static-first architectures.

Docusaurus (and its cousins: Starlight, Nextra, VitePress) represent that future. The editorial experience is worse for non-technical users. The agent experience is dramatically better.

Miles is building the right product for 2026's market. But the market is moving. In a few years, "an AI builds your site" might default to a different stack — one where the agent's natural interface (git, files, diffs) is the same as the site's native interface.

When that happens, the PHP tax becomes optional. And optional costs have a way of getting cut.
