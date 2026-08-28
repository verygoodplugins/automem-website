import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const defaultLedgerPath = fileURLToPath(
  new URL('../.github/docs-pr-reconciliation.md', import.meta.url),
);
const ledgerPath = process.env.DOCS_PR_RECONCILIATION_PATH || defaultLedgerPath;

const auditDir = fileURLToPath(
  new URL('../.github/docs-pr-reconciliation/audits/', import.meta.url),
);
const expectedReleasePins = [
  'e147c352b100ebbf29e6555453fdde5152066138',
  '9a0bbf754dd31db524da25638b0e97907e32ff37',
];
const expectedAuditFiles = [
  'release-audit-259-266.md',
  'release-audit-267-272.md',
  'release-audit-273-278.md',
  'release-audit-283-287.md',
  'release-audit-288-294.md',
  'release-audit-295-302.md',
  'release-audit-303-307.md',
  'release-audit-330-333.md',
  'release-audit-architecture.md',
  'release-audit-final.md',
  'release-audit-mcp-cohort.md',
  'release-audit-next-pages.md',
  'supersession-map.md',
];

async function readLedger() {
  return readFile(ledgerPath, 'utf8');
}

test('docs reconciliation ledger uses the audited release pins', async () => {
  const ledger = await readLedger();

  for (const releasePin of expectedReleasePins) {
    assert.match(
      ledger,
      new RegExp(releasePin, 'u'),
      `expected ledger to include release pin ${releasePin}`,
    );
  }
});

test('docs reconciliation ledger points to the tracked audit archive', async () => {
  const ledger = await readLedger();

  assert.match(ledger, /`\.github\/docs-pr-reconciliation\/audits\/`/u);
  assert.doesNotMatch(ledger, /`\.superpowers\/reconciliation\/`/u);
  assert.match(ledger, /\[Supersession map\]\(\.\/docs-pr-reconciliation\/audits\/supersession-map\.md\)/u);
});

test('docs reconciliation ledger links every claim-level audit cohort', async () => {
  const ledger = await readLedger();

  const expectedLinks = [
    './docs-pr-reconciliation/audits/release-audit-259-266.md',
    './docs-pr-reconciliation/audits/release-audit-267-272.md',
    './docs-pr-reconciliation/audits/release-audit-273-278.md',
    './docs-pr-reconciliation/audits/release-audit-283-287.md',
    './docs-pr-reconciliation/audits/release-audit-288-294.md',
    './docs-pr-reconciliation/audits/release-audit-295-302.md',
    './docs-pr-reconciliation/audits/release-audit-303-307.md',
    './docs-pr-reconciliation/audits/release-audit-330-333.md',
    './docs-pr-reconciliation/audits/release-audit-architecture.md',
    './docs-pr-reconciliation/audits/release-audit-final.md',
    './docs-pr-reconciliation/audits/release-audit-mcp-cohort.md',
    './docs-pr-reconciliation/audits/release-audit-next-pages.md',
    './docs-pr-reconciliation/audits/supersession-map.md',
  ];

  for (const expectedLink of expectedLinks) {
    assert.match(ledger, new RegExp(expectedLink.replaceAll('.', '\\.'), 'u'));
  }
});

test('docs reconciliation audit archive contains every tracked report', async () => {
  await Promise.all(
    expectedAuditFiles.map(async (fileName) => {
      const fileUrl = new URL(fileName, `file://${auditDir}`);
      await access(fileURLToPath(fileUrl));
    }),
  );
});
