import fs from 'node:fs';
import path from 'node:path';
import { ROOT, read, relative } from '../lib/core.js';
import { failList } from './shared.js';

const LEGACY_VERSION_PLACEHOLDER = /var version='unversioned';/g;
const BOOTSTRAP_REFERENCE = /_js_dev\/main\.js\?v=[^"']+/g;
const TEMPLATE_COMPILE_SLOT = /const\s+COMPILED_TEMPLATES\s*:\s*TemplateManifest\s*\|\s*null\s*=\s*null;\s*\/\*__SC_TEMPLATE_PAYLOAD__\*\//;

interface SnapshotInputs {
  readonly overrideDir: string;
  readonly bootstrap: string;
  readonly index: string;
  readonly registry: string;
}

function snapshotInputs(): SnapshotInputs {
  const overrideDir = path.join(ROOT, 'override');
  return {
    overrideDir,
    bootstrap: path.join(ROOT, '_js_dev', 'main.js'),
    index: path.join(ROOT, 'index.html'),
    registry: path.join(overrideDir, 'templates', 'registry.ts'),
  };
}

function validateRequiredInputs(inputs: SnapshotInputs, issues: string[]): boolean {
  for (const required of [inputs.overrideDir, inputs.bootstrap, inputs.index, inputs.registry]) {
    if (!fs.existsSync(required)) issues.push(`Missing lab integration input: ${relative(required)}`);
  }
  return issues.length === 0;
}

export function validateSnapshotIntegration(): void {
  const issues: string[] = [];
  const inputs = snapshotInputs();
  if (!validateRequiredInputs(inputs, issues)) {
    failList('Pages lab snapshot/override integration validation failed', issues);
  }

  const bootstrap = read(inputs.bootstrap);
  const index = read(inputs.index);
  const registry = read(inputs.registry);

  const versionPlaceholders = bootstrap.match(LEGACY_VERSION_PLACEHOLDER)?.length ?? 0;
  if (versionPlaceholders !== 1) {
    issues.push(`Snapshot legacy bootstrap must contain exactly one version placeholder; found ${versionPlaceholders}`);
  }

  const bootstrapReferences = index.match(BOOTSTRAP_REFERENCE)?.length ?? 0;
  if (bootstrapReferences !== 1) {
    issues.push(`Snapshot index.html must reference _js_dev/main.js exactly once; found ${bootstrapReferences}`);
  }
  if (/data-sc-template=/.test(index)) {
    issues.push('Snapshot index.html must not contain override component templates');
  }
  if (!TEMPLATE_COMPILE_SLOT.test(registry)) {
    issues.push('Pages lab requires the typed compiled-template injection slot in override/templates/registry.ts');
  }

  if (issues.length) failList('Pages lab snapshot/override integration validation failed', issues);
}
