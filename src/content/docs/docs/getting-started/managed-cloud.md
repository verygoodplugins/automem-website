---
title: Managed Cloud
description: Start AutoMem Managed Cloud from automem.ai with the onboarding wizard and Stripe-backed upgrades.
sidebar:
  order: 1
---

AutoMem Managed Cloud is the fastest way to go from zero to persistent AI memory. It provisions an AutoMem workspace for you, runs a short onboarding wizard, and gives you a ready-to-copy install command once your pod is live and your email is verified.

## What the Managed Cloud Flow Does

1. Go to [/start](/start) and create a free trial account.
1. AutoMem starts provisioning your pod immediately.
1. The onboarding wizard asks a few questions while provisioning runs in the background.
1. AutoMem can enrich your starting context using public professional sources that you explicitly approve or remove.
1. Once your pod is ready and your email is confirmed, AutoMem reveals:
   - `npx automem-cli init --token am_live_...`
   - Manual MCP configuration for tools that need it

## Billing

- **Starter**: free trial with no card required at signup
- **Pro**: Stripe Checkout subscription flow
- **Ultimate**: Stripe Checkout subscription flow with dedicated pod positioning

AutoMem uses Stripe Billing with Checkout Sessions for upgrades and the Stripe Customer Portal for self-serve plan management.

## What Stays Manual

Managed Cloud is now the default path, but self-hosted options remain available:

- [Railway Deployment](/docs/deployment/railway/)
- [Docker Deployment](/docs/deployment/docker/)
- Source-first workflows via GitHub

## Status & Dashboard

After signup, AutoMem uses these website surfaces:

- `/onboarding?token=...` for interview, enrichment, and provisioning progress
- `/subscribe?token=...` for paid plan upgrades
- `/dashboard?token=...` for install details, status, billing portal access, and future `automem-watch` entry points
