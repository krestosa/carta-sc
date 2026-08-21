import fs from 'node:fs';
import path from 'node:path';
import { ROOT, relativeTo, walkFiles } from './lib/files.js';

const SOURCE_DIR = path.join(ROOT, 'override');
const GENERATED_DIR = path.join(ROOT, '.generated', 'browser', 'override');

if (!fs.existsSync(GENERATED_DIR)) {
  throw new Error('Missing .generated/browser/override; compile browser TypeScript first');
}

const sourceFiles = walkFiles(SOURCE_DIR);
const sourceJavaScript = sourceFiles.filter((file) => file.endsWith('.js'));
if (sourceJavaScript.length > 0) {
  throw new Error(
    `Project-owned JavaScript must not be versioned in override/: ${sourceJavaScript
      .map((file) => relativeTo(ROOT, file))
      .join(', ')}`,
  );
}

const typeScriptFiles = sourceFiles.filter((file) => file.endsWith('.ts'));
const generatedJavaScript = walkFiles(GENERATED_DIR).filter((file) => file.endsWith('.js'));
if (typeScriptFiles.length !== generatedJavaScript.length) {
  throw new Error(
    `Generated browser JS count mismatch: ts=${typeScriptFiles.length}, js=${generatedJavaScript.length}`,
  );
}

console.log(
  `Runtime compile ready: ${typeScriptFiles.length} TypeScript sources -> ${generatedJavaScript.length} generated JavaScript files.`,
);
