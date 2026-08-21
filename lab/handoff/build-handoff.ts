import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildPages } from '../pages/build.js';
import { ROOT, SITE, assert, copyTree, ensureDir, readJson, remove, write, writeJson } from '../pages/lib/core.js';

interface HandoffPaths {
  readonly root: string;
  readonly source: string;
  readonly compiled: string;
}

interface RootPackage {
  readonly name: string;
  readonly version: string;
  readonly type: string;
  readonly engines?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
}

interface LauncherDefinition {
  readonly name: 'build.sh' | 'build.ps1';
  readonly content: (sha: string) => string;
  readonly executable?: boolean;
}

const PATHS: HandoffPaths = {
  root: path.join(ROOT, 'handoff'),
  source: path.join(ROOT, 'handoff', 'source'),
  compiled: path.join(ROOT, 'handoff', 'compiled'),
};

const EXCLUDED_TOP_LEVEL = new Set([
  '.git',
  '.github',
  '.build',
  '.generated',
  '.pages-site',
  '.migration',
  'node_modules',
  'handoff',
]);

const EXCLUDED_SOURCE_EXTENSIONS = new Set([
  '.md',
  '.map',
  '.mjs',
  '.py',
  '.ps1',
  '.sh',
]);

const SOURCE_PACKAGE_SCRIPTS = {
  'compile:tooling': 'tsc -p tsconfig.tooling.json',
  'compile:browser': 'tsc -p tsconfig.browser.json',
  'build:runtime': 'npm run compile:tooling && npm run compile:browser && node .build/tooling/scripts/sync-runtime.js',
  build: 'npm run build:runtime && node .build/tooling/lab/pages/build.js',
} as const;

const LAUNCHERS: readonly LauncherDefinition[] = [
  {
    name: 'build.sh',
    executable: true,
    content: (sha) => `#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${'${BASH_SOURCE[0]}'}")" && pwd)"
SOURCE="$ROOT/source"
COMPILED="$ROOT/compiled"
cd "$SOURCE"
export GITHUB_SHA="${'${GITHUB_SHA:-'}${sha}}"
npm ci
npm run build
rm -rf "$COMPILED"
mkdir -p "$COMPILED"
cp -a "$SOURCE/.pages-site/." "$COMPILED/"
`,
  },
  {
    name: 'build.ps1',
    content: (sha) => `$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Source = Join-Path $Root 'source'
$Compiled = Join-Path $Root 'compiled'
Set-Location $Source
if (-not $env:GITHUB_SHA) { $env:GITHUB_SHA = '${sha}' }
npm ci
npm run build
if (Test-Path $Compiled) { Remove-Item -Recurse -Force $Compiled }
New-Item -ItemType Directory -Force $Compiled | Out-Null
Get-ChildItem -LiteralPath (Join-Path $Source '.pages-site') -Force | Copy-Item -Destination $Compiled -Recurse -Force
`,
  },
];

class HandoffBuildPipeline {
  readonly #sha = process.env.GITHUB_SHA ?? '';

  async run(): Promise<void> {
    this.#validateInputs();
    await buildPages();
    this.#prepareOutput();
    this.#copySource();
    this.#writeSourcePackage();
    this.#copyCompiledArtifact();
    this.#writeLaunchers();
  }

  #validateInputs(): void {
    assert(/^[0-9a-f]{40}$/.test(this.#sha), 'GITHUB_SHA is required for a deterministic handoff');
    assert(fs.existsSync(path.join(ROOT, 'package-lock.json')), 'package-lock.json is required for reproducible handoff builds');
  }

  #prepareOutput(): void {
    remove(PATHS.root);
    ensureDir(PATHS.source);
    ensureDir(PATHS.compiled);
  }

  #copySource(): void {
    copyTree(ROOT, PATHS.source, (relative, absolute) => this.#shouldCopySource(relative, absolute));
  }

  #shouldCopySource(relative: string, absolute: string): boolean {
    const normalized = relative.replaceAll(path.sep, '/');
    const segments = normalized.split('/');
    const topLevel = segments[0] ?? normalized;
    if (EXCLUDED_TOP_LEVEL.has(topLevel)) return false;
    if (segments.some((segment) => segment === '.git' || segment === '.github' || segment === 'node_modules')) return false;

    const isDirectory = fs.statSync(absolute).isDirectory();
    if (!isDirectory && EXCLUDED_SOURCE_EXTENSIONS.has(path.extname(normalized).toLowerCase())) return false;
    if (!isDirectory && /requirements(?:\.txt)?$/i.test(normalized)) return false;
    if (normalized === '.gitignore' || normalized === 'package.json') return false;

    if (topLevel === 'lab') {
      return normalized === 'lab' || normalized === 'lab/pages' || normalized.startsWith('lab/pages/');
    }

    if (topLevel === 'scripts') {
      return normalized === 'scripts'
        || normalized === 'scripts/lib'
        || normalized.startsWith('scripts/lib/')
        || normalized === 'scripts/sync-runtime.ts';
    }

    return true;
  }

  #writeSourcePackage(): void {
    const rootPackage = readJson<RootPackage>(path.join(ROOT, 'package.json'));
    writeJson(path.join(PATHS.source, 'package.json'), {
      name: rootPackage.name,
      private: true,
      version: rootPackage.version,
      type: rootPackage.type,
      engines: rootPackage.engines,
      scripts: SOURCE_PACKAGE_SCRIPTS,
      devDependencies: rootPackage.devDependencies,
    });
  }

  #copyCompiledArtifact(): void {
    copyTree(SITE, PATHS.compiled, (relative, absolute) => {
      if (fs.statSync(absolute).isDirectory()) return true;
      return path.extname(relative).toLowerCase() !== '.md';
    });
  }

  #writeLaunchers(): void {
    for (const launcher of LAUNCHERS) {
      const file = path.join(PATHS.root, launcher.name);
      write(file, launcher.content(this.#sha));
      if (launcher.executable) fs.chmodSync(file, 0o755);
    }
  }
}

export function buildHandoff(): Promise<void> {
  return new HandoffBuildPipeline().run();
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && import.meta.url === pathToFileURL(path.resolve(entry)).href);
}

if (isDirectExecution()) {
  buildHandoff().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  });
}
