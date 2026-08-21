import fs from 'node:fs';
import path from 'node:path';
import { ROOT, read, relative } from '../lib/core.js';
import { failList } from './shared.js';

const LEGACY_VERSION_PLACEHOLDER = /var version='unversioned';/g;
const BOOTSTRAP_REFERENCE = /_js_dev\/main\.js\?v=[^"']+/g;
const TEMPLATE_COMPILE_SLOT = /const\s+COMPILED_TEMPLATES\s*:\s*TemplateManifest\s*\|\s*null\s*=\s*null;\s*\/\*__SC_TEMPLATE_PAYLOAD__\*\//;

export function validateSnapshotIntegration(): void {
  const issues: string[] = [];
  const overrideDir = path.join(ROOT, 'override');
  const bootstrapPath = path.join(ROOT, '_js_dev', 'main.js');
  const indexPath = path.join(ROOT, 'index.html');
  const registryPath = path.join(overrideDir, 'templates', 'registry.ts');

  for (const required of [overrideDir, bootstrapPath, indexPath, registryPath]) {
    if (!fs.existsSync(required)) issues.push(`Missing lab integration input: ${relative(required)}`);
  }

  if (!issues.length) {
    const bootstrap = read(bootstrapPath);
    const index = read(indexPath);
    const registry = read(registryPath);

    const versionPlaceholders = bootstrap.match(LEGACY_VERSION_PLACEHOLDER)?.length ?? 0;
    if (versionPlaceholders !== 1) {
      issues.push(`Snapshot legacy bootstrap must contain exactly one version placeholder; found ${versionPlaceholders}`);
    }

    const bootstrapReferences = index.match(BOOTSTRAP_REFERENCE)?.length ?? 0;
    if (bootstrapReferences !== 1) {
      issues.push(`Snapshot index.html must reference _js_dev/main.js exactly once; found ${bootstrapReferences}`);
    }
    if (/data-sc-template=/.test(index)) issues.push('Snapshot index.html must not contain override component templates');
    if (!TEMPLATE_COMPILE_SLOT.test(registry)) {
      issues.push('Pages lab requires the typed compiled-template injection slot in override/templates/registry.ts');
    }
  }

  if (issues.length) failList('Pages lab snapshot/override integration validation failed', issues);
}
