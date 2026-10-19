import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

// Cross-page consistency sweep. Each block pins one corrected fact across every
// page that used to state it wrongly. Facts were verified against the release
// sources recorded in scripts/docs-source-pins.json (AutoMem 0.16.2,
// mcp-automem 0.16.0, graph-viewer 0.5.0).

const docsRoot = new URL('../src/content/docs/docs/', import.meta.url);

async function readDoc(relativePath) {
  return readFile(fileURLToPath(new URL(relativePath, docsRoot)), 'utf8');
}

// Item 1: /health skips the API-token guard, so it cannot test a token or key.
const healthAuthPages = [
  'best-practices/context-engineering.md',
  'cli/guided-cloud-setup.md',
  'deployment/instapods.md',
  'operations/troubleshooting.md',
  'platforms/antigravity.md',
  'platforms/chatgpt.md',
  'platforms/claude-code.md',
  'platforms/codex.md',
];

test('pages no longer send a token to /health as an authentication test', async () => {
  for (const path of healthAuthPages) {
    const page = await readDoc(path);

    assert.doesNotMatch(
      page,
      /Authorization: Bearer[^\n]*\/health\b/u,
      `${path} must not curl /health with a bearer token`,
    );
    assert.doesNotMatch(
      page,
      /curl[^\n]*\/health\b[^\n]*\\\n\s*-H "(?:Authorization|X-API-Key)/u,
      `${path} must not curl /health with a continued auth header`,
    );
    assert.doesNotMatch(
      page,
      /-H "(?:Authorization|X-API-Key)[^\n]*\\\n\s*[^\n]*\/health\b/u,
      `${path} must not send a header first and the /health URL on a continuation line`,
    );
    assert.doesNotMatch(page, /curl[^\n]*\/health\?api_key=/u, `${path} must not curl /health with an api_key`);
  }
});

