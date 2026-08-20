import path from 'node:path';
import { SITE, githubSha, read, write } from '../lib/core.js';
import { criticalMedia, splitCss } from './first-paint/css.js';
import { hardLazy, injectCatalogToolsShell, mirrorCriticalMedia } from './first-paint/media.js';
import { patchRuntime, queueInline, removeRuntime, stripMaps } from './first-paint/runtime.js';
import { injectLoader, verify } from './first-paint/delivery.js';

export async function optimizeFirstPaint():Promise<void>{
  const sha=githubSha(),index=path.join(SITE,'index.html');
  let html=read(index);
  const split=splitCss(html);html=split.html;
  html=criticalMedia(html);
  html=removeRuntime(html,sha);
  html=queueInline(html);
  html=injectCatalogToolsShell(html);
  const lazy=hardLazy(html);html=lazy.html;
  html=await mirrorCriticalMedia(html,sha);
  patchRuntime();stripMaps();
  html=injectLoader(html,sha);
  verify(html,sha,lazy.count,split.criticalBytes,split.deferredBytes);
  write(index,html);
  console.log(`First-viewport split: ${lazy.count} product images hard-lazy, same-origin mobile logo LCP, static catalog tools shell, ${split.criticalBytes} critical CSS bytes, ${split.deferredBytes} deferred CSS bytes, runtime gated behind logo paint, imgLiquid/Knormalize pruned.`);
}
