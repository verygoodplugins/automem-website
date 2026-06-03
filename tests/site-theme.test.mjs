import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('shared chrome follows the mockup navigation and removes old lab framing', async () => {
  const navigation = await readSource('../src/components/Navigation.astro');
  const layout = await readSource('../src/layouts/Layout.astro');
  const footer = await readSource('../src/components/SiteFooter.astro');

  assert.match(footer, /import AutoJack/);
  assert.match(footer, /AutoJack mascot/);
  assert.match(footer, /expression="happy"/);
  assert.doesNotMatch(navigation, /AutoMemMark/);
  assert.doesNotMatch(footer, /AutoMemMark/);
  assert.match(navigation, /\/automem-icon\.svg/);
  assert.match(navigation, /AutoMem/);
  assert.match(navigation, /Docs/);
  assert.match(navigation, /Install/);
  assert.match(navigation, /Concepts/);
  assert.match(navigation, /Benchmarks/);
  assert.match(navigation, /Blog/);
  assert.match(navigation, /Discord/);
  assert.match(navigation, /GitHub/);
  assert.match(navigation, /Star/);
  assert.doesNotMatch(navigation, /~\/automem/);

  assert.doesNotMatch(layout, /Line Numbers/);
  assert.doesNotMatch(layout, /0x/);
  assert.match(layout, /max-w-\[1440px\]/);

  assert.match(footer, /© 2026 AutoMem/);
  assert.match(footer, /Apache-2\.0/);
  assert.match(footer, /Made with/);
  assert.doesNotMatch(footer, /cool people/);
});

test('global theme tokens support the refined dark surface and neutral light mode', async () => {
  const globalCss = await readSource('../src/styles/global.css');
  const starlightCss = await readSource('../src/styles/starlight-custom.css');

  assert.match(globalCss, /--lab-bg:\s*6 10 14/);
  assert.match(globalCss, /--lab-surface:\s*11 16 22/);
  assert.match(globalCss, /--lab-panel:\s*15 22 30/);
  assert.match(globalCss, /--lab-line:\s*70 82 96/);
  assert.match(globalCss, /\.light\s*{[^}]*--lab-bg:\s*246 248 252/s);
  assert.match(globalCss, /\.light\s*{[^}]*--lab-surface:\s*255 255 255/s);
  assert.match(globalCss, /\.light\s*{[^}]*--lab-panel:\s*238 242 247/s);
  assert.match(globalCss, /\.light\s*{[^}]*--lab-text:\s*14 20 28/s);
  assert.doesNotMatch(globalCss, /Warm cream|Dark brown|#FFFBF0/);

  assert.match(starlightCss, /rgb\(var\(--lab-panel\)/);
  assert.match(starlightCss, /linear-gradient/);
});
