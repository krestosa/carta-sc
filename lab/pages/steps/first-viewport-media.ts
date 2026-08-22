import path from 'node:path';
import { SITE, githubSha, read, write } from '../lib/core.js';
import type { DesktopMediaStats } from './first-viewport-media/config.js';
import { optimizeDesktopStability } from './first-viewport-media/desktop.js';
import { summarizeChrome, verifyDesktopAssets } from './first-viewport-media/desktop-verify.js';

interface MediaOptimizationResult {
  readonly html: string;
  readonly desktopStats: DesktopMediaStats;
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
    const desktop = await optimizeDesktopStability(source, this.#sha);
    return {
      html: desktop.html,
      desktopStats: desktop.stats,
    };
  }

  #verify(html: string): void {
    verifyDesktopAssets(html, this.#sha);
  }

  #report(result: MediaOptimizationResult): void {
    const desktop = result.desktopStats;
    console.log(
      `Desktop stability: banner ${desktop.bannerSize[0]}x${desktop.bannerSize[1]}/${desktop.bannerBytes}B same-origin; `
        + `${summarizeChrome(desktop.media)}; ${desktop.countryLinks} country links labelled.`,
    );
  }
}

export async function optimizeFirstViewportMedia(): Promise<void> {
  await new FirstViewportMediaOptimizer().run();
}
