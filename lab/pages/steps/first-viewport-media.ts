import path from 'node:path';
import { SITE, githubSha, read, write } from '../lib/core.js';
import { FIRST_VIEWPORT_COUNT } from './first-viewport-media/config.js';
import { optimizeDesktopStability } from './first-viewport-media/desktop.js';
import { summarizeChrome, verifyDesktopAssets } from './first-viewport-media/desktop-verify.js';
import {
  optimizeFirstViewportProducts,
  summarizeFirstViewport,
  verifyFirstViewportAssets,
  type FirstViewportStats,
} from './first-viewport-media/products.js';
import type { DesktopStabilityStats } from './first-viewport-media/desktop.js';

interface MediaOptimizationResult {
  readonly html: string;
  readonly firstViewportStats: FirstViewportStats;
  readonly desktopStats: DesktopStabilityStats;
}

class FirstViewportMediaOptimizer {
  readonly #sha = githubSha();
  readonly #indexFile = path.join(SITE, 'index.html');

  async run(): Promise<void> {
    const result = await this.#optimize(read(this.#indexFile));
    this.#verify(result.html);
    write(this.#indexFile, result.html);
    this.#report(result);
  }

  async #optimize(source: string): Promise<MediaOptimizationResult> {
    const firstViewport = await optimizeFirstViewportProducts(source);
    const desktop = await optimizeDesktopStability(firstViewport.html, this.#sha);
    return {
      html: desktop.html,
      firstViewportStats: firstViewport.stats,
      desktopStats: desktop.stats,
    };
  }

  #verify(html: string): void {
    verifyFirstViewportAssets(html);
    verifyDesktopAssets(html, this.#sha);
  }

  #report(result: MediaOptimizationResult): void {
    const desktop = result.desktopStats;
    console.log(
      `Optimized ${FIRST_VIEWPORT_COUNT} first-viewport products after logo readiness: ${summarizeFirstViewport(result.firstViewportStats)}. `
        + `Desktop stability: banner ${desktop.bannerSize[0]}x${desktop.bannerSize[1]}/${desktop.bannerBytes}B same-origin; `
        + `${summarizeChrome(desktop.media)}; ${desktop.countryLinks} country links labelled.`,
    );
  }
}

export async function optimizeFirstViewportMedia(): Promise<void> {
  await new FirstViewportMediaOptimizer().run();
}
