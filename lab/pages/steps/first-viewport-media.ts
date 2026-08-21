import path from 'node:path';
import { SITE, githubSha, read, write } from '../lib/core.js';
import { FIRST_VIEWPORT_COUNT } from './first-viewport-media/config.js';
import { optimizeDesktopStability } from './first-viewport-media/desktop.js';
import { summarizeChrome, verifyDesktopAssets } from './first-viewport-media/desktop-verify.js';
import {
  optimizeFirstViewportProducts,
  summarizeFirstViewport,
  verifyFirstViewportAssets,
} from './first-viewport-media/products.js';

export async function optimizeFirstViewportMedia(): Promise<void> {
  const sha = githubSha();
  const indexFile = path.join(SITE, 'index.html');
  const source = read(indexFile);

  const firstViewport = await optimizeFirstViewportProducts(source);
  const desktop = await optimizeDesktopStability(firstViewport.html, sha);

  verifyFirstViewportAssets(desktop.html);
  verifyDesktopAssets(desktop.html, sha);
  write(indexFile, desktop.html);

  console.log(
    `Optimized ${FIRST_VIEWPORT_COUNT} first-viewport products after logo readiness: ${summarizeFirstViewport(firstViewport.stats)}. `
      + `Desktop stability: banner ${desktop.stats.bannerSize[0]}x${desktop.stats.bannerSize[1]}/${desktop.stats.bannerBytes}B same-origin; `
      + `${summarizeChrome(desktop.stats.media)}; ${desktop.stats.countryLinks} country links labelled.`,
  );
}
