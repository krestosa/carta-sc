import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, githubSha, read } from '../lib/core.js';
import { countLiteral, failList, scanTags, unique, urlPath } from './shared.js';

const SUPERSEDED_LOGO_REFERENCES = [
  'web-sushiclub2_black_m2',
  'web-sushiclub2_black.png',
  '_critical-media/mobile-logo.png',
  '_critical-media/mobile-logo.webp',
  '_chrome-media/desktop-logo.webp',
] as const;

const SUPERSEDED_RASTERS = [
  'https://www.sushiclub.com.ar/gfx/back_body_01.png',
  'https://www.sushiclub.com.ar/gfx/back_body_01_white.png',
  'https://www.sushiclub.com.ar/gfx/scrollTab2.png',
] as const;

const SUPERSEDED_SHOP_SCRIPTS = [
  'js/funcionesShop__q_f352afe3.js',
  'js/main_shop__q_a48cd660.js',
] as const;

function occurrences(values: readonly string[], expected: string): number {
  return values.filter((value) => value === expected).length;
}

export function validateSystemLoad(): void {
  const index = path.join(SITE, 'index.html');
  const sha = githubSha();
  assert(fs.existsSync(index), 'invalid system-load validation context');

  const html = read(index);
  const scripts: string[] = [];
  const styles: string[] = [];
  const images: string[] = [];
  const preloads: string[] = [];

  for (const tag of scanTags(html)) {
    if (tag.closing) continue;
    const attrs = tag.attrs;
    if (tag.name === 'script' && attrs.src) {
      scripts.push(attrs.src);
    } else if (tag.name === 'link') {
      const rel = new Set((attrs.rel ?? '').toLowerCase().split(/\s+/));
      if (rel.has('stylesheet') && attrs.href) styles.push(attrs.href);
      if (rel.has('preload') && attrs.href) preloads.push(attrs.href);
    } else if (tag.name === 'img' && attrs.src) {
      images.push(attrs.src);
    }
  }

  const issues: string[] = [];
  const logo = `_critical-media/sushiclub-logo.svg?v=${sha}`;
  if (occurrences(images, logo) !== 2 || occurrences(preloads, logo) !== 1) {
    issues.push(`system logo load contract mismatch: images=${occurrences(images, logo)} preloads=${occurrences(preloads, logo)}`);
  }

  for (const stale of SUPERSEDED_LOGO_REFERENCES) {
    if (html.includes(stale)) issues.push(`superseded logo reference remains active/generated: ${stale}`);
  }
  for (const staleFile of [
    path.join(SITE, '_critical-media/mobile-logo.png'),
    path.join(SITE, '_critical-media/mobile-logo.webp'),
    path.join(SITE, '_chrome-media/desktop-logo.webp'),
  ]) {
    if (fs.existsSync(staleFile)) {
      issues.push(`superseded logo file remains in artifact: ${path.relative(SITE, staleFile).replaceAll(path.sep, '/')}`);
    }
  }

  const traitTags = [...html.matchAll(/<img\b(?=[^>]*\bdata-original-title=)[^>]*>/gi)].map((match) => match[0]);
  if (!traitTags.length) issues.push('legacy trait metadata nodes are missing');
  if (traitTags.some((tag) => /\bsrc\s*=/.test(tag))) issues.push('legacy trait metadata still has an active img src');

  for (const stale of SUPERSEDED_RASTERS) {
    if (html.includes(stale)) issues.push(`superseded CSS raster remains in final browser graph: ${stale}`);
  }

  const runtimeEntries = [
    "{ src: 'js/jquery-2.1.0.min.js', kind: 'classic' }",
    "{ src: '_pages/php-guard.js?v=' + VERSION, kind: 'classic' }",
    "{ src: '_pages/legacy.js?v=' + VERSION, kind: 'classic' }",
    "{ src: '_js_dev/main-legacy.js?v=' + VERSION, kind: 'classic' }",
    "{ src: 'override/main.js?v=' + VERSION, kind: 'module' }",
    "{ src: '_pages/shop.js?v=' + VERSION, kind: 'classic' }",
  ];
  for (const entry of runtimeEntries) {
    if (countLiteral(html, entry) !== 1) issues.push(`deferred runtime entry missing or duplicated: ${entry}`);
  }

  if (!html.includes("await loadStylesheet('_pages/deferred.css?v=' + VERSION)")) {
    issues.push('optimized deferred stylesheet loader is missing');
  }
  if (!html.includes("browser.dispatchEvent(new CustomEvent('sc:runtime-ready'))")) {
    issues.push('runtime-ready event dispatch is missing');
  }
  if (html.includes('__scRuntimeReady') || html.includes('__scAfterRuntime')) {
    issues.push('legacy runtime readiness globals remain in final Pages HTML');
  }
  if (!fs.existsSync(path.join(SITE, '_pages/php-guard.js'))) issues.push('static Pages PHP transport guard is missing');
  if (html.includes('keepSessionAlive') || html.includes('keepalive: 1')) issues.push('captured PHP session keepalive remains in final Pages HTML');

  for (const source of SUPERSEDED_SHOP_SCRIPTS) {
    if (html.includes(source)) issues.push(`superseded shop script is still referenced by browser load graph: ${source}`);
  }

  const stylePaths = styles.map(urlPath);
  for (const value of stylePaths) {
    if (value.startsWith('_css_dev/') || [
      '_pages/legacy.css',
      'override/main.css',
      'css/styles_shop__q_a48cd660.css',
      'css/_aux__q_a48cd660.css',
    ].includes(value)) {
      issues.push(`superseded stylesheet is still loaded directly: ${value}`);
    }
  }
  for (const value of unique(stylePaths).sort()) {
    const count = occurrences(stylePaths, value);
    if (count > 1) issues.push(`duplicate eager stylesheet load (${count}x): ${value}`);
  }
  if (countLiteral(html, 'id="sc-pages-critical-css"') !== 1) issues.push('critical inline CSS block missing or duplicated');

  const scriptPaths = scripts.map(urlPath);
  for (const value of unique(scriptPaths).sort()) {
    const count = occurrences(scriptPaths, value);
    if (count > 1) issues.push(`duplicate eager script load (${count}x): ${value}`);
  }

  if (html.includes('aniversario_banner_desktop_(1)1782398717_556.webp')) issues.push('upstream banner remains referenced after responsive localization');
  if (!html.includes(`_critical-media/desktop-banner.webp?v=${sha}`)) issues.push('optimized desktop banner reference missing');
  if (!html.includes(`_critical-media/mobile-banner.webp?v=${sha}`)) issues.push('optimized mobile banner reference missing');

  if (issues.length) failList('System load validation failed', issues);
}
