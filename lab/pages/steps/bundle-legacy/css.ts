import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, ensureDir, githubSha, read, write } from '../../lib/core.js';
import { DATE_FLOW_CSS, LEGACY_STYLES, type BundleSource } from './config.js';
import { assertActiveStylesheet, linkPattern, removeCommentedAsset, sourceBlockPattern } from './html.js';

function rebaseCssUrls(source: string, bundle: string, content: string): string {
  return content.replace(
    /url\(\s*(["']?)(.*?)\1\s*\)/gi,
    (whole: string, quote: string, value: string) => {
      const raw = value.trim();
      if (!raw || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(raw)) return whole;

      const match = /^([^?#]+)([?#].*)?$/.exec(raw);
      const assetPath = match?.[1];
      if (!assetPath) return whole;

      const resolved = path.normalize(path.join(path.dirname(source), assetPath));
      const rebased = path.relative(path.dirname(bundle), resolved).split(path.sep).join('/');
      return `url(${quote}${rebased}${match?.[2] ?? ''}${quote})`;
    },
  );
}

function normalizeFontAwesome(content: string): string {
  const face = /@font-face\s*\{\s*font-family\s*:\s*['"]FontAwesome['"].*?\}/is;
  assert(face.test(content), 'Could not normalize Font Awesome @font-face exactly once');
  return content.replace(
    face,
    "@font-face{font-family:'FontAwesome';src:url('../fonts/fontawesome-webfont__q_fb3a7b16.woff2') format('woff2');font-weight:normal;font-style:normal;font-display:swap}",
  );
}

function normalizeSlickFont(content: string): string {
  const face = /@font-face\s*\{\s*font-family\s*:\s*['"]slick['"].*?\}/is;
  assert(face.test(content), 'Could not remove Slick @font-face');
  const withoutFace = content.replace(face, '');
  const normalized = withoutFace.replace(
    /font-family\s*:\s*['"]slick['"]\s*;/gi,
    'font-family: Arial, sans-serif;',
  );
  assert(normalized !== withoutFace, 'No Slick pseudo-element font declarations were normalized');
  return normalized;
}

function normalizeLegacyFonts(source: string, content: string): string {
  if (source === '_css_dev/font-awesome.min.css') return normalizeFontAwesome(content);
  if (source === '_css_dev/slick-theme.css') return normalizeSlickFont(content);
  return content;
}

function readStylesheetSource(relativePath: string, bundle: string): BundleSource {
  const source = path.join(SITE, relativePath);
  assert(fs.existsSync(source), `Missing legacy stylesheet: ${relativePath}`);

  let content = read(source).replace(/^\s*@charset\s+["'][^"']+["'];\s*/i, '');
  assert(!/@import\b/i.test(content), `Nested @import in ${relativePath}`);
  content = normalizeLegacyFonts(relativePath, content);
  return { path: relativePath, content: rebaseCssUrls(source, bundle, content) };
}

function sourceComment(source: BundleSource): string {
  return `/* origen: ${source.path} */\n${source.content.trimEnd()}`;
}

export function bundleLegacyCss(): void {
  const sha = githubSha();
  const indexFile = path.join(SITE, 'index.html');
  const bundleFile = path.join(SITE, '_pages', 'legacy.css');
  let html = read(indexFile);
  const output: string[] = [];

  for (const href of LEGACY_STYLES) html = removeCommentedAsset(html, 'link', href);

  LEGACY_STYLES.forEach((href, position) => {
    assertActiveStylesheet(html, href);
    output.push(sourceComment(readStylesheetSource(href, bundleFile)));
    html = html.replace(
      linkPattern(href),
      position === 0
        ? `<link href="_pages/legacy.css?v=${sha}" rel="stylesheet" media="all" type="text/css">`
        : '',
    );
  });

  ensureDir(path.dirname(bundleFile));
  write(bundleFile, `${output.join('\n\n')}\n`);
  write(indexFile, html);

  assert(html.split(`_pages/legacy.css?v=${sha}`).length - 1 === 1, 'Legacy CSS bundle link must appear exactly once');
  const bundle = read(bundleFile);
  assert((bundle.match(/^\/\* origen:/gm) ?? []).length === LEGACY_STYLES.length, 'Legacy CSS source count mismatch');
  assert(!/fontawesome-webfont\.(?:eot|ttf|svg)|fontawesome-webfont\.woff\?/i.test(bundle), 'Obsolete Font Awesome fallbacks remain');
  assert(!/url\([^)]*fonts\/slick\.(?:eot|woff|ttf|svg)/i.test(bundle), 'Missing Slick font URLs remain');
  assert(bundle.includes("font-family:'FontAwesome'") && bundle.includes('font-display:swap'), 'Font Awesome must use font-display:swap');
}

export function pruneDateFlowCss(bundleFile: string): void {
  for (const source of DATE_FLOW_CSS) {
    const pattern = sourceBlockPattern(source);
    const text = read(bundleFile);
    assert(pattern.test(text), `Expected bundled source block for ${source}`);
    write(bundleFile, text.replace(pattern, `/* origen: ${source} (omitido: flujo de fecha inactivo) */`));
  }
}
