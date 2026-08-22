import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, readText, relativeTo, walkFiles } from './lib/files.js';
import { createValidationReporter, type ValidationReporter } from './lib/validation.js';

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

class SourceBoundaryValidator {
  readonly #validation: ValidationReporter = createValidationReporter();

  run(): void {
    this.#validateOwnedSources();
    this.#validateMotionBoundary();
    this.#validation.finish(
      'Owned source boundary failed',
      'Owned source boundary passed: JS remains only in legacy directories; no owned MJS/Python/shell build sources remain and the motion runtime is self-contained.',
    );
  }

  #validateOwnedSources(): void {
    for (const file of walkFiles(ROOT, { ignoredDirectories: IGNORED_DIRECTORIES })) {
      const relativePath = relativeTo(ROOT, file);
      if (/requirements\.txt$/i.test(relativePath)) {
        this.#validation.fail(`forbidden owned requirements file: ${relativePath}`);
        continue;
      }
      if (this.#isLegacySource(relativePath)) continue;

      if (FORBIDDEN_OWNED_EXTENSIONS.has(path.extname(file))) {
        this.#validation.fail(`forbidden owned source file: ${relativePath}`);
      }
    }
  }

  #isLegacySource(relativePath: string): boolean {
    return LEGACY_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
  }

  #validateMotionBoundary(): void {
    if (!fs.existsSync(MOTION_ENTRY)) return;
    const motion = readText(MOTION_ENTRY);
    const createsScript = /createElement\s*\(\s*['"]script['"]\s*\)/.test(motion);
    const assignsScriptSource = /\bscript\s*\.\s*src\s*=/.test(motion);
    if (createsScript || assignsScriptSource) {
      this.#validation.fail('override/motion/main.ts: motion runtime must remain self-contained');
    }
  }
}

export function validateSourceBoundary(): void {
  new SourceBoundaryValidator().run();
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(path.resolve(entry)).href) {
  validateSourceBoundary();
}
