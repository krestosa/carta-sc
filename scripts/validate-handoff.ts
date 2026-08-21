import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { listRelativeFiles, normalizePath, walkFiles } from './lib/files.js';

interface ValidationInputs {
  readonly handoffRoot: string;
  readonly referenceRoot: string | null;
}

const REQUIRED_PATHS = [
  'source',
  'compiled',
  'BUILD_SHA',
  'README.md',
  'build-local.sh',
  'serve-local.sh',
  'build-local.ps1',
  'serve-local.ps1',
] as const;

class HandoffValidator {
  constructor(private readonly inputs: ValidationInputs) {}

  run(): void {
    this.#requireHandoffPaths();
    this.#validateSourceBoundary(path.join(this.inputs.handoffRoot, 'source'));
    if (this.inputs.referenceRoot) {
      this.#validateCompiledReference(
        path.join(this.inputs.handoffRoot, 'compiled'),
        this.inputs.referenceRoot,
      );
    }
    console.log('Handoff validation passed.');
  }

  #requireHandoffPaths(): void {
    for (const relativePath of REQUIRED_PATHS) {
      if (!fs.existsSync(path.join(this.inputs.handoffRoot, relativePath))) {
        throw new Error(`Missing handoff contract path: ${relativePath}`);
      }
    }
  }

  #validateSourceBoundary(sourceRoot: string): void {
    for (const file of walkFiles(sourceRoot)) {
      const relativePath = normalizePath(path.relative(sourceRoot, file));
      if (/\.(?:py|mjs)$/i.test(relativePath) || /requirements\.txt$/i.test(relativePath)) {
        throw new Error(`Forbidden legacy tooling leaked into handoff source: ${relativePath}`);
      }
      if (file.endsWith('.js') && !relativePath.startsWith('js/') && !relativePath.startsWith('_js_dev/')) {
        throw new Error(`Owned JS source leaked into handoff source: ${relativePath}`);
      }
    }
  }

  #sha256(file: string): string {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }

  #validateCompiledReference(compiledRoot: string, referenceRoot: string): void {
    const referenceFiles = listRelativeFiles(referenceRoot);
    const compiledFiles = listRelativeFiles(compiledRoot);
    if (
      referenceFiles.length !== compiledFiles.length
      || referenceFiles.some((file, index) => file !== compiledFiles[index])
    ) {
      throw new Error('Clean-room handoff file set differs from reference');
    }

    for (const relativePath of referenceFiles) {
      if (
        this.#sha256(path.join(referenceRoot, relativePath))
        !== this.#sha256(path.join(compiledRoot, relativePath))
      ) {
        throw new Error(`Clean-room handoff mismatch: ${relativePath}`);
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
