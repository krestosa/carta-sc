import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { listRelativeFiles, normalizePath, walkFiles } from './lib/files.js';

interface ValidationInputs {
  readonly handoffRoot: string;
  readonly referenceRoot: string | null;
}

const REQUIRED_ROOT_ENTRIES = [
  'build.ps1',
  'build.sh',
  'compiled',
  'source',
] as const;

const REQUIRED_SOURCE_PATHS = [
  'index.html',
  'package.json',
  'package-lock.json',
  'tsconfig.base.json',
  'tsconfig.browser.json',
  'tsconfig.tooling.json',
  'override',
  'types',
  'lab/pages/build.ts',
  'scripts/sync-runtime.ts',
  'scripts/lib',
] as const;

class HandoffValidator {
  constructor(private readonly inputs: ValidationInputs) {}

  run(): void {
    this.#requireHandoffShape();
    this.#validateSourceBoundary(path.join(this.inputs.handoffRoot, 'source'));
    this.#validateCompiledBoundary(path.join(this.inputs.handoffRoot, 'compiled'));
    if (this.inputs.referenceRoot) {
      this.#validateCompiledReference(
        path.join(this.inputs.handoffRoot, 'compiled'),
        this.inputs.referenceRoot,
      );
    }
    console.log('Handoff validation passed.');
  }

  #requireHandoffShape(): void {
    const actual = fs.readdirSync(this.inputs.handoffRoot).sort();
    const expected = [...REQUIRED_ROOT_ENTRIES].sort();
    if (actual.length !== expected.length || actual.some((entry, index) => entry !== expected[index])) {
      throw new Error(`Unexpected handoff root contents: ${actual.join(', ')}`);
    }

    for (const relativePath of REQUIRED_SOURCE_PATHS) {
      if (!fs.existsSync(path.join(this.inputs.handoffRoot, 'source', relativePath))) {
        throw new Error(`Missing handoff source path: ${relativePath}`);
      }
    }
  }

  #validateSourceBoundary(sourceRoot: string): void {
    for (const file of walkFiles(sourceRoot)) {
      const relativePath = normalizePath(path.relative(sourceRoot, file));
      const segments = relativePath.split('/');
      const extension = path.extname(relativePath).toLowerCase();

      if (segments.some((segment) => segment === '.git' || segment === '.github' || segment === 'node_modules')) {
        throw new Error(`Repository metadata leaked into handoff source: ${relativePath}`);
      }
      if (['.md', '.map', '.mjs', '.py', '.ps1', '.sh'].includes(extension) || /requirements(?:\.txt)?$/i.test(relativePath)) {
        throw new Error(`Non-build source leaked into handoff source: ${relativePath}`);
      }
      if (relativePath.startsWith('lab/') && !relativePath.startsWith('lab/pages/')) {
        throw new Error(`Non-pages lab tooling leaked into handoff source: ${relativePath}`);
      }
      if (relativePath.startsWith('scripts/')
        && relativePath !== 'scripts/sync-runtime.ts'
        && !relativePath.startsWith('scripts/lib/')) {
        throw new Error(`Unrelated build script leaked into handoff source: ${relativePath}`);
      }
      if (file.endsWith('.js') && !relativePath.startsWith('js/') && !relativePath.startsWith('_js_dev/')) {
        throw new Error(`Owned JS source leaked into handoff source: ${relativePath}`);
      }
    }
  }

  #validateCompiledBoundary(compiledRoot: string): void {
    for (const file of walkFiles(compiledRoot)) {
      const relativePath = normalizePath(path.relative(compiledRoot, file));
      const extension = path.extname(relativePath).toLowerCase();
      if (extension === '.md' || extension === '.ts') {
        throw new Error(`Source-only file leaked into compiled handoff: ${relativePath}`);
      }
      if (relativePath.startsWith('lab/') || relativePath.startsWith('scripts/') || relativePath.startsWith('types/')) {
        throw new Error(`Build tooling leaked into compiled handoff: ${relativePath}`);
      }
    }
  }

  #sha256(file: string): string {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }

  #validateCompiledReference(compiledRoot: string, referenceRoot: string): void {
    const referenceFiles = listRelativeFiles(referenceRoot).filter((file) => path.extname(file).toLowerCase() !== '.md');
    const compiledFiles = listRelativeFiles(compiledRoot);
    if (
      referenceFiles.length !== compiledFiles.length
      || referenceFiles.some((file, index) => file !== compiledFiles[index])
    ) {
      throw new Error('Handoff compiled file set differs from the active web artifact');
    }

    for (const relativePath of referenceFiles) {
      if (
        this.#sha256(path.join(referenceRoot, relativePath))
        !== this.#sha256(path.join(compiledRoot, relativePath))
      ) {
        throw new Error(`Handoff compiled mismatch: ${relativePath}`);
      }
    }
  }
}

function validationInputs(argv: readonly string[] = process.argv): ValidationInputs {
  return {
    handoffRoot: path.resolve(argv[2] ?? 'handoff'),
    referenceRoot: argv[3] ? path.resolve(argv[3]) : null,
  };
}

export function validateHandoff(inputs: ValidationInputs = validationInputs()): void {
  new HandoffValidator(inputs).run();
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(path.resolve(entry)).href) {
  validateHandoff();
}
