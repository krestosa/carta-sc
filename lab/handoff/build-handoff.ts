import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, SITE, assert, copyFile, copyTree, ensureDir, readJson, remove, write, writeJson } from '../pages/lib/core.js';
import { staticizeCompiled } from './staticize.js';

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

const PATHS: HandoffPaths = {
  root: path.join(ROOT, 'handoff'),
  source: path.join(ROOT, 'handoff', 'source'),
  compiled: path.join(ROOT, 'handoff', 'compiled'),
};

const SOURCE_TOP_LEVEL = new Set([
  '_css_dev',
  '_js_dev',
  'css',
  'index.html',
  'js',
  'lab',
  'override',
  'package-lock.json',
  'package.json',
  'scripts',
  'tsconfig.base.json',
  'tsconfig.browser.json',
  'tsconfig.tooling.json',
  'types',
]);

const EXCLUDED_SOURCE_EXTENSIONS = new Set([
  '.md',
  '.map',
  '.mjs',
  '.py',
  '.ps1',
  '.sh',
]);

function currentCommitSha(): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim().toLowerCase();
  } catch {
    return '';
  }
}

function isCommitSha(value: string): boolean {
  return /^[0-9a-f]{40}$/i.test(value);
}

function nodeBuildRunner(sha: string): string {
  return `import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, 'source');
const staging = path.join(source, '.generated', 'handoff-site');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;
const env = { ...process.env, GITHUB_SHA: '${sha}', SC_SITE_DIR: staging };

function run(command, args) {
  const result = spawnSync(command, args, { cwd: source, stdio: 'inherit', env, shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function cleanStaging() {
  fs.rmSync(staging, {
    recursive: true,
    force: true,
    maxRetries: process.platform === 'win32' ? 20 : 3,
    retryDelay: process.platform === 'win32' ? 150 : 100,
  });
}

cleanStaging();
try {
  run(npm, ['ci']);
  run(npm, ['exec', '--', 'tsc', '-p', 'tsconfig.tooling.json']);
  run(npm, ['exec', '--', 'tsc', '-p', 'tsconfig.browser.json']);
  run(node, ['.build/tooling/scripts/sync-runtime.js']);
  run(node, ['.build/tooling/scripts/optimize-runtime.js']);
  run(node, ['.build/tooling/lab/pages/build.js']);
  run(node, ['.build/tooling/lab/handoff/staticize.js', staging, '../compiled']);
} finally {
  cleanStaging();
}
`;
}

class HandoffBuildPipeline {
  readonly #sha = currentCommitSha();

  run(): void {
    this.#validateInputs();
    process.env.GITHUB_SHA = this.#sha;
    this.#prepareOutput();
    this.#copySource();
    this.#writeSourcePackage();
    staticizeCompiled(SITE, PATHS.compiled);
    this.#writeRootPackage();
    this.#writeNodeEntrypoints();
    process.stdout.write(`Handoff built from ${this.#sha}\n`);
  }

  #validateInputs(): void {
    assert(isCommitSha(this.#sha), 'Could not resolve the current Git commit for the handoff');
    assert(fs.existsSync(path.join(ROOT, 'package-lock.json')), 'package-lock.json is required for reproducible handoff builds');

    const stagedIndex = path.join(SITE, 'index.html');
    assert(fs.existsSync(stagedIndex), 'Handoff staging artifact is missing');
    const html = fs.readFileSync(stagedIndex, 'utf8');
    assert(
      html.includes(`const VERSION = '${this.#sha}';`),
      `Handoff staging artifact does not belong to current commit ${this.#sha}`,
    );
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
    if (!SOURCE_TOP_LEVEL.has(topLevel)) return false;
    if (segments.some((segment) => segment.startsWith('.'))) return false;

    const isDirectory = fs.statSync(absolute).isDirectory();
    if (!isDirectory && EXCLUDED_SOURCE_EXTENSIONS.has(path.extname(normalized).toLowerCase())) return false;
    if (!isDirectory && /requirements(?:\.txt)?$/i.test(normalized)) return false;
    if (normalized === 'package.json') return false;

    if (topLevel === 'lab') {
      return normalized === 'lab'
        || normalized === 'lab/pages'
        || normalized.startsWith('lab/pages/')
        || normalized === 'lab/handoff'
        || normalized === 'lab/handoff/staticize.ts'
        || normalized === 'lab/handoff/static-server.ts';
    }

    if (topLevel === 'scripts') {
      return normalized === 'scripts'
        || normalized === 'scripts/lib'
        || normalized.startsWith('scripts/lib/')
        || normalized === 'scripts/sync-runtime.ts'
        || normalized === 'scripts/optimize-runtime.ts';
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
      devDependencies: rootPackage.devDependencies,
    });
  }

  #writeRootPackage(): void {
    const rootPackage = readJson<RootPackage>(path.join(ROOT, 'package.json'));
    writeJson(path.join(PATHS.root, 'package.json'), {
      name: `${rootPackage.name}-handoff`,
      private: true,
      version: rootPackage.version,
      type: 'module',
      engines: rootPackage.engines,
      scripts: {
        build: 'node build.mjs',
        serve: 'node server.mjs compiled 4173',
      },
    });
  }

  #writeNodeEntrypoints(): void {
    const compiledServer = path.join(ROOT, '.build', 'tooling', 'lab', 'handoff', 'static-server.js');
    assert(fs.existsSync(compiledServer), 'compiled handoff server is missing');
    copyFile(compiledServer, path.join(PATHS.root, 'server.mjs'));
    write(path.join(PATHS.root, 'build.mjs'), nodeBuildRunner(this.#sha));
  }
}

export function buildHandoff(): void {
  new HandoffBuildPipeline().run();
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && import.meta.url === pathToFileURL(path.resolve(entry)).href);
}

if (isDirectExecution()) {
  try {
    buildHandoff();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  }
}
