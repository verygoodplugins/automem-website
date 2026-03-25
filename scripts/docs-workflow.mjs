#!/usr/bin/env node

import path from 'path';
import {
  buildReport,
  classifyUnmappedFiles,
  collectAffectedDocs,
  getChangedFiles,
  loadDocMap,
  resolveRefRange,
  resolveRepoConfig,
  writeReport,
} from './docs-workflow-lib.mjs';

function printUsage() {
  console.log(`Usage:
  npm run docs:report -- <repo>
  npm run docs:report -- <repo> --from-ref <ref> --to-ref <ref>

Repos:
  automem
  mcp-automem
  automem-graph-viewer
`);
}

function parseArgs(argv) {
  const [, , command, repoKey, ...rest] = argv;
  if (command !== 'report' || !repoKey) {
    printUsage();
    process.exit(1);
  }

  const options = {
    repoKey,
    fromRef: null,
    toRef: null,
    outputDir: '.docs-reports',
  };

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--from-ref') {
      options.fromRef = rest[++i];
    } else if (arg === '--to-ref') {
      options.toRef = rest[++i];
    } else if (arg === '--output-dir') {
      options.outputDir = rest[++i];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printSummary(report, reportPath) {
  console.log(`Repo: ${report.repoKey}`);
  console.log(`Source root: ${report.sourceRoot}`);
  console.log(`Range: ${report.fromRef}..${report.toRef}`);
  console.log(`Changed files: ${report.summary.changedFileCount}`);
  console.log(`Affected docs: ${report.summary.affectedDocCount}`);
  console.log(`Doc-relevant unmapped files: ${report.summary.docRelevantUnmappedCount}`);
  console.log(`Ignored unmapped files: ${report.summary.ignoredUnmappedCount}`);
  console.log(`Report: ${reportPath}`);

  if (report.affectedDocs.length > 0) {
    console.log('\nAffected doc pages:');
    for (const doc of report.affectedDocs) {
      console.log(`- ${doc.slug}`);
    }
  }

  if (report.unmatchedFiles.docRelevant.length > 0) {
    console.log('\nDoc-relevant unmapped files:');
    for (const filePath of report.unmatchedFiles.docRelevant) {
      console.log(`- ${filePath}`);
    }
  }

  if (report.unmatchedFiles.ignored.length > 0) {
    console.log('\nIgnored unmapped files:');
    for (const filePath of report.unmatchedFiles.ignored) {
      console.log(`- ${filePath}`);
    }
  }
}

function main() {
  const options = parseArgs(process.argv);
  const repoRoot = process.cwd();
  const mapPath = path.join(repoRoot, 'scripts', 'file-doc-map.json');
  const docMap = loadDocMap(mapPath);
  const repoConfig = resolveRepoConfig(options.repoKey, docMap);
  const refRange = resolveRefRange(repoConfig, options.fromRef, options.toRef);
  const sourceRoot = path.resolve(repoRoot, repoConfig.sourceRoot);
  const changedFiles = getChangedFiles(sourceRoot, refRange.fromRef, refRange.toRef);
  const { affectedDocs } = collectAffectedDocs(options.repoKey, docMap, changedFiles);
  const unmatched = classifyUnmappedFiles(repoConfig, docMap, changedFiles);
  const report = buildReport({
    repoConfig,
    fromRef: refRange.fromRef,
    toRef: refRange.toRef,
    changedFiles,
    affectedDocs,
    unmatched,
  });
  const reportPath = writeReport(report, path.resolve(repoRoot, options.outputDir));

  printSummary(report, reportPath);

  if (unmatched.docRelevant.length > 0) {
    process.exitCode = 2;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
