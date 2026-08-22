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

interface SnapshotMetrics {
  normalized: number;
  dimensions: number;
  anchors: number;
  aria: number;
}

class SnapshotCleaner {
  readonly #file = path.join(SITE, 'index.html');
  #html = read(this.#file);
  readonly #metrics: SnapshotMetrics = {
    normalized: 0,
    dimensions: 0,
    anchors: 0,
    aria: 0,
  };

  run(): void {
    githubSha();
    this.#normalizeMarkup();
    this.#normalizeDimensions();
    this.#normalizeAccessibility();
    this.#removeCapturedRuntime();
    verifySnapshotRuntime(this.#html);
    write(this.#file, this.#html);
    this.#report();
  }

  #normalizeMarkup(): void {
    const anchors = repairAnchorIds(this.#html);
    this.#html = anchors.html;
    this.#metrics.anchors = anchors.count;

    const normalized = stripInlineProperties(
      this.#html,
      'normCols',
      NORMALIZED_HEIGHT_PROPERTIES,
    );
    this.#html = normalized.html;
    this.#metrics.normalized = normalized.count;
  }

  #normalizeDimensions(): void {
    const banner = ensureImageDimensions(
      this.#html,
      '\\bclass=["\'][^"\']*\\bimgBannerShop\\b',
      1500,
      157,
    );
    this.#html = banner.html;

    const tiktok = ensureImageDimensions(
      this.#html,
      '\\bsrc=["\'][^"\']*icons8-tiktok-32\\.png[^"\']*["\']',
      22,
      22,
      true,
    );
    this.#html = tiktok.html;
    this.#metrics.dimensions = banner.count + tiktok.count;
    verifySnapshotDimensions(this.#html);
  }

  #normalizeAccessibility(): void {
    for (const rule of ARIA_RULES) {
      const mutation = addAriaLabel(this.#html, rule);
      this.#html = mutation.html;
      this.#metrics.aria += mutation.count;
    }
    assert(
      !this.#html.includes('\uFFFD'),
      'Unicode replacement character remains in the cleaned Pages snapshot',
    );
  }

  #removeCapturedRuntime(): void {
    this.#html = removeExactlyOne(
      this.#html,
      /<script>\s*window\.jQuery\s*\|\|\s*document\.write\([\s\S]*?jquery-2\.1\.0\.min\.js[\s\S]*?\)\s*<\/script>/i,
      'redundant jQuery document.write fallback',
    );
    this.#html = removeExactlyOne(
      this.#html,
      /<script\b[^>]*\bsrc=["']https:\/\/www\.googletagmanager\.com\/gtm\.js\?id=GTM-WQPLGX9["'][^>]*>\s*<\/script>/i,
      'captured GTM runtime tag',
    );
    this.#html = removeExactlyOne(
      this.#html,
      /<script\b[^>]*\bsrc=["']https:\/\/www\.gstatic\.com\/recaptcha\/releases\/[^"']+\/recaptcha__en\.js["'][^>]*>\s*<\/script>/i,
      'captured reCAPTCHA runtime tag',
    );
    this.#html = emptyDivContents(this.#html, '<div class="g-recaptcha" data-sitekey=');
    this.#html = removeDivBlock(
      this.#html,
      '<div style="background-color: rgb(255, 255, 255); border: 1px solid rgb(204, 204, 204); box-shadow: rgba(0, 0, 0, 0.2) 2px 2px 3px;',
    );
    this.#html = restoreRemoteRecaptcha(this.#html);
  }

  #report(): void {
    console.log(
      `Cleaned snapshot: norm=${this.#metrics.normalized}, dimensions=${this.#metrics.dimensions}, anchors=${this.#metrics.anchors}, aria=${this.#metrics.aria}`,
    );
  }
}

export function cleanSnapshot(): void {
  new SnapshotCleaner().run();
}
