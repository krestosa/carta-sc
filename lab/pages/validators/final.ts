import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, githubSha, read, walk } from '../lib/core.js';
import { failList } from './shared.js';

const REQUIRED_ARTIFACTS = [
  'override/main.js',
  'override/main.css',
  '_pages/legacy.js',
  '_pages/shop.js',
  '_pages/deferred.css',
  '_pages/php-guard.js',
  '_critical-media/sushiclub-logo.svg',
] as const;

function displayPath(file: string): string {
  return path.relative(SITE, file).replaceAll(path.sep, '/');
}

function validateRequiredFiles(issues: string[]): void {
  for (const relativePath of REQUIRED_ARTIFACTS) {
    const file = path.join(SITE, relativePath);
    if (!fs.existsSync(file) || fs.statSync(file).size === 0) {
      issues.push(`missing final artifact file: ${displayPath(file)}`);
    }
  }
}

export function validateFinalInvariants(): void {
  const sha = githubSha();
  const index = path.join(SITE, 'index.html');
  assert(fs.existsSync(index), 'Final Pages artifact is missing');

  const html = read(index);
  const issues: string[] = [];
  validateRequiredFiles(issues);

  if (html.includes('unversioned')) issues.push('unversioned cache token remains in final Pages HTML');
  if (!html.includes(`_critical-media/sushiclub-logo.svg?v=${sha}`)) {
    issues.push('versioned system logo is missing from final HTML');
  }
  if (/<script\b[^>]*\bsrc=["'][^"']*(?:override\/runtime-main\.js|override\/[^"']+\.ts)[^"']*["']/i.test(html)) {
    issues.push('source-only override runtime reference remains in final HTML');
  }
  if (walk(SITE).some((file) => file.endsWith('.ts'))) {
    issues.push('TypeScript source leaked into final Pages artifact');
  }

  if (issues.length) failList('Final Pages invariant validation failed', issues);
}
