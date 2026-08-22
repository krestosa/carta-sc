import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildPages } from '../pages/build.js';
import { ROOT, SITE, copyTree, remove, write } from '../pages/lib/core.js';
import { neutralizeCompiled } from './shared.js';

function packageRoot(): string {
  return path.resolve(ROOT, '..');
}

function restoreBuildSha(shaFile: string): void {
  if (process.env.GITHUB_SHA || !fs.existsSync(shaFile)) return;
  const sha = fs.readFileSync(shaFile, 'utf8').trim();
  if (sha) process.env.GITHUB_SHA = sha;
}

export async function rebuildHandoff(): Promise<void> {
  const root = packageRoot();
  const shaFile = path.join(root, 'BUILD_SHA');
  const compiled = path.join(root, 'compiled');

  restoreBuildSha(shaFile);
  await buildPages();

  remove(compiled);
  copyTree(SITE, compiled);
  neutralizeCompiled(compiled);
  write(shaFile, `${process.env.GITHUB_SHA ?? 'local'}\n`);
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && import.meta.url === pathToFileURL(path.resolve(entry)).href);
}

if (isDirectExecution()) {
  rebuildHandoff().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  });
}
