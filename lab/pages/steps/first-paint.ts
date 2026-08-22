import path from 'node:path';
import { SITE, githubSha, read, write } from '../lib/core.js';
import { criticalMedia, splitCss } from './first-paint/css.js';
import { injectLoader, verify } from './first-paint/delivery.js';
import { hardLazy, injectCatalogToolsShell, mirrorCriticalMedia } from './first-paint/media.js';
import { deferInlineRuntime, patchRuntime, removeRuntime, stripMaps } from './first-paint/runtime.js';

interface FirstPaintMetrics {
  readonly lazyProductCount: number;
  readonly criticalCssBytes: number;
  readonly deferredCssBytes: number;
}

class FirstPaintOptimizer {
  readonly #sha = githubSha();
  readonly #index = path.join(SITE, 'index.html');
  #html = read(this.#index);
  #metrics: FirstPaintMetrics | null = null;

  async run(): Promise<void> {
    this.#splitStyles();
    this.#prepareCriticalMarkup();
    await this.#prepareMedia();
    this.#prepareRuntime();
    this.#verifyAndWrite();
    this.#report();
  }

  #splitStyles(): void {
    const split = splitCss(this.#html);
    this.#html = split.html;
    this.#metrics = {
      lazyProductCount: 0,
      criticalCssBytes: split.criticalBytes,
      deferredCssBytes: split.deferredBytes,
    };
  }

  #prepareCriticalMarkup(): void {
    this.#html = criticalMedia(this.#html);
    this.#html = removeRuntime(this.#html, this.#sha);
    this.#html = deferInlineRuntime(this.#html);
    this.#html = injectCatalogToolsShell(this.#html);
  }

  async #prepareMedia(): Promise<void> {
    const lazy = hardLazy(this.#html);
    this.#html = lazy.html;
    this.#html = await mirrorCriticalMedia(this.#html, this.#sha);
    const metrics = this.#requireMetrics();
    this.#metrics = { ...metrics, lazyProductCount: lazy.count };
  }

  #prepareRuntime(): void {
    patchRuntime();
    stripMaps();
    this.#html = injectLoader(this.#html, this.#sha);
  }

  #verifyAndWrite(): void {
    const metrics = this.#requireMetrics();
    verify(
      this.#html,
      this.#sha,
      metrics.lazyProductCount,
      metrics.criticalCssBytes,
      metrics.deferredCssBytes,
    );
    write(this.#index, this.#html);
  }

  #report(): void {
    const metrics = this.#requireMetrics();
    console.log(
      `First-viewport split: ${metrics.lazyProductCount} product images hard-lazy, same-origin mobile logo LCP, static catalog tools shell, ${metrics.criticalCssBytes} critical CSS bytes, ${metrics.deferredCssBytes} deferred CSS bytes, runtime gated behind logo paint, imgLiquid/Knormalize pruned.`,
    );
  }

  #requireMetrics(): FirstPaintMetrics {
    if (!this.#metrics) throw new Error('First-paint metrics are not initialized');
    return this.#metrics;
  }
}

export async function optimizeFirstPaint(): Promise<void> {
  await new FirstPaintOptimizer().run();
}
