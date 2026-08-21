import path from 'node:path';
import { SITE, assert, githubSha, read, write } from '../lib/core.js';
import { ARIA_RULES, NORMALIZED_HEIGHT_PROPERTIES } from './clean-snapshot/config.js';
import {
  addAriaLabel,
  emptyDivContents,
  ensureImageDimensions,
  removeDivBlock,
  removeExactlyOne,
  repairAnchorIds,
  restoreRemoteRecaptcha,
  stripInlineProperties,
} from './clean-snapshot/mutations.js';
import { verifySnapshotDimensions, verifySnapshotRuntime } from './clean-snapshot/verify.js';

export function cleanSnapshot(): void {
  githubSha();
  const file = path.join(SITE, 'index.html');
  let html = read(file);
  const anchors = repairAnchorIds(html);
  html = anchors.html;
  const normalized = stripInlineProperties(html, 'normCols', NORMALIZED_HEIGHT_PROPERTIES);
  html = normalized.html;
  const banner = ensureImageDimensions(html, '\\bclass=["\'][^"\']*\\bimgBannerShop\\b', 1500, 157);
  html = banner.html;
  const tiktok = ensureImageDimensions(html, '\\bsrc=["\'][^"\']*icons8-tiktok-32\\.png[^"\']*["\']', 22, 22, true);
  html = tiktok.html;
  verifySnapshotDimensions(html);

  let ariaCount = 0;
  for (const rule of ARIA_RULES) {
    const mutation = addAriaLabel(html, rule);
    html = mutation.html;
    ariaCount += mutation.count;
  }

  assert(!html.includes('\uFFFD'), 'Unicode replacement character remains in the cleaned Pages snapshot');
  html = removeExactlyOne(
    html,
    /<script>\s*window\.jQuery\s*\|\|\s*document\.write\([\s\S]*?jquery-2\.1\.0\.min\.js[\s\S]*?\)\s*<\/script>/i,
    'redundant jQuery document.write fallback',
  );
  html = removeExactlyOne(
    html,
    /<script\b[^>]*\bsrc=["']https:\/\/www\.googletagmanager\.com\/gtm\.js\?id=GTM-WQPLGX9["'][^>]*>\s*<\/script>/i,
    'captured GTM runtime tag',
  );
  html = removeExactlyOne(
    html,
    /<script\b[^>]*\bsrc=["']https:\/\/www\.gstatic\.com\/recaptcha\/releases\/[^"']+\/recaptcha__en\.js["'][^>]*>\s*<\/script>/i,
    'captured reCAPTCHA runtime tag',
  );
  html = emptyDivContents(html, '<div class="g-recaptcha" data-sitekey=');
  html = removeDivBlock(html, '<div style="background-color: rgb(255, 255, 255); border: 1px solid rgb(204, 204, 204); box-shadow: rgba(0, 0, 0, 0.2) 2px 2px 3px;');
  html = restoreRemoteRecaptcha(html);
  verifySnapshotRuntime(html);
  write(file, html);
  console.log(
    `Cleaned snapshot: norm=${normalized.count}, dimensions=${banner.count + tiktok.count}, anchors=${anchors.count}, aria=${ariaCount}`,
  );
}
