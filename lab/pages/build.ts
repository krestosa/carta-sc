import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, SITE, LAB, assert, copyFile, copyTree, ensureDir, nodeCheck, remove } from './lib/core.js';
import { applyLabOverrides } from './steps/apply-lab-overrides.js';
import { compileTemplates } from './steps/compile-templates.js';
import { prepareArtifact } from './steps/prepare-artifact.js';
import { optimizeCriticalPath } from './steps/critical-path.js';
import { cleanProductImages } from './steps/clean-product-images.js';
import { cleanSnapshot } from './steps/clean-snapshot.js';
import { flattenBootstrap } from './steps/flatten-bootstrap.js';
import { bundleLegacyCss, bundleLegacyJs, bundleShopJs } from './steps/bundle-legacy.js';
import { externalizeStaticAssets } from './steps/externalize-assets.js';
import { optimizeDelivery } from './steps/optimize-delivery.js';
import { optimizeFirstPaint } from './steps/first-paint.js';
import { seedTheme } from './steps/seed-theme.js';
import { optimizeFirstViewportMedia } from './steps/first-viewport-media.js';
import { optimizeBreakpointMedia } from './steps/breakpoint-media.js';
import { measureSystemLogo, applySystemLogoOptics } from './steps/system-logo.js';
import { replaceSystemLogo } from './steps/replace-system-logo.js';
import { pruneSupersededMedia } from './steps/prune-superseded-media.js';
import { optimizeLcp } from './steps/optimize-lcp.js';
import { disablePhpRuntime } from './steps/disable-php-runtime.js';
import {
  validateFinalInvariants,
  validateHtml,
  validateJsSyntax,
  validateLocalAssets,
  validatePerformanceBudget,
  validateSnapshotIntegration,
  validateSystemLoad,
} from './validators.js';

const ROOT_EXCLUDES = new Set([
  '.git', '.github', '.pages-site', '.build', '.generated', '.migration', 'node_modules',
  'lab', 'scripts', 'README.md', 'DOCUMENTACION_TECNICA_COMPLETA.md',
  'package.json', 'package-lock.json', 'tsconfig.base.json', 'tsconfig.browser.json', 'tsconfig.tooling.json', 'types',
]);

function stageRuntime(): void {
  remove(SITE);
  ensureDir(SITE);
  copyTree(ROOT, SITE, (relative, absolute) => {
    const normalized = relative.replaceAll(path.sep, '/');
    const top = normalized.split('/', 1)[0] ?? normalized;
    if (ROOT_EXCLUDES.has(top)) return false;
    if (absolute === SITE || absolute.startsWith(`${SITE}${path.sep}`)) return false;
    if (normalized.endsWith('.ts')) return false;
    return true;
  });

  const generatedOverride = path.join(ROOT, '.generated', 'browser', 'override');
  assert(fs.existsSync(generatedOverride), 'Browser TypeScript output is missing; run build:runtime first');
  copyTree(generatedOverride, path.join(SITE, 'override'));
  copyFile(path.join(LAB, '.nojekyll'), path.join(SITE, '.nojekyll'));
}

function validateRuntimeSyntax(final = false): void {
  const files = [
    path.join(SITE, 'override', 'main.js'),
    path.join(SITE, '_pages', 'legacy.js'),
    path.join(SITE, '_pages', 'shop.js'),
  ];
  if (final) {
    files.push(path.join(SITE, '_pages', 'php-guard.js'), path.join(SITE, '_js_dev', 'main-legacy.js'));
  }
  for (const file of files) nodeCheck(file);
  validateJsSyntax();
}

export async function buildPages(): Promise<void> {
  validateSnapshotIntegration();
  stageRuntime();

  applyLabOverrides();
  compileTemplates();
  prepareArtifact();
  optimizeCriticalPath();
  cleanProductImages();
  cleanSnapshot();
  flattenBootstrap();
  bundleLegacyCss();
  bundleLegacyJs();
  await bundleShopJs(externalizeStaticAssets);

  validateRuntimeSyntax();
  validateLocalAssets();
  validateHtml();
  validatePerformanceBudget('pre');

  await optimizeDelivery();
  await optimizeFirstPaint();
  seedTheme();
  await optimizeFirstViewportMedia();
  await optimizeBreakpointMedia();
  await measureSystemLogo();
  replaceSystemLogo();
  applySystemLogoOptics();
  pruneSupersededMedia();
  await optimizeLcp();
  disablePhpRuntime();

  validateRuntimeSyntax(true);
  validateLocalAssets();
  validateHtml();
  validateSystemLoad();
  validateFinalInvariants();

  process.stdout.write(`Pages lab artifact built at .pages-site for ${process.env.GITHUB_SHA ?? 'unknown'}\n`);
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(path.resolve(entry)).href) {
  buildPages().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  });
}
