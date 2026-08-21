import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildPages } from '../pages/build.js';
import { ROOT, SITE, assert, copyTree, ensureDir, remove, write } from '../pages/lib/core.js';
import { neutralizeCompiled } from './shared.js';

interface HandoffPaths {
  readonly root: string;
  readonly source: string;
  readonly compiled: string;
}

interface LauncherDefinition {
  readonly name: string;
  readonly content: (sha: string) => string;
  readonly executable?: boolean;
}

const PATHS: HandoffPaths = {
  root: path.join(ROOT, 'handoff'),
  source: path.join(ROOT, 'handoff', 'source'),
  compiled: path.join(ROOT, 'handoff', 'compiled'),
};

const SOURCE_EXCLUDES = new Set([
  '.git',
  '.github',
  '.build',
  '.generated',
  '.pages-site',
  '.migration',
  'node_modules',
  'handoff',
]);

const LAUNCHERS: readonly LauncherDefinition[] = [
  {
    name: 'build-local.sh',
    executable: true,
    content: (sha) => `#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${'${BASH_SOURCE[0]}'}")" && pwd)"
cd "$ROOT/source"
export GITHUB_SHA="${'${GITHUB_SHA:-'}${sha}}"
npm ci
npm run handoff:rebuild
`,
  },
  {
    name: 'serve-local.sh',
    executable: true,
    content: () => `#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${'${BASH_SOURCE[0]}'}")" && pwd)"
cd "$ROOT/source"
npm ci
npm run serve:handoff -- --root "$ROOT/compiled"
`,
  },
  {
    name: 'build-local.ps1',
    content: (sha) => `$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $Root 'source')
if (-not $env:GITHUB_SHA) { $env:GITHUB_SHA = '${sha}' }
npm ci
npm run handoff:rebuild
`,
  },
  {
    name: 'serve-local.ps1',
    content: () => `$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $Root 'source')
npm ci
npm run serve:handoff -- --root (Join-Path $Root 'compiled')
`,
  },
];

const README = `# SushiClub build handoff

\`source/\` contiene la fuente TypeScript/Node reproducible. \`compiled/\` contiene el artefacto neutralizado.

Requiere Node.js 22+. Ejecute \`build-local.sh\`/\`build-local.ps1\` para reconstruir y \`serve-local.sh\`/\`serve-local.ps1\` para servirlo.
`;

class HandoffBuildPipeline {
  readonly #sha = process.env.GITHUB_SHA ?? 'local';

  async run(): Promise<void> {
    this.validateInputs();
    await buildPages();
    this.prepareOutput();
    this.copySource();
    this.copyCompiledArtifact();
    this.writeMetadata();
  }

  private validateInputs(): void {
    assert(
      fs.existsSync(path.join(ROOT, 'package-lock.json')),
      'package-lock.json is required for reproducible handoff builds',
    );
  }

  private prepareOutput(): void {
    remove(PATHS.root);
    ensureDir(PATHS.source);
    ensureDir(PATHS.compiled);
  }

  private copySource(): void {
    copyTree(ROOT, PATHS.source, (relative) => this.shouldCopySource(relative));
  }

  private shouldCopySource(relative: string): boolean {
    const normalized = relative.replaceAll(path.sep, '/');
    const topLevel = normalized.split('/', 1)[0] ?? normalized;
    if (SOURCE_EXCLUDES.has(topLevel)) return false;
    if (/\.(?:py|mjs)$/i.test(normalized)) return false;
    return !/requirements(?:\.txt)?$/i.test(normalized);
  }

  private copyCompiledArtifact(): void {
    copyTree(SITE, PATHS.compiled);
    neutralizeCompiled(PATHS.compiled);
  }

  private writeMetadata(): void {
    write(path.join(PATHS.root, 'BUILD_SHA'), `${this.#sha}\n`);
    this.writeLaunchers();
    write(path.join(PATHS.root, 'README.md'), README);
  }

  private writeLaunchers(): void {
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
