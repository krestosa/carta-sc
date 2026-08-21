import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, relativeTo, walkFiles } from './lib/files.js';

const SOURCE_DIR = path.join(ROOT, 'override');
const GENERATED_DIR = path.join(ROOT, '.generated', 'browser', 'override');

interface RuntimeInventory {
  readonly typeScriptFiles: readonly string[];
  readonly sourceJavaScript: readonly string[];
  readonly generatedJavaScript: readonly string[];
}

function runtimeInventory(): RuntimeInventory {
  const sourceFiles = walkFiles(SOURCE_DIR);
  return {
    typeScriptFiles: sourceFiles.filter((file) => file.endsWith('.ts')),
    sourceJavaScript: sourceFiles.filter((file) => file.endsWith('.js')),
    generatedJavaScript: walkFiles(GENERATED_DIR).filter((file) => file.endsWith('.js')),
  };
}

function runtimeRelative(file: string, root: string): string {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function expectedGeneratedRuntime(file: string): string {
  return runtimeRelative(file, SOURCE_DIR).replace(/\.ts$/, '.js');
}

function validateGeneratedParity(inventory: RuntimeInventory): void {
  const expected = new Set(inventory.typeScriptFiles.map(expectedGeneratedRuntime));
  const actual = new Set(inventory.generatedJavaScript.map((file) => runtimeRelative(file, GENERATED_DIR)));
  const missing = [...expected].filter((file) => !actual.has(file)).sort();
  const extra = [...actual].filter((file) => !expected.has(file)).sort();

  if (missing.length === 0 && extra.length === 0) return;
  throw new Error(
    `Generated browser JS path mismatch; missing=${missing.join(',') || 'none'}; extra=${extra.join(',') || 'none'}`,
  );
}

export function syncRuntime(): void {
  if (!fs.existsSync(GENERATED_DIR)) {
    throw new Error('Missing .generated/browser/override; compile browser TypeScript first');
  }

  const inventory = runtimeInventory();
  if (inventory.sourceJavaScript.length > 0) {
    throw new Error(
      `Project-owned JavaScript must not be versioned in override/: ${inventory.sourceJavaScript
        .map((file) => relativeTo(ROOT, file))
        .join(', ')}`,
    );
  }

  validateGeneratedParity(inventory);

  console.log(
    `Runtime compile ready: ${inventory.typeScriptFiles.length} TypeScript sources -> ${inventory.generatedJavaScript.length} generated JavaScript files with exact path parity.`,
  );
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(path.resolve(entry)).href) {
  syncRuntime();
}
