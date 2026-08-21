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

  if (inventory.typeScriptFiles.length !== inventory.generatedJavaScript.length) {
    throw new Error(
      `Generated browser JS count mismatch: ts=${inventory.typeScriptFiles.length}, js=${inventory.generatedJavaScript.length}`,
    );
  }

  console.log(
    `Runtime compile ready: ${inventory.typeScriptFiles.length} TypeScript sources -> ${inventory.generatedJavaScript.length} generated JavaScript files.`,
  );
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(path.resolve(entry)).href) {
  syncRuntime();
}
