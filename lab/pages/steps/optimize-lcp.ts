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

export async function optimizeLcp(): Promise<void> {
  const sha = githubSha();
  const indexFile = path.join(SITE, 'index.html');
  const deferredFile = path.join(SITE, '_pages', 'deferred.css');
  let html = read(indexFile);
  let deferredCss = read(deferredFile);

  const promoted = promoteFirstViewportProducts(html, sha);
  html = injectProductPreload(promoted.html, promoted.sources[0] ?? '');

  const roboto = await localizeRoboto(deferredCss, sha);
  deferredCss = roboto.css;
  html = removeRemoteGoogleFontBootstrap(html);
  assert(!/fonts\.(?:gstatic|googleapis)\.com/.test(`${deferredCss}${html}`), 'remote Google font URL remains in final artifact');
  html = injectFontPreloads(html, roboto.preloads);
  html = injectFontAwesomePreload(html, deferredCss);

  assert(html.split('id="sc-product-lcp-preload"').length - 1 === 1, 'product LCP preload missing or duplicated');
  verifyLocalizedFonts(roboto.preloads);
  write(indexFile, html);
  write(deferredFile, deferredCss);
}
