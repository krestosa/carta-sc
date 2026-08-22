import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  LAB,
  ROOT,
  SITE,
  assert,
  copyFile,
  copyTree,
  ensureDir,
  nodeCheck,
  remove,
  type JavaScriptSyntaxMode,
} from './lib/core.js';
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
  '.git',
  '.github',
  '.pages-site',
  '.build',
  '.generated',
  '.migration',
  'node_modules',
  'handoff',
  'lab',
  'scripts',
  'README.md',
  'DOCUMENTACION_TECNICA_COMPLETA.md',
  'TYPESCRIPT_NATIVE_REWRITE_RULES.md',
  'package.json',
  'package-lock.json',
  'tsconfig.base.json',
  'tsconfig.browser.json',
  'tsconfig.tooling.json',
  'types',
]);

interface RuntimeSyntaxTarget {
  readonly file: string;
  readonly mode: JavaScriptSyntaxMode;
}

type ValidationStage = 'pre' | 'final';

class PagesBuildPipeline {
  run = async (): Promise<void> => {
    validateSnapshotIntegration();
    this.stageRuntime();
    await this.prepareBaseArtifact();
    this.validateArtifact('pre');
    await this.optimizeArtifact();
    this.validateArtifact('final');
    this.reportSuccess();
  };

  private stageRuntime(): void {
    remove(SITE);
    ensureDir(SITE);
    copyTree(ROOT, SITE, (relative, absolute) => this.shouldStageSource(relative, absolute));
    assert(!fs.existsSync(path.join(SITE, 'handoff')), 'handoff artifact leaked into Pages staging');

    const generatedOverride = path.join(ROOT, '.generated', 'browser', 'override');
    assert(fs.existsSync(generatedOverride), 'Browser TypeScript output is missing; run build:runtime first');
    copyTree(generatedOverride, path.join(SITE, 'override'));
    copyFile(path.join(LAB, '.nojekyll'), path.join(SITE, '.nojekyll'));
  }

  private shouldStageSource(relative: string, absolute: string): boolean {
    const normalized = relative.replaceAll(path.sep, '/');
    const topLevel = normalized.split('/', 1)[0] ?? normalized;
    if (ROOT_EXCLUDES.has(topLevel)) return false;
    if (absolute === SITE || absolute.startsWith(`${SITE}${path.sep}`)) return false;
    return !normalized.endsWith('.ts');
  }

  private async prepareBaseArtifact(): Promise<void> {
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
  }

  private async optimizeArtifact(): Promise<void> {
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
  }

  private validateArtifact(stage: ValidationStage): void {
    this.validateRuntimeSyntax(stage === 'final');
    validateLocalAssets();
    validateHtml();

    if (stage === 'pre') {
      validatePerformanceBudget('pre');
      return;
    }

    validateSystemLoad();
    validateFinalInvariants();
  }

  private validateRuntimeSyntax(final: boolean): void {
    for (const target of this.runtimeSyntaxTargets(final)) nodeCheck(target.file, target.mode);
    validateJsSyntax();
  }

  private runtimeSyntaxTargets(final: boolean): RuntimeSyntaxTarget[] {
    const targets: RuntimeSyntaxTarget[] = [
      { file: path.join(SITE, 'override', 'main.js'), mode: 'module' },
      { file: path.join(SITE, '_pages', 'legacy.js'), mode: 'classic' },
      { file: path.join(SITE, '_pages', 'shop.js'), mode: 'classic' },
    ];

    if (final) {
      targets.push(
        { file: path.join(SITE, '_pages', 'php-guard.js'), mode: 'classic' },
        { file: path.join(SITE, '_js_dev', 'main-legacy.js'), mode: 'classic' },
      );
    }
    return targets;
  }

  private reportSuccess(): void {
    process.stdout.write(`Pages lab artifact built at .pages-site for ${process.env.GITHUB_SHA ?? 'unknown'}\n`);
  }
}

export function buildPages(): Promise<void> {
  return new PagesBuildPipeline().run();
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && import.meta.url === pathToFileURL(path.resolve(entry)).href);
}

if (isDirectExecution()) {
  buildPages().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  });
}
