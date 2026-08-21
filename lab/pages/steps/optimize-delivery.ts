import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, githubSha, read, write } from '../lib/core.js';
import {
  criticalCssBlock,
  inlineLocalStyles,
  removeSupersededPreloads,
} from './optimize-delivery/css.js';
import {
  inlineOrDeferRoboto,
  installDeliveryLoaderSlot,
  normalizeTikTokIcon,
  removeRemoteBootstraps,
} from './optimize-delivery/html.js';

interface DeliveryPaths {
  readonly index: string;
  readonly legacyCss: string;
  readonly overrideCss: string;
}

class DeliveryOptimizer {
  readonly #sha = githubSha();
  readonly #paths: DeliveryPaths = {
    index: path.join(SITE, 'index.html'),
    legacyCss: path.join(SITE, '_pages/legacy.css'),
    overrideCss: path.join(SITE, 'override/main.css'),
  };

  async run(): Promise<void> {
    this.#assertBundledStyles();
    const criticalCss = this.#criticalCss();
    const html = await this.#transformHtml(criticalCss);
    this.#verify(html);
    write(this.#paths.index, html);
  }

  #assertBundledStyles(): void {
    assert(
      fs.existsSync(this.#paths.legacyCss) && fs.existsSync(this.#paths.overrideCss),
      'Bundled local stylesheets are missing',
    );
  }

  #criticalCss(): string {
    return criticalCssBlock(
      read(this.#paths.legacyCss),
      read(this.#paths.overrideCss),
    );
  }

  async #transformHtml(criticalCss: string): Promise<string> {
    let html = inlineLocalStyles(read(this.#paths.index), this.#sha, criticalCss);
    html = removeSupersededPreloads(html, this.#sha);
    html = await inlineOrDeferRoboto(html);
    html = removeRemoteBootstraps(html);
    return installDeliveryLoaderSlot(normalizeTikTokIcon(html));
  }

  #verify(html: string): void {
    assert(html.includes('id="sc-pages-critical-css"'), 'Critical local CSS was not inlined');
    assert(
      html.split('id="sc-pages-delivery-loader"').length - 1 === 1,
      'Delivery loader slot count is invalid',
    );
  }
}

export async function optimizeDelivery(): Promise<void> {
  await new DeliveryOptimizer().run();
}
