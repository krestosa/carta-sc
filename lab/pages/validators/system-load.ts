import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, githubSha, read } from '../lib/core.js';
import { countLiteral, failList, scanTags, unique, urlPath } from './shared.js';

interface LoadGraph {
  readonly scripts: string[];
  readonly styles: string[];
  readonly images: string[];
  readonly preloads: string[];
}

interface RuntimeEntry {
  readonly src: string;
  readonly kind: 'classic' | 'module';
  readonly versioned: boolean;
}

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
const RUNTIME_ENTRIES: readonly RuntimeEntry[] = [
  { src: 'js/jquery-2.1.0.min.js', kind: 'classic', versioned: false },
  { src: '_pages/php-guard.js', kind: 'classic', versioned: true },
  { src: '_pages/legacy.js', kind: 'classic', versioned: true },
  { src: '_js_dev/main-legacy.js', kind: 'classic', versioned: true },
  { src: 'override/main.js', kind: 'module', versioned: true },
  { src: '_pages/shop.js', kind: 'classic', versioned: true },
];

function occurrences(values: readonly string[], expected: string): number {
  return values.filter((value) => value === expected).length;
}

function collectLoadGraph(html: string): LoadGraph {
  const graph: LoadGraph = { scripts: [], styles: [], images: [], preloads: [] };

  for (const tag of scanTags(html)) {
    if (tag.closing) continue;
    if (tag.name === 'script' && tag.attrs.src) {
      graph.scripts.push(tag.attrs.src);
      continue;
    }
    if (tag.name === 'link') {
      const relations = new Set((tag.attrs.rel ?? '').toLowerCase().split(/\s+/));
      if (relations.has('stylesheet') && tag.attrs.href) graph.styles.push(tag.attrs.href);
      if (relations.has('preload') && tag.attrs.href) graph.preloads.push(tag.attrs.href);
      continue;
    }
    if (tag.name === 'img' && tag.attrs.src) graph.images.push(tag.attrs.src);
  }

  return graph;
}

function runtimeEntrySource(entry: RuntimeEntry): string {
  const source = entry.versioned ? `'${entry.src}?v=' + VERSION` : `'${entry.src}'`;
  return `{ src: ${source}, kind: '${entry.kind}' }`;
}

function validateSystemLogo(html: string, graph: LoadGraph, sha: string, issues: string[]): void {
  const logo = `_critical-media/sushiclub-logo.svg?v=${sha}`;
  if (occurrences(graph.images, logo) !== 2 || occurrences(graph.preloads, logo) !== 1) {
    issues.push(
      `system logo load contract mismatch: images=${occurrences(graph.images, logo)} preloads=${occurrences(graph.preloads, logo)}`,
    );
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
}

function validateTraitMetadata(html: string, issues: string[]): void {
  const traitTags = [...html.matchAll(/<img\b(?=[^>]*\bdata-original-title=)[^>]*>/gi)].map((match) => match[0]);
  if (traitTags.length === 0) issues.push('legacy trait metadata nodes are missing');
  if (traitTags.some((tag) => /\bsrc\s*=/.test(tag))) {
    issues.push('legacy trait metadata still has an active img src');
  }
}

function validateRuntimeLoader(html: string, issues: string[]): void {
  for (const descriptor of RUNTIME_ENTRIES) {
    const source = runtimeEntrySource(descriptor);
    if (countLiteral(html, source) !== 1) {
      issues.push(`deferred runtime entry missing or duplicated: ${source}`);
    }
  }

  const deferredStylesheet = "'_pages/deferred.css?v=' + VERSION";
  if (countLiteral(html, deferredStylesheet) !== 1) {
    issues.push('optimized deferred stylesheet loader is missing or duplicated');
  }
  if (!/dispatchEvent\(\s*new\s+CustomEvent\(\s*['"]sc:runtime-ready['"]\s*\)\s*\)/.test(html)) {
    issues.push('runtime-ready event dispatch is missing');
  }
  if (html.includes('__scRuntimeReady') || html.includes('__scAfterRuntime')) {
    issues.push('legacy runtime readiness globals remain in final Pages HTML');
  }
  if (!fs.existsSync(path.join(SITE, '_pages/php-guard.js'))) {
    issues.push('static Pages PHP transport guard is missing');
  }
  if (html.includes('keepSessionAlive') || html.includes('keepalive: 1')) {
    issues.push('captured PHP session keepalive remains in final Pages HTML');
  }
}

function validateStyles(graph: LoadGraph, issues: string[]): void {
  const stylePaths = graph.styles.map(urlPath);
  const superseded = new Set([
    '_pages/legacy.css',
    'override/main.css',
    'css/styles_shop__q_a48cd660.css',
    'css/_aux__q_a48cd660.css',
  ]);

  for (const value of stylePaths) {
    if (value.startsWith('_css_dev/') || superseded.has(value)) {
      issues.push(`superseded stylesheet is still loaded directly: ${value}`);
    }
  }
  for (const value of unique(stylePaths).sort()) {
    const count = occurrences(stylePaths, value);
    if (count > 1) issues.push(`duplicate eager stylesheet load (${count}x): ${value}`);
  }
}

function validateScripts(graph: LoadGraph, issues: string[]): void {
  const scriptPaths = graph.scripts.map(urlPath);
  for (const value of unique(scriptPaths).sort()) {
    const count = occurrences(scriptPaths, value);
    if (count > 1) issues.push(`duplicate eager script load (${count}x): ${value}`);
  }
}

function validateResponsiveMedia(html: string, sha: string, issues: string[]): void {
  if (html.includes('aniversario_banner_desktop_(1)1782398717_556.webp')) {
    issues.push('upstream banner remains referenced after responsive localization');
  }
  if (!html.includes(`_critical-media/desktop-banner.webp?v=${sha}`)) {
    issues.push('optimized desktop banner reference missing');
  }
  if (!html.includes(`_critical-media/mobile-banner.webp?v=${sha}`)) {
    issues.push('optimized mobile banner reference missing');
  }
}

export function validateSystemLoad(): void {
  const index = path.join(SITE, 'index.html');
  const sha = githubSha();
  assert(fs.existsSync(index), 'invalid system-load validation context');

  const html = read(index);
  const graph = collectLoadGraph(html);
  const issues: string[] = [];

  validateSystemLogo(html, graph, sha, issues);
  validateTraitMetadata(html, issues);
  for (const stale of SUPERSEDED_RASTERS) {
    if (html.includes(stale)) issues.push(`superseded CSS raster remains in final browser graph: ${stale}`);
  }
  validateRuntimeLoader(html, issues);
  for (const source of SUPERSEDED_SHOP_SCRIPTS) {
    if (html.includes(source)) issues.push(`superseded shop script is still referenced by browser load graph: ${source}`);
  }
  validateStyles(graph, issues);
  validateScripts(graph, issues);
  if (countLiteral(html, 'id="sc-pages-critical-css"') !== 1) {
    issues.push('critical inline CSS block missing or duplicated');
  }
  validateResponsiveMedia(html, sha, issues);

  if (issues.length) failList('System load validation failed', issues);
}
