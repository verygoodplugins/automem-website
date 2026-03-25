import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

export const DOCS_ROOT = 'src/content/docs/docs';

const DEFAULT_REPO_CONFIG = {
  automem: {
    sourceRoot: '../automem',
  },
  'mcp-automem': {
    sourceRoot: '../mcp-servers/mcp-automem',
  },
  'automem-graph-viewer': {
    sourceRoot: '../automem-graph-viewer',
  },
};

export function loadDocMap(mapPath) {
  return JSON.parse(fs.readFileSync(mapPath, 'utf8'));
}

export function matchesPattern(filePath, pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLE_STAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp(`^${escaped}$`).test(filePath);
}

export function slugToDocPath(slug) {
  return path.join(DOCS_ROOT, `${slug}.md`);
}

export function resolveRepoConfig(repoKey, docMap) {
  const config = DEFAULT_REPO_CONFIG[repoKey];
  if (!config) {
    throw new Error(
      `Unsupported repo "${repoKey}". Use one of: ${Object.keys(DEFAULT_REPO_CONFIG).join(', ')}`
    );
  }

  const defaultRange = docMap?._meta?.default_release_ranges?.[repoKey] || null;
  const ignoredPatterns = [
    ...(docMap?._meta?.local_harness?.ignored_unmapped_patterns?.shared || []),
    ...(docMap?._meta?.local_harness?.ignored_unmapped_patterns?.[repoKey] || []),
  ];

  return {
    repoKey,
    ...config,
    defaultRange,
    ignoredPatterns,
  };
}

function runGit(repoPath, args) {
  return execFileSync('git', ['-C', repoPath, ...args], {
    encoding: 'utf8',
  }).trim();
}

export function resolveRefRange(repoConfig, explicitFromRef, explicitToRef) {
  if (explicitFromRef || explicitToRef) {
    if (!explicitFromRef || !explicitToRef) {
      throw new Error('When overriding refs, provide both --from-ref and --to-ref.');
    }
    return {
      fromRef: explicitFromRef,
      toRef: explicitToRef,
      source: 'cli',
    };
  }

  if (!repoConfig.defaultRange?.from_ref || !repoConfig.defaultRange?.to_ref) {
    throw new Error(`No default release range configured for ${repoConfig.repoKey}.`);
  }

  return {
    fromRef: repoConfig.defaultRange.from_ref,
    toRef: repoConfig.defaultRange.to_ref,
    source: 'default_release_range',
  };
}

export function getChangedFiles(repoPath, fromRef, toRef) {
  const output = runGit(repoPath, ['diff', '--name-only', `${fromRef}..${toRef}`]);
  return output ? output.split('\n').filter(Boolean) : [];
}

export function collectAffectedDocs(repoKey, docMap, changedFiles) {
  const repoMap = docMap[repoKey] || {};
  const affectedBySlug = new Map();
  const matchedPatternsByFile = new Map();

  for (const [pattern, slugs] of Object.entries(repoMap)) {
    for (const filePath of changedFiles) {
      if (!matchesPattern(filePath, pattern)) continue;

      const matchedPatterns = matchedPatternsByFile.get(filePath) || [];
      matchedPatterns.push(pattern);
      matchedPatternsByFile.set(filePath, matchedPatterns);

      for (const slug of slugs) {
        const existing = affectedBySlug.get(slug) || {
          slug,
          docPath: slugToDocPath(slug),
          matchedPatterns: [],
          changedFiles: [],
        };

        if (!existing.matchedPatterns.includes(pattern)) {
          existing.matchedPatterns.push(pattern);
        }
        if (!existing.changedFiles.includes(filePath)) {
          existing.changedFiles.push(filePath);
        }

        affectedBySlug.set(slug, existing);
      }
    }
  }

  return {
    affectedDocs: Array.from(affectedBySlug.values()).sort((a, b) =>
      a.slug.localeCompare(b.slug)
    ),
    matchedPatternsByFile,
  };
}

export function classifyUnmappedFiles(repoConfig, docMap, changedFiles) {
  const repoMap = docMap[repoConfig.repoKey] || {};
  const mappingPatterns = Object.keys(repoMap);
  const docRelevant = [];
  const ignored = [];

  for (const filePath of changedFiles) {
    const isMapped = mappingPatterns.some((pattern) => matchesPattern(filePath, pattern));
    if (isMapped) continue;

    const isIgnored = repoConfig.ignoredPatterns.some((pattern) =>
      matchesPattern(filePath, pattern)
    );

    if (isIgnored) {
      ignored.push(filePath);
    } else {
      docRelevant.push(filePath);
    }
  }

  return { docRelevant, ignored };
}

export function sanitizeForFilename(value) {
  return value.replace(/[^A-Za-z0-9._-]+/g, '_');
}

export function writeReport(report, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const filename = `${report.repoKey}-${sanitizeForFilename(report.fromRef)}-to-${sanitizeForFilename(report.toRef)}.json`;
  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return outputPath;
}

export function buildReport({ repoConfig, fromRef, toRef, changedFiles, affectedDocs, unmatched }) {
  return {
    generatedAt: new Date().toISOString(),
    repoKey: repoConfig.repoKey,
    sourceRoot: repoConfig.sourceRoot,
    fromRef,
    toRef,
    changedFiles,
    affectedDocs,
    unmatchedFiles: {
      docRelevant: unmatched.docRelevant,
      ignored: unmatched.ignored,
    },
    summary: {
      changedFileCount: changedFiles.length,
      affectedDocCount: affectedDocs.length,
      docRelevantUnmappedCount: unmatched.docRelevant.length,
      ignoredUnmappedCount: unmatched.ignored.length,
    },
  };
}
