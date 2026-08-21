import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
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

function inputs(): ValidationInputs {
  return {
    handoffRoot: path.resolve(process.argv[2] ?? 'handoff'),
    referenceRoot: process.argv[3] ? path.resolve(process.argv[3]) : null,
  };
}

function requireHandoffPaths(handoffRoot: string): void {
  for (const relativePath of REQUIRED_PATHS) {
    if (!fs.existsSync(path.join(handoffRoot, relativePath))) {
      throw new Error(`Missing handoff contract path: ${relativePath}`);
    }
  }
}

function validateSourceBoundary(sourceRoot: string): void {
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

function sha256(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function validateCompiledReference(compiledRoot: string, referenceRoot: string): void {
  const referenceFiles = listRelativeFiles(referenceRoot);
  const compiledFiles = listRelativeFiles(compiledRoot);
  if (
    referenceFiles.length !== compiledFiles.length
    || referenceFiles.some((file, index) => file !== compiledFiles[index])
  ) {
    throw new Error('Clean-room handoff file set differs from reference');
  }

  for (const relativePath of referenceFiles) {
    if (sha256(path.join(referenceRoot, relativePath)) !== sha256(path.join(compiledRoot, relativePath))) {
      throw new Error(`Clean-room handoff mismatch: ${relativePath}`);
    }
  }
}

const { handoffRoot, referenceRoot } = inputs();
requireHandoffPaths(handoffRoot);
validateSourceBoundary(path.join(handoffRoot, 'source'));
if (referenceRoot) validateCompiledReference(path.join(handoffRoot, 'compiled'), referenceRoot);
console.log('Handoff validation passed.');
