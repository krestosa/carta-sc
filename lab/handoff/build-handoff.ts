import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildPages } from '../pages/build.js';
import { ROOT, SITE, assert, copyTree, ensureDir, remove, write } from '../pages/lib/core.js';
import { neutralizeCompiled } from './shared.js';

const OUT = path.join(ROOT, 'handoff');
const SOURCE = path.join(OUT, 'source');
const COMPILED = path.join(OUT, 'compiled');
const SOURCE_EXCLUDES = new Set(['.git','.github','.build','.generated','.pages-site','.migration','node_modules','handoff']);

function copySource(): void {
  copyTree(ROOT, SOURCE, (relative) => {
    const normalized = relative.replaceAll(path.sep, '/');
    const top = normalized.split('/', 1)[0] ?? normalized;
    if (SOURCE_EXCLUDES.has(top)) return false;
    if (/\.(?:py|mjs)$/i.test(normalized)) return false;
    if (/requirements(?:\.txt)?$/i.test(normalized)) return false;
    return true;
  });
}

function writeLaunchers(sha: string): void {
  write(path.join(OUT,'build-local.sh'), `#!/usr/bin/env bash\nset -euo pipefail\nROOT="$(cd "$(dirname "${'${BASH_SOURCE[0]}'}")" && pwd)"\ncd "$ROOT/source"\nexport GITHUB_SHA="${'${GITHUB_SHA:-'}${sha}}"\nnpm ci\nnpm run handoff:rebuild\n`);
  write(path.join(OUT,'serve-local.sh'), `#!/usr/bin/env bash\nset -euo pipefail\nROOT="$(cd "$(dirname "${'${BASH_SOURCE[0]}'}")" && pwd)"\ncd "$ROOT/source"\nnpm ci\nnpm run serve:handoff -- --root "$ROOT/compiled"\n`);
  write(path.join(OUT,'build-local.ps1'), `$ErrorActionPreference = 'Stop'\n$Root = Split-Path -Parent $MyInvocation.MyCommand.Path\nSet-Location (Join-Path $Root 'source')\nif (-not $env:GITHUB_SHA) { $env:GITHUB_SHA = '${sha}' }\nnpm ci\nnpm run handoff:rebuild\n`);
  write(path.join(OUT,'serve-local.ps1'), `$ErrorActionPreference = 'Stop'\n$Root = Split-Path -Parent $MyInvocation.MyCommand.Path\nSet-Location (Join-Path $Root 'source')\nnpm ci\nnpm run serve:handoff -- --root (Join-Path $Root 'compiled')\n`);
  for (const file of ['build-local.sh','serve-local.sh']) fs.chmodSync(path.join(OUT,file),0o755);
}

export async function buildHandoff(): Promise<void> {
  assert(fs.existsSync(path.join(ROOT,'package-lock.json')), 'package-lock.json is required for reproducible handoff builds');
  await buildPages();
  const sha = process.env.GITHUB_SHA ?? 'local';
  remove(OUT); ensureDir(SOURCE); ensureDir(COMPILED);
  copySource();
  copyTree(SITE, COMPILED);
  neutralizeCompiled(COMPILED);
  write(path.join(OUT,'BUILD_SHA'), `${sha}\n`);
  writeLaunchers(sha);
  write(path.join(OUT,'README.md'), '# SushiClub build handoff\n\n`source/` contiene la fuente TypeScript/Node reproducible. `compiled/` contiene el artefacto neutralizado.\n\nRequiere Node.js 22+. Ejecute `build-local.sh`/`build-local.ps1` para reconstruir y `serve-local.sh`/`serve-local.ps1` para servirlo.\n');
}

const entry=process.argv[1];
if(entry&&import.meta.url===pathToFileURL(path.resolve(entry)).href){buildHandoff().catch((error:unknown)=>{console.error(error instanceof Error?error.stack??error.message:error);process.exitCode=1;});}
