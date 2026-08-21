import path from 'node:path';
import { SITE, assert, githubSha, read, write } from '../lib/core.js';
import {
  injectFontAwesomePreload,
  injectFontPreloads,
  localizeRoboto,
  removeRemoteGoogleFontBootstrap,
  verifyLocalizedFonts,
} from './optimize-lcp/fonts.js';
import { injectProductPreload, promoteFirstViewportProducts } from './optimize-lcp/products.js';

interface LcpPaths {
  readonly index: string;
  readonly deferredCss: string;
}

class LcpOptimizer {
  readonly #sha = githubSha();
  readonly #paths: LcpPaths = {
    index: path.join(SITE, 'index.html'),
    deferredCss: path.join(SITE, '_pages', 'deferred.css'),
  };

  #html = read(this.#paths.index);
  #deferredCss = read(this.#paths.deferredCss);

  async run(): Promise<void> {
    this.#promoteProducts();
    await this.#localizeFonts();
    this.#verify();
    this.#write();
  }

  #promoteProducts(): void {
    const promoted = promoteFirstViewportProducts(this.#html, this.#sha);
    this.#html = injectProductPreload(promoted.html, promoted.sources[0] ?? '');
  }

  async #localizeFonts(): Promise<void> {
    const roboto = await localizeRoboto(this.#deferredCss, this.#sha);
    this.#deferredCss = roboto.css;
    this.#html = removeRemoteGoogleFontBootstrap(this.#html);
    assert(
      !/fonts\.(?:gstatic|googleapis)\.com/.test(`${this.#deferredCss}${this.#html}`),
      'remote Google font URL remains in final artifact',
    );
    this.#html = injectFontPreloads(this.#html, roboto.preloads);
    this.#html = injectFontAwesomePreload(this.#html, this.#deferredCss);
    verifyLocalizedFonts(roboto.preloads);
  }

  #verify(): void {
    assert(
      this.#html.split('id="sc-product-lcp-preload"').length - 1 === 1,
      'product LCP preload missing or duplicated',
    );
  }

  #write(): void {
    write(this.#paths.index, this.#html);
    write(this.#paths.deferredCss, this.#deferredCss);
  }
}

export async function optimizeLcp(): Promise<void> {
  await new LcpOptimizer().run();
}
