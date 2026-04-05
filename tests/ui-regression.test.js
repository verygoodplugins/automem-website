import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('homepage prioritizes managed cloud start now path', async () => {
  const source = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  assert.match(source, /Managed Cloud First/);
  assert.match(source, /href="\/start"/);
  assert.match(source, /START_NOW/);
});

test('start page uses labeled inputs and managed cloud signup route', async () => {
  const source = await readFile(new URL('../src/pages/start.astro', import.meta.url), 'utf8');
  assert.match(source, /label for="signup-email"/);
  assert.match(source, /autocomplete="email"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /\/api\/v1\/signup/);
});

test('onboarding page mounts the React island and dashboard exposes billing controls', async () => {
  const onboardingSource = await readFile(new URL('../src/pages/onboarding.astro', import.meta.url), 'utf8');
  const dashboardSource = await readFile(new URL('../src/pages/dashboard.astro', import.meta.url), 'utf8');
  assert.match(onboardingSource, /ManagedCloudOnboarding token=\{token\} client:load/);
  assert.match(dashboardSource, /Manage Subscription/);
  assert.match(dashboardSource, /automem-watch/);
});
