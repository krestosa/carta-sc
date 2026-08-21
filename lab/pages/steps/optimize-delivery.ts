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

export async function optimizeDelivery(): Promise<void> {
  const sha = githubSha();
  const index = path.join(SITE, 'index.html');
  const legacyCssFile = path.join(SITE, '_pages/legacy.css');
  const overrideCssFile = path.join(SITE, 'override/main.css');
  assert(
    fs.existsSync(legacyCssFile) && fs.existsSync(overrideCssFile),
    'Bundled local stylesheets are missing',
  );

  const criticalCss = criticalCssBlock(read(legacyCssFile), read(overrideCssFile));
  let html = inlineLocalStyles(read(index), sha, criticalCss);
  html = removeSupersededPreloads(html, sha);
  html = await inlineOrDeferRoboto(html);
  html = removeRemoteBootstraps(html);
  html = installDeliveryLoaderSlot(normalizeTikTokIcon(html));

  assert(html.includes('id="sc-pages-critical-css"'), 'Critical local CSS was not inlined');
  assert(html.split('id="sc-pages-delivery-loader"').length - 1 === 1, 'Delivery loader slot count is invalid');
  write(index, html);
}
