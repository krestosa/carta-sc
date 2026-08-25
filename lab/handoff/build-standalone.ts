// Documenta la tarea build standalone utilizada para construir o revisar el paquete de entrega reproducible.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const STAGING = path.join(ROOT, '.generated', 'handoff-site');

function removeStaging(): void {
  fs.rmSync(STAGING, {
    recursive: true,
    force: true,
    maxRetries: process.platform === 'win32' ? 20 : 3,
    retryDelay: process.platform === 'win32' ? 150 : 100,
  });
}

function run(script: string, args: readonly string[] = []): void {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      SC_SITE_DIR: STAGING,
    },
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${path.relative(ROOT, script)} failed with exit code ${result.status ?? 1}`);
  }
}

export function buildStandaloneHandoff(): void {
  removeStaging();
  try {
    run(path.join(ROOT, '.build', 'tooling', 'lab', 'pages', 'build.js'));
    run(path.join(ROOT, '.build', 'tooling', 'lab', 'handoff', 'build-handoff.js'));
    run(path.join(ROOT, '.build', 'tooling', 'scripts', 'validate-handoff.js'), ['handoff']);
  } finally {
    removeStaging();
  }
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(path.resolve(entry)).href) {
  try {
    buildStandaloneHandoff();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  }
}
