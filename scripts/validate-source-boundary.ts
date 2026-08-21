import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readText, relativeTo, walkFiles } from './lib/files.js';
import { createValidationReporter } from './lib/validation.js';

const IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  '.build',
  '.generated',
  '.pages-site',
  'handoff',
]);
const LEGACY_PREFIXES = ['js/', '_js_dev/'] as const;
const FORBIDDEN_OWNED_EXTENSIONS = new Set(['.js', '.mjs', '.py', '.sh']);
const MOTION_ENTRY = path.join(ROOT, 'override', 'motion', 'main.ts');

function isLegacySource(relativePath: string): boolean {
  return LEGACY_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

const validation = createValidationReporter();
for (const file of walkFiles(ROOT, { ignoredDirectories: IGNORED_DIRECTORIES })) {
  const relativePath = relativeTo(ROOT, file);
  if (/requirements\.txt$/i.test(relativePath)) {
    validation.fail(`forbidden owned requirements file: ${relativePath}`);
    continue;
  }
  if (isLegacySource(relativePath)) continue;

  if (FORBIDDEN_OWNED_EXTENSIONS.has(path.extname(file))) {
    validation.fail(`forbidden owned source file: ${relativePath}`);
  }
}

if (fs.existsSync(MOTION_ENTRY)) {
  const motion = readText(MOTION_ENTRY);
  const createsScript = /createElement\s*\(\s*['"]script['"]\s*\)/.test(motion);
  const assignsScriptSource = /\bscript\s*\.\s*src\s*=/.test(motion);
  if (createsScript || assignsScriptSource) {
    validation.fail('override/motion/main.ts: motion runtime must remain self-contained');
  }
}

validation.finish(
  'Owned source boundary failed',
  'Owned source boundary passed: JS remains only in legacy directories; no owned MJS/Python/shell build sources remain and the motion runtime is self-contained.',
);
