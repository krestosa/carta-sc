import path from 'node:path';
import { SITE, assert, read, walk, write } from '../../lib/core.js';
import {
  FORBIDDEN_SUFFIXES,
  ORIGIN,
  TEXT_SUFFIXES,
  assetDirectoryPattern,
  faviconPattern,
  snapshotSuffixPattern,
  type RewriteStats,
} from './config.js';

export function repositoryStaticAssets(): string[] {
  return walk(process.cwd()).filter((file) => {
    if (file.includes(`${path.sep}.git${path.sep}`)) return false;
    if (file.includes(`${path.sep}.pages-site${path.sep}`)) return false;
    if (file.includes(`${path.sep}node_modules${path.sep}`)) return false;
    return FORBIDDEN_SUFFIXES.has(path.extname(file).toLowerCase());
  });
}

export function pagesTextFiles(): string[] {
  return walk(SITE).filter((file) => TEXT_SUFFIXES.has(path.extname(file).toLowerCase()));
}

export function rewriteStaticReferences(files: readonly string[]): RewriteStats {
  const stats: RewriteStats = { filesChanged: 0, replacements: 0, canonicalized: 0 };

  for (const file of files) {
    const source = read(file);
    let rewritten = source.replace(assetDirectoryPattern, (full, ...args: unknown[]) => {
      const groups = args.at(-1) as { root?: string } | undefined;
      stats.replacements += 1;
      return `${ORIGIN}${groups?.root ?? full}/`;
    });
    rewritten = rewritten.replace(faviconPattern, () => {
      stats.replacements += 1;
      return `${ORIGIN}favicon.ico`;
    });
    rewritten = rewritten.replace(snapshotSuffixPattern, () => {
      stats.canonicalized += 1;
      return '';
    });

    if (rewritten === source) continue;
    write(file, rewritten);
    stats.filesChanged += 1;
  }
  return stats;
}

export function verifyNoSnapshotReferences(files: readonly string[]): void {
  const localReferences: string[] = [];
  const snapshotReferences: string[] = [];

  for (const file of files) {
    const content = read(file);
    const relative = path.relative(SITE, file);
    assetDirectoryPattern.lastIndex = 0;
    faviconPattern.lastIndex = 0;
    snapshotSuffixPattern.lastIndex = 0;
    if (assetDirectoryPattern.test(content) || faviconPattern.test(content)) localReferences.push(relative);
    if (snapshotSuffixPattern.test(content)) snapshotReferences.push(relative);
  }

  assert(localReferences.length === 0, `Local static asset reference(s) remain: ${localReferences.join(', ')}`);
  assert(snapshotReferences.length === 0, `Snapshot-only static asset filename(s) remain: ${snapshotReferences.join(', ')}`);
}
