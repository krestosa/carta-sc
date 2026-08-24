import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SITE, assert, githubSha, read, walk } from '../lib/core.js';
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

function validateOverrideCoverage(issues: string[]): void {
  const productionRoot = path.join(ROOT, '.generated', 'production', 'override');
  const targetRoot = path.join(SITE, 'override');
  if (!fs.existsSync(productionRoot)) {
    issues.push('optimized production override is missing during final validation');
    return;
  }

  const missing: string[] = [];
  for (const source of walk(productionRoot)) {
    if (!fs.statSync(source).isFile()) continue;
    const relative = path.relative(productionRoot, source).replaceAll(path.sep, '/');
    const target = path.join(targetRoot, ...relative.split('/'));
    if (!fs.existsSync(target) || !fs.statSync(target).isFile() || fs.statSync(target).size === 0) {
      missing.push(relative);
    }
  }

  if (missing.length > 0) {
    issues.push(`optimized override staging is incomplete; missing=${missing.sort().join(',')}`);
  }

  const modularCss = walk(targetRoot)
    .filter((file) => file.endsWith('.css') && displayPath(file) !== 'override/main.css')
    .map(displayPath)
    .sort();
  if (modularCss.length > 0) {
    issues.push(`source CSS leaked into optimized override artifact: ${modularCss.join(',')}`);
  }
}

function validateProductImageContract(html: string, issues: string[]): void {
  if (!/<div\b[^>]*class=["'][^"']*\bimgShop\b[^"']*["'][^>]*>\s*<img\b[^>]*\bdata-sc-src=["'][^"']+["']/i.test(html)) {
    issues.push('final product cards do not expose deferred image sources inside imgShop');
  }

  const dataRuntime = path.join(SITE, 'override', 'components', 'product-card', 'data.js');
  if (!fs.existsSync(dataRuntime)) {
    issues.push('compiled product-card data runtime is missing');
    return;
  }

  const runtime = read(dataRuntime);
  if (!runtime.includes("card.querySelector('.imgShop img, img.productoImageShop')")) {
    issues.push('product modal image resolver is not compatible with rendered imgShop markup');
  }
  if (!runtime.includes("image.getAttribute('data-sc-src')")) {
    issues.push('product modal image resolver does not read deferred product image sources');
  }
}

export function validateFinalInvariants(): void {
  const sha = githubSha();
  const index = path.join(SITE, 'index.html');
  assert(fs.existsSync(index), 'Final Pages artifact is missing');

  const html = read(index);
  const issues: string[] = [];
  validateRequiredFiles(issues);
  validateOverrideCoverage(issues);
  validateProductImageContract(html, issues);

  if (html.includes('unversioned')) issues.push('unversioned cache token remains in final Pages HTML');
  if (!html.includes(`_critical-media/sushiclub-logo.svg?v=${sha}`)) {
    issues.push('versioned system logo is missing from final HTML');
  }
  if (!html.includes(`const VERSION = '${sha}';`)) {
    issues.push('final delivery loader does not identify the exact build SHA');
  }
  if (/<script\b[^>]*\bsrc=["'][^"']*(?:override\/runtime-main\.js|override\/[^"']+\.ts)[^"']*["']/i.test(html)) {
    issues.push('source-only override runtime reference remains in final HTML');
  }
  if (walk(SITE).some((file) => file.endsWith('.ts'))) {
    issues.push('TypeScript source leaked into final Pages artifact');
  }

  if (issues.length) failList('Final Pages invariant validation failed', issues);
}