test('the /health token-test guard catches both multi-line curl orders', () => {
  const urlFirst = 'curl https://x/health \\\n  -H "Authorization: Bearer T"';
  const headerFirst = 'curl -i -H "Authorization: Bearer T" \\\n  https://x/health';

  assert.match(urlFirst, /curl[^\n]*\/health\b[^\n]*\\\n\s*-H "(?:Authorization|X-API-Key)/u);
  assert.match(headerFirst, /-H "(?:Authorization|X-API-Key)[^\n]*\\\n\s*[^\n]*\/health\b/u);
  assert.doesNotMatch('curl -i -H "Authorization: Bearer T" \\\n  "https://x/recall?limit=1"', /-H "(?:Authorization|X-API-Key)[^\n]*\\\n\s*[^\n]*\/health\b/u);
});

test('token tests use an authenticated recall probe and say /health does not check the token', async () => {
  const probes = {
    'best-practices/context-engineering.md': /Authorization: Bearer \$AUTOMEM_API_KEY" "\$AUTOMEM_API_URL\/recall\?limit=1"/u,
    'cli/guided-cloud-setup.md': /curl -i "https:\/\/your-automem-url\/recall\?limit=1" \\\n\s*-H "Authorization: Bearer YOUR_AUTOMEM_API_TOKEN"/u,
    'deployment/instapods.md': /curl -i "https:\/\/your-instapods-automem-url\/recall\?limit=1" \\\n\s*-H "Authorization: Bearer YOUR_AUTOMEM_API_TOKEN"/u,
    'getting-started/quick-start.md': /curl -i "https:\/\/your-automem-url\/recall\?limit=1" \\\n\s*-H "Authorization: Bearer YOUR_AUTOMEM_API_TOKEN"/u,
    'operations/troubleshooting.md': /curl -i -H "Authorization: Bearer your-token" \\\n\s*"https:\/\/your-service\.up\.railway\.app\/recall\?limit=1"/u,
    'platforms/antigravity.md': /curl -i -H "Authorization: Bearer \$KEY" "\$ENDPOINT\/recall\?limit=1"/u,
    'platforms/chatgpt.md': /curl -i -H "Authorization: Bearer \$TOKEN" "https:\/\/your-automem\.up\.railway\.app\/recall\?limit=1"/u,
    'platforms/claude-code.md': /curl -i -H "Authorization: Bearer \$KEY" "https:\/\/your-automem\.example\.com\/recall\?limit=1"/u,
    'platforms/codex.md': /curl -i -H "Authorization: Bearer \$KEY" "https:\/\/your-automem\.up\.railway\.app\/recall\?limit=1"/u,
  };

  for (const [path, probe] of Object.entries(probes)) {
    const page = await readDoc(path);

    assert.match(page, probe, `${path} should test the token against /recall`);
    assert.match(page, /`\/health` (?:does not check|skips the API token check)|\(`\/health` does not\)|it skips the API token check/u, `${path} should say /health does not check the token`);
    assert.match(page, /`401(?: Unauthorized)?`/u, `${path} should say what a 401 means`);
  }
});

test('quick start verify section keeps /health as a reachability check and probes the key with /recall', async () => {
  const page = await readDoc('getting-started/quick-start.md');
  const verify = page.match(/## Verify it worked\n([\s\S]*?)\n### Try it end to end/u);

  assert.ok(verify, 'expected the Verify it worked section');
  assert.match(verify[1], /curl https:\/\/your-automem-url\/health\n```/u);
  assert.doesNotMatch(verify[1], /\/health[^\n]*\\\n\s*-H "Authorization/u);
  assert.match(verify[1], /`\/health` skips the API token check, so a healthy response does not prove that your key is accepted/u);
  assert.match(verify[1], /\/recall\?limit=1/u);
});

test('guided cloud setup attributes a 401 to the authenticated recall probe, not /health', async () => {
  const page = await readDoc('cli/guided-cloud-setup.md');

  assert.doesNotMatch(page, /`401 Unauthorized` on `\/health`/u);
  assert.match(page, /`Authenticated recall probe failed with HTTP 401`/u);
  assert.match(page, /sends an authenticated `GET \/recall\?limit=1` request after the health check/u);
});

// Item 2: Compose publishes ports with no host IP, so Docker binds all host interfaces.
const dockerPages = ['getting-started/docker.md', 'deployment/docker.md'];

test('Docker pages say Compose ports are published on all host interfaces', async () => {
  for (const path of dockerPages) {
    const page = await readDoc(path);

    assert.doesNotMatch(page, /All ports mapped to localhost/u, `${path} still says all ports map to localhost`);
    assert.doesNotMatch(page, /\| External Access \| Local only \| Local only \|/u);
    assert.match(
      page,
      /\| \*\*Port Exposure\*\* \| Ports published on all host interfaces \(no host IP in the mappings\) \| Bind to `127\.0\.0\.1`; to filter instead, use Docker's `DOCKER-USER` iptables chain or an external firewall \(on Linux, ufw and firewalld rules do not apply to Docker-published ports\);/u,
      `${path} should describe the real port exposure`,
    );
    assert.match(page, /These mappings name no host IP, so Docker publishes every port on all host interfaces/u);
  }

  const gettingStarted = await readDoc('getting-started/docker.md');
  assert.match(
    gettingStarted,
    /\| External Access \| Ports published on all host interfaces by default \(\[see below\]\(#restricting-network-exposure\)\) \| `app\.py` listens on all interfaces \|/u,
  );
});

test('Docker pages carry a short hardening note with loopback binding and real tokens', async () => {
  for (const path of dockerPages) {
    const page = await readDoc(path);
    const note = page.match(/### Restricting Network Exposure\n([\s\S]*?)\n### /u);

    assert.ok(note, `${path} should have a Restricting Network Exposure section`);
    assert.match(note[1], /Docker binds it on all host interfaces/u);
    assert.match(note[1], /falls back to `test-token` and `test-admin-token`/u);
    assert.match(note[1], /"127\.0\.0\.1:\$\{AUTOMEM_API_HOST_PORT:-8001\}:8001"/u);
    assert.match(note[1], /use rules in Docker's `DOCKER-USER` iptables chain or a firewall outside the host, such as a cloud security group/u);
    assert.match(note[1], /On Linux, ufw and firewalld rules do not apply to Docker-published ports, so `ufw deny 6379` does not close the FalkorDB port\./u);
    assert.doesNotMatch(note[1], /block the ports with a host firewall/u);
    assert.match(note[1], /strong `AUTOMEM_API_TOKEN` and `ADMIN_API_TOKEN` values/u);
  }
});

test('installer setup table does not call the local Docker port localhost-only', async () => {
  const page = await readDoc('cli/setup.md');

  assert.doesNotMatch(page, /\| \*\*Local\*\* \| `8001` \(AutoMem API\) \| Localhost only \|/u);
  assert.match(
    page,
    /\| \*\*Local\*\* \| `8001` \(AutoMem API\); the Compose stack also publishes `6379`, `3000`, `6333`, and `6334` \(FalkorDB and Qdrant\) \| Published on all host interfaces by default \(Docker Compose port mapping\); see \[Restricting Network Exposure\]\(\/docs\/getting-started\/docker\/#restricting-network-exposure\) \|/u,
  );
});

// Item 3: EMBEDDING_PROVIDER accepts auto, voyage, openai, local, ollama, placeholder.
test('Docker guide escapes the EMBEDDING_PROVIDER value pipes and lists ollama', async () => {
  const page = await readDoc('deployment/docker.md');
  const row = page.split('\n').find((line) => line.startsWith('| `EMBEDDING_PROVIDER` |'));

  assert.ok(row, 'expected an EMBEDDING_PROVIDER row');
  assert.ok(row.includes('`auto\\|voyage\\|openai\\|ollama\\|local\\|placeholder`'));
  assert.doesNotMatch(row, /`auto\|openai\|voyage\|local\|placeholder`/u);
  // Unescaped pipes add table cells; header and row must have the same cell count.
  const cells = (line) => line.replace(/\\\|/gu, '').split('|').length;
  const header = page.split('\n').find((line) => line.startsWith('| Variable |'));
  assert.ok(header, 'expected the environment variable table header');
  assert.equal(cells(row), cells(header));
});

test('every page listing EMBEDDING_PROVIDER values includes ollama', async () => {
  for (const path of ['overview.md', 'getting-started/docker.md', 'deployment/docker.md']) {
    const page = await readDoc(path);
    const listings = page.split('\n').filter((line) => /auto[`\\/|, ]+(?:\\?\|)?\s*`?voyage/u.test(line));

    assert.ok(listings.length > 0, `${path} should list the provider values`);
    for (const line of listings) {
      assert.match(line, /ollama/u, `${path}: ${line}`);
    }
  }
});

// Item 4: `auto` needs no API key. After Voyage and OpenAI it tries configured Ollama,
// then FastEmbed, and uses placeholder vectors only when FastEmbed cannot load.
test('Docker pages no longer say a missing OPENAI_API_KEY falls back to placeholder embeddings', async () => {
  for (const path of ['getting-started/docker.md', 'deployment/docker.md']) {
    const page = await readDoc(path);
    const row = page.split('\n').find((line) => line.startsWith('| `OPENAI_API_KEY` |'));

    assert.ok(row, `${path} should have an OPENAI_API_KEY row`);
    assert.doesNotMatch(row, /Falls back to placeholder embeddings/u);
    assert.match(
      row,
      /`auto` tries it after Voyage; without it, `auto` tries configured Ollama, then FastEmbed, then placeholder embeddings/u,
    );
  }
});

test('troubleshooting quotes the placeholder warnings the code logs, not an invented line', async () => {
  const page = await readDoc('operations/troubleshooting.md');

  assert.doesNotMatch(page, /No OPENAI_API_KEY or VOYAGE_API_KEY found/u);
  assert.doesNotMatch(page, /Semantic search will not work correctly/u);
  assert.match(page, /^Failed to initialize fastembed provider, using placeholder: <FastEmbed error>$/mu);
  assert.match(
    page,
    /^Using placeholder embeddings \(no semantic search\)\. Install fastembed or set VOYAGE_API_KEY\/OPENAI_API_KEY for semantic embeddings\.$/mu,
  );
  assert.match(page, /A missing API key alone does not cause this/u);
  assert.match(page, /`EMBEDDING_PROVIDER=placeholder`/u);
});

test('embeddings page says auto mode works without an API key', async () => {
  const page = await readDoc('architecture/embeddings.md');

  assert.doesNotMatch(page, /Auto mode requires at least one provider key/u);
  assert.match(page, /Auto mode needs no API key: without Voyage or OpenAI keys it tries Ollama/u);
  assert.match(page, /then FastEmbed, and falls back to placeholder only if FastEmbed fails to load/u);
});

// Item 5: no AutoMem code reads LOG_LEVEL; the server logs at INFO (app.py:104). The
// mcp-automem client reads AUTOMEM_LOG_LEVEL, which is a different variable.
test('docs do not tell readers to set LOG_LEVEL on the AutoMem server', async () => {
  const pages = {
    'getting-started/docker.md': /Remove the debug exports from the compose file\. AutoMem has no log-level variable: the server logs at `INFO`/u,
    'development/local-setup.md': /AutoMem has no log-level environment variable, and `LOG_LEVEL` is not read\. The server starts logging at `INFO`/u,
    'reference/configuration.md': /AutoMem has no log-level or Flask-mode environment variable: `LOG_LEVEL` and `FLASK_ENV` are not read\./u,
  };

  for (const [path, fix] of Object.entries(pages)) {
    const page = await readDoc(path);

    assert.match(page, fix, `${path} should say what controls log verbosity`);
    assert.doesNotMatch(page, /\| `LOG_LEVEL` \|/u, `${path} still has a LOG_LEVEL table row`);
    assert.doesNotMatch(page, /^LOG_LEVEL=/mu, `${path} still tells readers to set LOG_LEVEL`);
    assert.doesNotMatch(page, /set `LOG_LEVEL=/u, `${path} still advises setting LOG_LEVEL`);
  }

  const configuration = await readDoc('reference/configuration.md');
  assert.doesNotMatch(configuration, /\| `FLASK_ENV` \| string \| No \| `production` \|/u);
  assert.match(configuration, /\| `AUTOMEM_LOG_LEVEL` \| No \| \(none\) \| Set to `debug` for verbose logging \|/u);
});

test('log level source links added by the sweep use a pinned AutoMem release', async () => {
  for (const path of ['development/local-setup.md', 'reference/configuration.md']) {
    const page = await readDoc(path);
    const links = [
      ...page.matchAll(
        /automem\/blob\/([0-9a-f]{40})\/(?:app\.py#L104|automem\/runtime_wiring\.py#L109)\b/gu,
      ),
    ];

    assert.ok(links.length > 0, `${path} should link the logging source`);
    for (const [, sha] of links) {
      assert.ok(isPinnedSha('automem', sha), `${path} links an unpinned AutoMem revision`);
    }
  }
});

// Item 6: enrichment retries are forced-only. The worker re-enqueues a failed job while its
// memory ID is still in flight, so the duplicate check drops every non-forced retry.
test('enrichment page limits retries to forced jobs', async () => {
  const page = await readDoc('architecture/enrichment.md');
  const retryLogic = page.match(/### Retry Logic\n([\s\S]*?)\n---/u);
  const mechanics = page.match(/### Retry Mechanics\n([\s\S]*?)\n---/u);

  assert.ok(retryLogic && mechanics, 'expected the Retry Logic and Retry Mechanics sections');
  assert.match(retryLogic[1], /^Only forced jobs are retried\./mu);
  assert.match(retryLogic[1], /the failed memory ID is still marked in flight, so a non-forced job/u);
  assert.match(retryLogic[1], /A non-forced job gets one attempt\./u);
  assert.match(retryLogic[1], /so the worker does not retry it\. `POST \/enrichment\/reprocess` queues the memory again\./u);
  assert.doesNotMatch(page, /stays unenriched/u);
  assert.match(retryLogic[1], /error \(non-forced job, or no attempts left\)/u);
  assert.match(mechanics[1], /A non-forced job is never re-queued, because the in-flight duplicate check drops its re-enqueue\./u);

  assert.doesNotMatch(page, /Jobs that fail during processing are retried up to/u);
  assert.doesNotMatch(page, /\| FalkorDB write failure \| Retry with flat backoff \| Max 3 attempts \|/u);
  assert.doesNotMatch(page, /\| Extraction exception \| Catch, log, retry \| Max 3 attempts \|/u);
  assert.doesNotMatch(page, /Maximum retry attempts before giving up/u);
  assert.match(page, /It is removed from `enrichment_inflight` when the attempt ends, after any retry re-enqueue has been attempted/u);
});

test('background processing page no longer promises automatic enrichment retries', async () => {
  const page = await readDoc('architecture/background-processing.md');
  const retries = page.match(/### Enrichment Retries\n([\s\S]*?)\n### Embedding Retries/u);

  assert.ok(retries, 'expected the Enrichment Retries section');
  assert.doesNotMatch(page, /Failed enrichment jobs are automatically retried/u);
  assert.match(retries[1], /Only forced enrichment jobs \(from `POST \/enrichment\/reprocess`\) are retried/u);
  assert.match(retries[1], /A non-forced job \(the kind `POST \/memory` queues\) is not retried\./u);
  assert.match(retries[1], /The worker does not retry it\. `POST \/enrichment\/reprocess` queues the memory again\./u);
  assert.doesNotMatch(page, /stays unenriched/u);
  assert.doesNotMatch(page, /\| `ENRICHMENT_MAX_ATTEMPTS` \| 3 \| Max retries per memory \|/u);
});

test('every enrichment retry statement in the docs is scoped to forced jobs', async () => {
  const memoryModel = await readDoc('core-concepts/memory-model.md');
  assert.match(memoryModel, /so only forced jobs from `POST \/enrichment\/reprocess` are retried/u);

  const overview = await readDoc('overview.md');
  assert.doesNotMatch(overview, /Failed jobs remain in queue with retry tracking/u);
  assert.match(overview, /only forced jobs are retried, and `POST \/enrichment\/reprocess` re-queues memories that were not enriched/u);

  const rows = {
    'getting-started/environment-variables.md': /\| `ENRICHMENT_MAX_ATTEMPTS` \| No \| `3` \| Max attempts for a forced job before giving up; non-forced jobs are not retried \|/u,
    'reference/configuration.md': /\| `ENRICHMENT_MAX_ATTEMPTS` \| int \| No \| `3` \| Max attempts for a forced job before giving up; non-forced jobs are not retried \|/u,
    'development/local-setup.md': /\| `ENRICHMENT_MAX_ATTEMPTS` \| `3` \| Max attempts for a forced enrichment job; non-forced jobs are not retried \|/u,
    'reference/api/admin.md': /\| `max_attempts` \| integer \| Maximum attempts for a forced job before giving up; non-forced jobs are not retried/u,
  };
  for (const [path, row] of Object.entries(rows)) {
    assert.match(await readDoc(path), row, `${path} should scope ENRICHMENT_MAX_ATTEMPTS to forced jobs`);
  }
});

test('background processing retry link added by the sweep uses a pinned AutoMem release', async () => {
  const page = await readDoc('architecture/background-processing.md');
  const links = [
    ...page.matchAll(
      /automem\/blob\/([0-9a-f]{40})\/automem\/enrichment\/runtime_worker\.py#L37-L41/gu,
    ),
  ];

  assert.equal(links.length, 1);
  assert.ok(isPinnedSha('automem', links[0][1]));
});

// Item 7: config.py calls load_dotenv() (project .env) and then load_dotenv(~/.config/automem/.env),
// both with override=False, so the real environment wins, then the project file, then the user file.
test('no page says the user .env overrides the project .env', async () => {
  const environmentVariables = await readDoc('getting-started/environment-variables.md');
  assert.doesNotMatch(environmentVariables, /personal overrides/u);
  assert.match(
    environmentVariables,
    /3\. \*\*User config\*\* — `~\/\.config\/automem\/\.env` \(personal defaults, never committed; it only fills in variables the first two sources leave unset\)/u,
  );

  const configuration = await readDoc('reference/configuration.md');
  const loading = configuration.match(/## Configuration Loading\n([\s\S]*?)\n---/u);
  assert.ok(loading, 'expected the Configuration Loading section');
  assert.doesNotMatch(configuration, /This hierarchy allows local overrides without modifying shared configuration files/u);
  assert.doesNotMatch(loading[1], /set `FALKORDB_HOST=localhost` in their user config/u);
  assert.match(loading[1], /neither call overrides a value that is already set/u);
  assert.match(loading[1], /It cannot override the project `\.env`: if both files set `FALKORDB_HOST`, the project value wins\./u);
  assert.match(
    loading[1],
    /1\. \*\*Process environment\*\*[\s\S]*2\. \*\*Project `\.env`\*\*[\s\S]*3\. \*\*User config\*\*/u,
  );
});

test('the load-order lists on the other pages keep the project file ahead of the user file', async () => {
  const structure = await readDoc('development/structure.md');
  assert.match(structure, /2\. The project `\.env`, loaded first[\s\S]*3\. `~\/\.config\/automem\/\.env`, loaded second; it only fills in variables that are still unset/u);

  const overview = await readDoc('architecture/overview.md');
  assert.match(overview, /a key set in the environment or the project `\.env` wins over the same key in `~\/\.config\/automem\/\.env`/u);

  const localSetup = await readDoc('development/local-setup.md');
  assert.match(localSetup, /1\. \*\*Process environment\*\* \(highest priority\)\n2\. \*\*`\.env` file\*\* in project root\n3\. \*\*`~\/\.config\/automem\/\.env`\*\*/u);
});

// Item 8: _compute_metadata_score() returns the raw sum of ten SEARCH_WEIGHT_* terms (defaults
// total 1.95) plus an unweighted context bonus. Recency uses `timestamp`; the relevance weight
// applies to the stored consolidation-decay `relevance_score`.
test('architecture overview scoring table describes relevance and the unnormalized sum', async () => {
  const page = await readDoc('architecture/overview.md');
  const section = page.match(/### 10-Component Hybrid Scoring\n([\s\S]*?)\n---/u);

  assert.ok(section, 'expected the hybrid scoring section');
  assert.doesNotMatch(section[1], /Contextual relevance hint/u);
  assert.match(
    section[1],
    /\| Relevance \| 0% \| Stored `relevance_score` written by consolidation decay \(weight 0\.0 disables it\) \| `SEARCH_WEIGHT_RELEVANCE` \|/u,
  );
  assert.match(section[1], /`_compute_metadata_score\(\)` returns the raw weighted sum of these ten terms plus an unweighted context bonus/u);
  assert.match(section[1], /default weights total 1\.95 and nothing normalizes it, so a score can exceed 1\.0/u);
  assert.match(section[1], /recall can add a temporal re-rank term \(`SEARCH_WEIGHT_TEMPORAL` times relative recency, only when the recency re-rank runs\) and a flat `0\.15` for entity-expanded results to the `final_score` it returns/u);
  assert.doesNotMatch(section[1], /`final_score` is the raw weighted sum/u);
  assert.match(section[1], /decays with the age of the memory's `timestamp`, not with `last_accessed`/u);
});

test('configuration reference describes SEARCH_WEIGHT_RELEVANCE and the unnormalized sum', async () => {
  const page = await readDoc('reference/configuration.md');
  const section = page.match(/### Search Scoring Weights\n([\s\S]*?)\n### Recall Behavior/u);

  assert.ok(section, 'expected the Search Scoring Weights section');
  assert.doesNotMatch(page, /LLM-scored relevance/u);
  assert.match(
    section[1],
    /\| `SEARCH_WEIGHT_RELEVANCE` \| float \| No \| `0\.0` \| Weight on the stored consolidation-decay `relevance_score` \(age, access, relationships, importance, confidence\); `0\.0` disables it \|/u,
  );
  assert.match(section[1], /Their defaults total 1\.95, and nothing normalizes the result, so a `final_score` can exceed 1\.0/u);
  assert.match(section[1], /An unweighted context bonus is added on top\. After scoring, recall can add `SEARCH_WEIGHT_TEMPORAL` times relative recency \(only when the recency re-rank runs\) and a flat `0\.15` to entity-expanded results\./u);
  assert.match(section[1], /not with `last_accessed`/u);
});

test('hybrid search keeps ten weighted components, an unweighted context bonus, and no normalization', async () => {
  const page = await readDoc('core-concepts/hybrid-search.md');

  assert.match(page, /sum of ten weighted components plus an unweighted context bonus/u);
  assert.match(page, /The sum is not normalized\./u);
  assert.match(page, /`last_accessed` plays no part in the recency score/u);
  assert.doesNotMatch(page, /(?:nine|9|eleven|11)[- ](?:weighted )?components?/iu);
});

// Item 9: enrichment assembles entity:{category}:{slug} with plural categories
// (tools, projects, people, concepts, organizations).
test('configuration reference shows plural entity categories in generated tags', async () => {
  const page = await readDoc('reference/configuration.md');
  const section = page.match(/\*\*Entity tag generation:\*\*\n([\s\S]*?)\n### Consolidation Engine/u);

  assert.ok(section, 'expected the Entity tag generation section');
  assert.match(section[1], /pattern `entity:<category>:<slug>`\. The category is always plural/u);
  assert.match(section[1], /replaced by `-`, with any leading or trailing `-` removed:/u);
  for (const tag of [
    'entity:tools:postgresql',
    'entity:projects:automem',
    'entity:people:sarah',
    'entity:organizations:openai',
    'entity:concepts:acid-compliance',
  ]) {
    assert.ok(section[1].includes(`\`${tag}\``), `expected ${tag}`);
  }
  assert.doesNotMatch(page, /entity:(?:tool|project|person|organization|concept):/u);
});

test('no docs page uses a singular entity category in a tag', async () => {
  for (const path of [
    'architecture/enrichment.md',
    'core-concepts/hybrid-search.md',
    'best-practices/memory-rules.md',
    'research.md',
    'reference/configuration.md',
  ]) {
    assert.doesNotMatch(await readDoc(path), /entity:(?:tool|project|person|organization|concept):/u, path);
  }
});

// Item 10: Google's product is spelled "Antigravity" (mcp-automem INSTALLATION.md and README.md).
test('docs spell Google Antigravity consistently', async () => {
  const { readdir } = await import('node:fs/promises');
  const files = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const next = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dir);
      if (entry.isDirectory()) await walk(next);
      else if (/\.mdx?$/u.test(entry.name)) files.push(next);
    }
  }
  await walk(docsRoot);

  assert.ok(files.length > 20, 'expected to scan the whole docs tree');
  for (const file of files) {
    assert.doesNotMatch(await readFile(file, 'utf8'), /AntiGravity/u, fileURLToPath(file));
  }

  const page = await readDoc('platforms/antigravity.md');
  assert.match(page, /^title: Google Antigravity$/mu);
  assert.match(page, /^description: Add AutoMem memory to Google Antigravity editor via MCP\.$/mu);
  assert.match(page, /subgraph "Antigravity Editor"/u);
  assert.match(page, /UI\["Antigravity UI"\]/u);
  assert.match(page, /^### Tools not appearing in Antigravity$/mu);

  const overview = await readDoc('overview.md');
  assert.match(overview, /AG\["Google Antigravity"\]/u);
  assert.match(overview, /- \*\*\[Google Antigravity\]\(\/docs\/platforms\/antigravity\/\)\*\*/u);
});

test('the sidebar labels the Antigravity page with Google\'s spelling and keeps the URL slug', async () => {
  const config = await readFile(fileURLToPath(new URL('../astro.config.mjs', import.meta.url)), 'utf8');

  assert.match(config, /\{ label: 'Google Antigravity', slug: 'docs\/platforms\/antigravity' \}/u);
  assert.doesNotMatch(config, /AntiGravity/u);
});

// Item 11: AutoMem's /viewer is a compatibility redirect to GRAPH_VIEWER_URL (503 when unset).
// The viewer only enters embedded mode when its own pathname starts with /viewer.
test('graph viewer setup describes /viewer as a redirect, not a served viewer', async () => {
  const page = await readDoc('graph-viewer/setup.md');

  assert.doesNotMatch(page, /When the viewer is served from AutoMem's `\/viewer` path/u);
  assert.doesNotMatch(page, /\(e\.g\. `\/viewer\/` on the AutoMem API origin\)/u);
  assert.match(page, /AutoMem's `\/viewer` path is a compatibility redirect, not a copy of the viewer/u);
  assert.match(page, /When `GRAPH_VIEWER_URL` is set to your deployed viewer, `GET \/viewer\/` returns a small page that sends the browser there\./u);
  assert.match(page, /adds `\?server=<automem-origin>` when the URL has no `server` parameter/u);
  assert.match(page, /If `GRAPH_VIEWER_URL` is not set, `\/viewer` answers `503`\./u);
  assert.match(page, /`ENABLE_GRAPH_VIEWER` is enabled, which is the default/u);
  assert.match(page, /The viewer treats itself as embedded when its own page path starts with `\/viewer`/u);
  assert.match(page, /AutoMem does not serve those assets itself/u);
  assert.match(page, /The check looks at the path only, so it applies wherever the built assets are served under `\/viewer\/`/u);
  assert.match(page, /unless a `\?server=` parameter overrides them/u);
  assert.doesNotMatch(page, /That only happens if/u);
  assert.match(page, /AutoMem's own `\/viewer` route does not serve them/u);
});

test('graph viewer setup source links use pinned releases', async () => {
  const page = await readDoc('graph-viewer/setup.md');
  const automemLinks = [
    ...page.matchAll(/verygoodplugins\/automem\/blob\/([0-9a-f]{40})\/automem\/api\/viewer\.py#L94-L106/gu),
  ];
  const viewerLinks = [
    ...page.matchAll(
      /verygoodplugins\/automem-graph-viewer\/blob\/([0-9a-f]{40})\/src\/api\/client\.ts#L9-L11/gu,
    ),
  ];

  assert.equal(automemLinks.length, 1);
  assert.equal(viewerLinks.length, 1);
  assert.ok(isPinnedSha('automem', automemLinks[0][1]));
  assert.ok(isPinnedSha('automem-graph-viewer', viewerLinks[0][1]));
});

// Item 12: the sidecar sets `Cache-Control: no-cache, no-transform` on /mcp and /mcp/sse
// (mcp-sse-server/server.js:1053-1054, :1114-1115), and only delete_memory carries
// destructiveHint: true (:615); update_memory is destructiveHint: false (:593).
test('claude-web documents the sidecar Cache-Control header and labels update_memory as a plain write', async () => {
  const page = await readDoc('platforms/claude-web.md');

  assert.match(page, /\(`X-Accel-Buffering: no`, `Cache-Control: no-cache, no-transform`\)/u);
  assert.doesNotMatch(page, /`Cache-Control: no-cache`/u);
  assert.match(page, /^\| `update_memory` \| Write \| Modify existing memory fields \|$/mu);
  assert.doesNotMatch(page, /^\| `update_memory` \| Write\/Destructive/mu);
  assert.match(page, /^\| `delete_memory` \| Write\/Destructive \| Permanently remove a memory \|$/mu);
});

test('the ElevenLabs page and Claude.ai page agree on the sidecar streaming headers', async () => {
  const elevenlabs = await readDoc('platforms/elevenlabs.md');
  const web = await readDoc('platforms/claude-web.md');

  for (const page of [elevenlabs, web]) {
    assert.match(page, /`X-Accel-Buffering: no`, `Cache-Control: no-cache, no-transform`/u);
  }
});

// Item 13: AUTOMEM_API_URL is optional. mcp-automem defaults it to http://127.0.0.1:8001
// (src/env.ts:26), and the Railway sidecar falls back to the same default (server.js:807).
test('no page marks AUTOMEM_API_URL as plainly required', async () => {
  const rows = {
    'cli/config-tools.md': /^\| `AUTOMEM_API_URL` \| No \| `http:\/\/127\.0\.0\.1:8001` \| HTTP URL of the AutoMem service\. Defaults to the local URL; set it for cloud or any non-default port \|$/mu,
    'getting-started/environment-variables.md': /^\| `AUTOMEM_API_URL` \| No \| `http:\/\/127\.0\.0\.1:8001` \| HTTP URL of the AutoMem server \(canonical name\)\. Defaults to the local URL; set it for cloud \|$/mu,
    'reference/configuration.md': /^\| `AUTOMEM_API_URL` \| No \| `http:\/\/127\.0\.0\.1:8001` \| HTTP URL of the AutoMem service \(written by the guided installer\)\. Defaults to the local URL; set it for cloud \|$/mu,
    'platforms/antigravity.md': /^\| `AUTOMEM_API_URL` \| No \| AutoMem service URL\. Defaults to the local URL; set it for cloud deployments \| `http:\/\/127\.0\.0\.1:8001` \|$/mu,
    'platforms/claude-desktop.md': /^\| `AUTOMEM_API_URL` \| No \| AutoMem service URL\. Defaults to the local URL; set it for cloud deployments \| `http:\/\/127\.0\.0\.1:8001` \|$/mu,
    'platforms/github-copilot.md': /^\| `AUTOMEM_API_URL` \| Yes for the cloud agent \| AutoMem service URL \(must be public\)\. It defaults to `http:\/\/127\.0\.0\.1:8001`, which the Copilot agent cannot reach \|$/mu,
  };

  for (const [path, row] of Object.entries(rows)) {
    const page = await readDoc(path);

    assert.match(page, row, `${path} should say AUTOMEM_API_URL defaults to the local URL`);
    assert.doesNotMatch(page, /^\| `AUTOMEM_API_URL` \| Yes \|/mu, `${path} still marks AUTOMEM_API_URL required`);
  }
});

test('Railway sidecar tables show the real AUTOMEM_API_URL default', async () => {
  const page = await readDoc('deployment/railway.md');
  const rows = [...page.matchAll(/^\| `AUTOMEM_API_URL` \|.*$/gmu)].map(([row]) => row);

  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.equal(
      row,
      '| `AUTOMEM_API_URL` | Yes on Railway | `http://127.0.0.1:8001` | Internal URL: `http://memory-service.railway.internal:8001`. The default is a local address, so set it |',
    );
  }
  assert.doesNotMatch(page, /^\| `AUTOMEM_API_URL` \| Yes \| None \|/mu);
});

// Item 14: the Cursor page uses `sort` and `expand_respect_tags`, so its recall_memory list
// must carry both, described from the mcp-automem recall_memory schema.
test('cursor recall_memory parameter list includes sort and expand_respect_tags', async () => {
  const page = await readDoc('platforms/cursor.md');
  const recall = page.match(/\*\*`recall_memory`\*\* — Hybrid search\n([\s\S]*?)\n\*\*`associate_memories`\*\*/u);

  assert.ok(recall, 'expected the recall_memory parameter list');
  assert.match(
    recall[1],
    /^- Ordering: `sort` \(`score`, `time_desc`, `time_asc`, `updated_desc`, or `updated_asc`; use `time_\*` for chronological recaps\)$/mu,
  );
  assert.match(
    recall[1],
    /^- Expansion scope: `expand_respect_tags` \(ranked mode only\)\. When true, graph and entity expansion stays within the original tag scope; when false, expansion may include related context outside the tags$/mu,
  );

  // Every recall parameter the prose relies on is in the list.
  for (const name of ['sort', 'expand_respect_tags', 'expand_relations', 'time_query', 'language', 'active_path']) {
    assert.ok(recall[1].includes(`\`${name}\``), `expected ${name} in the recall_memory list`);
  }
});

// Item 15: at the mcp-automem pin the Codex, Cursor, Grok, and Claude Desktop rules, the Claude
// Code plugin (skill, /memory-store, README), and the OpenClaw plugin policy ban platform and date
// tags. The CLAUDE.md rules template and the Copilot rules are silent; the Hermes rules
// list `hermes` as an example bare tag; the OpenClaw MCP and legacy skills avoid platform tags only.
test('memory rules page names the hosts that state the platform and date tag bans and the ones that stay silent', async () => {
  const page = await readDoc('best-practices/memory-rules.md');
  const caution = page.match(/:::caution\[Bare tags only\]\n([\s\S]*?)\n:::/u);

  assert.ok(caution, 'expected the Bare tags only caution');
  assert.match(
    caution[1],
    /The Codex, Cursor, Grok, and Claude Desktop rules spell the convention out: no `project\/` or `lang\/` prefixes, no platform tags/u,
  );
  assert.match(
    caution[1],
    /The Claude Code plugin \(its memory-management skill and `\/memory-store` command\) and the OpenClaw plugin policy ban platform and date tags too\./u,
  );
  assert.match(caution[1], /Not every host's rules say that much\./u);
  assert.match(
    caution[1],
    /The Claude Code `CLAUDE\.md` rules template and the Copilot rules say `automem`, not `project\/automem`, and do not mention platform or date tags/u,
  );
  assert.match(caution[1], /the OpenClaw MCP and legacy skills only say to avoid platform tags like `openclaw`/u);
  assert.match(caution[1], /the Hermes rules list `hermes` among their example bare tags/u);
  assert.doesNotMatch(caution[1], /The Claude Code and Copilot rules say/u);
  assert.doesNotMatch(page, /^The shipped memory policy has agents write \*\*bare string tags\*\*: no `project\/`/mu);

  assert.match(
    page,
    /Don't put dates in tags; the Codex, Cursor, Grok, and Claude Desktop rules, the Claude Code plugin, and the OpenClaw plugin policy rule out date-stamped tags\./u,
  );
  assert.doesNotMatch(page, /the shipped templates rule out date-stamped tags/u);
});

test('Claude Code and Copilot pages attribute the platform-tag ban to the sources that state it', async () => {
  const claudeCode = await readDoc('platforms/claude-code.md');
  const tagging = claudeCode.match(/## Tagging Strategy\n([\s\S]*?)\n## /u);

  assert.ok(tagging, 'expected the Tagging Strategy section');
  assert.match(tagging[1], /Do not add a platform tag \(such as `claude-code`\) or date tags/u);
  assert.match(
    tagging[1],
    /The plugin's memory-management skill and `\/memory-store` command state the platform-tag and date-tag ban\. The `CLAUDE\.md` rules template says `automem`, not `project\/automem`, and not to author `entity:\*:\*` tags, and does not mention platform or date tags\./u,
  );
  assert.doesNotMatch(claudeCode, /that advice follows the Codex, Cursor, Grok, and Claude Desktop rules/u);
  assert.doesNotMatch(claudeCode, /The generated Claude Code rules themselves/u);

  const copilot = await readDoc('platforms/github-copilot.md');
  assert.match(
    copilot,
    /Those bans are spelled out in the Cursor, Codex, Grok, and Claude Desktop rules and in the Claude Code and OpenClaw plugins; the Copilot instructions template itself says `automem`, not `project\/automem`, and not to author `entity:\*:\*` tags, and does not mention platform or date tags\./u,
  );
});

test('Hermes keeps its own platform tag and the Hermes page still lists it', async () => {
  const hermes = await readDoc('platforms/hermes.md');

  assert.match(hermes, /- `automem`, `hermes` — system \+ platform/u);
});

// Item 16: facts that were already believed correct, confirmed against the pins, plus the stray
// wrong occurrences the sweep found.
async function listDocs() {
  const { readdir } = await import('node:fs/promises');
  const files = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const next = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dir);
      if (entry.isDirectory()) await walk(next);
      else if (/\.mdx?$/u.test(entry.name)) files.push(next);
    }
  }
  await walk(docsRoot);
  return files;
}

test('16a: /consolidate/status is documented as needing the API token', async () => {
  const auth = await readDoc('reference/authentication.md');
  assert.match(
    auth,
    /\| \*\*Standard\*\* \| [^\n]*`\/consolidate\/status`[^\n]* \| Yes \| No \|/u,
  );

  const consolidation = await readDoc('reference/api/consolidation.md');
  assert.match(consolidation, /^\| `\/consolidate\/status` \| GET \| [^\n]* \| API token \|$/mu);

  for (const path of ['architecture/overview.md', 'architecture/background-processing.md']) {
    const page = await readDoc(path);
    assert.match(page, /`(?:GET )?\/consolidate\/status`? \|(?: GET \|)? [^\n]*\| API token \|/u, path);
  }

  for (const file of await listDocs()) {
    const page = await readFile(file, 'utf8');
    assert.doesNotMatch(
      page,
      /`\/consolidate\/status` (?:is|are) (?:exempt|public|unauthenticated)|^\|[^\n]*`\/consolidate\/status`[^\n]*\| (?:None|Public|None \(public\)) \|/imu,
      fileURLToPath(file),
    );
  }
});

test('16b: /backup skips the API-token guard but every curl to it sends the admin token', async () => {
  const auth = await readDoc('reference/authentication.md');
  assert.match(auth, /\| `\/backup` \| GET \| Export restore-compatible backup archive \| \*\*No\*\* \| Yes \|/u);

  const admin = await readDoc('reference/api/admin.md');
  assert.match(admin, /`\/backup` is the admin-only exception: it bypasses the API-token guard but still requires the admin token\./u);

  for (const file of await listDocs()) {
    const page = await readFile(file, 'utf8');
    const lines = page.split('\n');
    lines.forEach((line, index) => {
      if (!/curl[^\n]*\/backup(?:[?"\s]|$)/u.test(line) && !/^\s*"https?:\/\/[^"]*\/backup[?"]/u.test(line)) return;
      const window = lines.slice(Math.max(0, index - 2), index + 3).join('\n');
      assert.match(window, /X-Admin-Token/u, `${fileURLToPath(file)}:${index + 1} calls /backup without the admin token`);
    });
  }
});

test('16c: no page says AutoMem defaults to a port other than 8001', async () => {
  for (const file of await listDocs()) {
    const page = await readFile(file, 'utf8');
    for (const line of page.split('\n')) {
      if (!/\b5000\b/u.test(line) || !/\bPORT\b|Flask/u.test(line)) continue;
      assert.match(line, /\bnot\b|\bdoes not\b/iu, `${fileURLToPath(file)}: ${line}`);
    }
  }

  const railway = await readDoc('deployment/railway.md');
  assert.match(railway, /`PORT=8001` is \*\*required\*\*/u);
  assert.match(railway, /Must be set to 8001 on Railway/u);
  const quickStart = await readDoc('getting-started/quick-start.md');
  assert.match(quickStart, /AutoMem defaults to port `8001`\./u);
  assert.match(quickStart, /pin `PORT=8001` on `memory-service`/u);
});

test('16d: installer pages use the memory key and Hermes uses automem', async () => {
  const installers = await readDoc('cli/platform-installers.md');
  const keys = [...installers.matchAll(/"mcpServers":\s*\{\s*"([^"]+)"/gu)].map(([, key]) => key);

  assert.ok(keys.length >= 3);
  assert.ok(keys.every((key) => key === 'memory'), `unexpected installer server keys: ${keys.join(', ')}`);

  const hermes = await readDoc('platforms/hermes.md');
  assert.match(hermes, /AutoMem registers as a standard MCP server \(`mcp_servers\.automem`\)/u);
});

test('16e: error examples use the shared envelope on the abort() paths', async () => {
  const troubleshooting = await readDoc('operations/troubleshooting.md');
  assert.match(troubleshooting, /^\{"status": "error", "code": 401, "message": "Unauthorized"\}$/mu);
  assert.doesNotMatch(troubleshooting, /"Invalid or missing API token"/u);

  const relationships = await readDoc('reference/api/relationships.md');
  const errors = relationships.match(/### Error Responses\n([\s\S]*?)\n---/u);
  assert.ok(errors, 'expected the Error Responses section');
  assert.match(errors[1], /Errors from `abort\(\)` use the shared envelope/u);
  assert.doesNotMatch(errors[1], /^\s*"error":/mu);
  for (const [code, message] of [
    [404, 'One or both memories do not exist'],
    [400, 'Cannot associate a memory with itself'],
    [400, "'memory1_id' and 'memory2_id' are required"],
    [503, 'FalkorDB is unavailable'],
  ]) {
    assert.ok(
      errors[1].includes(`"status": "error",\n  "code": ${code},\n  "message": "${message}"`),
      `expected ${code} ${message}`,
    );
  }
  assert.match(errors[1], /"message": "Relation type must be one of \['CONTRADICTS', 'DERIVED_FROM', 'EVOLVED_INTO', \.\.\.\]"/u);
  assert.doesNotMatch(relationships, /Invalid relationship type: INVALID_TYPE/u);

  // The local exception paths (consolidation, analyze) keep their own { "error": ... } shape.
  const consolidation = await readDoc('reference/api/consolidation.md');
  assert.match(consolidation, /\{"error": "Consolidation failed", "details": "<exception message>"\}/u);
});

test('configuration reference does not say every endpoint except /health needs the API token', async () => {
  const page = await readDoc('reference/configuration.md');

  assert.doesNotMatch(page, /All endpoints except `\/health` require authentication/u);
  assert.match(
    page,
    /Every endpoint except `\/health`, `\/backup`, and `\/viewer\*` \(plus `OPTIONS` preflight requests\) requires the API token when `AUTOMEM_API_TOKEN` is set\. `\/backup` skips that guard but requires the admin token instead:/u,
  );
});

// Item 17: over MCP, associate_memories needs an explicit strength (the client throws when it is
// missing or outside 0-1, automem-client.ts:121-126). The HTTP API defaults it to 0.5.
test('relationships page says MCP associate_memories requires strength', async () => {
  const page = await readDoc('reference/api/relationships.md');
  const tool = page.match(/## MCP Tool: `associate_memories`\n([\s\S]*?)\n### Output Schema/u);

  assert.ok(tool, 'expected the MCP tool section');
  assert.match(tool[1], /^\| `strength` \| number \| Yes \| 0\.0–1\.0 \| Relationship strength\. The MCP tool has no default \|$/mu);
  assert.doesNotMatch(tool[1], /default 0\.5/u);
  assert.match(tool[1], /\| `type` \| string \(enum\) \| Yes \|/u);
  assert.match(tool[1], /:::note\[Strength is required over MCP\]/u);
  assert.match(tool[1], /the tool's input schema has no top-level `required` list/iu);
  assert.match(tool[1], /\(for example `associate_memories: single association strength is required`\)/u);
  assert.match(tool[1], /`POST \/associate` uses `strength` 0\.5 and `type` `RELATES_TO` when you omit them/u);

  // The HTTP request table keeps the real server default.
  assert.match(page, /^\| `strength` \| float \| No \| Edge weight 0\.0–1\.0 \(default: 0\.5\) \|$/mu);
});

test('no page other than the HTTP descriptions gives the MCP associate_memories strength a default', async () => {
  for (const path of ['platforms/cursor.md', 'platforms/claude-code.md', 'platforms/codex.md', 'best-practices/memory-rules.md']) {
    const page = await readDoc(path);

    assert.doesNotMatch(page, /associate_memories[^\n]*strength[^\n]*(?:default|optional)/iu, path);
  }
});

// Item 18: ranked recall is clamped to RECALL_MAX_LIMIT (default 100, app.py:241 and
// automem/api/recall.py:1753) and defaults to 5 (recall.py:1750); tag enumeration is clamped to
// 200 by the client and the server. No docs prose may claim a ~50 server clamp.
test('no docs page claims a ~50 server-side clamp on recall limit', async () => {
  // The two API pages may quote the upstream recall_memory tool description verbatim.
  const excluded = ['reference/api/recall-operations.md', 'reference/api/direct-vs-mcp.md'];

  for (const file of await listDocs()) {
    const path = fileURLToPath(file);
    if (excluded.some((suffix) => path.endsWith(suffix))) continue;
    const page = await readFile(file, 'utf8');

    assert.doesNotMatch(
      page,
      /~\s?50\b[^\n]*(?:clamp|\bcap(?:ped|s)?\b|limit)|(?:clamp|\bcap(?:ped|s)?\b|limit)[^\n]*~\s?50\b|typically clamped server-side/iu,
      `${path} claims a ~50 recall clamp`,
    );
  }
});

test('recall limit facts that remain on the docs match the pinned server behavior', async () => {
  const environment = await readDoc('getting-started/environment-variables.md');
  assert.match(environment, /^\| `RECALL_MAX_LIMIT` \| No \| `100` \| Hard cap on the number of results `\/recall` can return \|$/mu);

  const configuration = await readDoc('reference/configuration.md');
  assert.match(configuration, /^\| `RECALL_MAX_LIMIT` \| int \| No \| `100` \| Maximum results returned by `\/recall` \|$/mu);

  const hybrid = await readDoc('core-concepts/hybrid-search.md');
  assert.match(hybrid, /^\| `limit` \| integer \| 5 \| Maximum seed results \|$/mu);
});

// Fix round 1: memory-operations.md keeps the substring that tests/memory-operations-docs.test.mjs
// asserts, but names the hosts whose shipped policy actually states the ban.
test('memory operations scopes the platform and date tag ban to the hosts that state it', async () => {
  const page = await readDoc('reference/api/memory-operations.md');

  assert.match(
    page,
    /The memory policy shipped for Codex, Cursor, Grok, Claude Desktop, the Claude Code plugin, and the OpenClaw plugin forbids platform and date-stamped tags \(the Claude Code `CLAUDE\.md` rules template and the Copilot rules do not mention them\)/u,
  );
  assert.doesNotMatch(page, /The shipped memory policy forbids platform and date-stamped tags/u);
});

// Fix round 1: the Authentication examples on the quick start still target /health because
// tests/quick-start-release-claims.test.mjs asserts the Bearer line, so the page says what they show.
test('quick start Authentication block says /health does not check the token', async () => {
  const page = await readDoc('getting-started/quick-start.md');
  const auth = page.match(/## Authentication\n([\s\S]*?)\n---/u);

  assert.ok(auth, 'expected the Authentication section');
  assert.match(auth[1], /curl -H "Authorization: Bearer YOUR_TOKEN" http:\/\/localhost:8001\/health/u);
  assert.match(auth[1], /curl -H "X-API-Key: YOUR_TOKEN" http:\/\/localhost:8001\/health/u);
  assert.match(
    auth[1],
    /These examples show the header and query forms only\. `\/health` accepts any token or none, so a `200` from it does not mean the token is valid\. To check a token, send it to an endpoint that requires one, such as `\/recall\?limit=1` \(see \[Verify it worked\]\(#verify-it-worked\)\)\./u,
  );
  assert.match(page, /^## Verify it worked$/mu);
});

// Fix round 1: the introduction page also said a missing OPENAI_API_KEY means placeholder vectors.
test('introduction no longer says a missing OPENAI_API_KEY means placeholder embeddings', async () => {
  const page = await readDoc('getting-started/introduction.md');

  assert.doesNotMatch(page, /Without an `OPENAI_API_KEY`, the system uses `PlaceholderEmbeddingProvider`/u);
  assert.doesNotMatch(page, /enables semantic embeddings instead of placeholder hash-based vectors/u);
  assert.match(
    page,
    /- \*\*OpenAI API key\*\* — optional hosted embeddings\. With no provider key, `EMBEDDING_PROVIDER=auto` uses a configured Ollama server or a local FastEmbed model/u,
  );
  assert.match(
    page,
    /Without a Voyage or OpenAI key, `EMBEDDING_PROVIDER=auto` tries Ollama \(when `OLLAMA_BASE_URL` or `OLLAMA_MODEL` is set\), then a local FastEmbed model\. At startup, `auto` falls back to `PlaceholderEmbeddingProvider`[^\n]*only when FastEmbed cannot load; setting `EMBEDDING_PROVIDER=placeholder` forces it\./u,
  );
});

// Fix round 1: on a fresh deploy the post-provisioning wait runs the same authenticated probe
// but reports "isn't responding yet" (mcp-automem src/cli/install.ts:2228-2244).
test('guided cloud setup says a rejected key on a fresh deploy shows as isn\'t responding yet', async () => {
  const page = await readDoc('cli/guided-cloud-setup.md');

  assert.match(
    page,
    /On a fresh InstaPods or Railway deploy the wait step runs the same probe, so a rejected key shows there as "`<endpoint>` isn't responding yet" after the wait/u,
  );
});

// Fix round 1: the worker sleeps only when a re-enqueue follows (runtime_worker.py:149-152), so it
// does not sleep after the final failure, and max_attempts is a forced-job limit.
test('enrichment pages say the backoff sleep happens only for failures that are re-enqueued', async () => {
  const enrichment = await readDoc('architecture/enrichment.md');
  const background = await readDoc('architecture/background-processing.md');

  assert.match(enrichment, /After a failure that has attempts left, the worker sleeps `ENRICHMENT_FAILURE_BACKOFF_SECONDS`/u);
  assert.match(enrichment, /The worker still sleeps the backoff after a failure that has attempts left, but the re-enqueue is dropped/u);
  assert.match(enrichment, /a flat sleep of `ENRICHMENT_FAILURE_BACKOFF_SECONDS` after each failure that is re-enqueued\./u);
  assert.match(enrichment, /- `max_attempts` — Configured attempt limit for forced jobs \(`ENRICHMENT_MAX_ATTEMPTS`\)/u);
  assert.doesNotMatch(enrichment, /Configured retry limit/u);
  assert.match(background, /sleeps this flat duration after each failure that is re-enqueued, then re-enqueues the job/u);
  assert.match(background, /The worker still sleeps the backoff after a failure that has attempts left/u);
  assert.doesNotMatch(background, /sleeps this flat duration on each failure/u);
});
