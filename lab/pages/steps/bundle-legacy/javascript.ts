import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, ensureDir, githubSha, read, write } from '../../lib/core.js';
import {
  DATE_FLOW_JS,
  LEGACY_SCRIPTS,
  SHOP_SCRIPTS,
  type BundleSource,
  type Externalizer,
} from './config.js';
import {
  assertActiveScript,
  removeCommentedAsset,
  scriptPattern,
  scriptPositions,
  sourceBlockPattern,
} from './html.js';
import { pruneDateFlowCss } from './css.js';

function readScriptSource(relativePath: string): BundleSource {
  const source = path.join(SITE, relativePath);
  assert(fs.existsSync(source), `Missing legacy script: ${relativePath}`);
  const content = read(source);
  assert(
    !/\bdocument\.currentScript\b|\bimport\.meta\b/.test(content),
    `Per-file semantics in ${relativePath}`,
  );
  return { path: relativePath, content };
}

function sourceComment(source: BundleSource): string {
  return `/* origen: ${source.path} */\n${source.content.trimEnd()}`;
}

function scriptSourceComment(source: BundleSource): string {
  return `${sourceComment(source)}\n;`;
}

function pruneSourceBlock(file: string, source: string): void {
  const pattern = sourceBlockPattern(source);
  const text = read(file);
  assert(pattern.test(text), `Expected bundled source block for ${source}`);
  write(file, text.replace(pattern, `/* origen: ${source} (omitido: flujo de fecha inactivo) */`));
}

function dateFlowPresent(html: string): boolean {
  return /\bid=["']dateInit["']/i.test(html) || /\bshopfunc_(?:start|submit)_init\s*\(/.test(html);
}

function normalizeShopSource(source: BundleSource, hasDateFlow: boolean): BundleSource {
  if (hasDateFlow || source.path !== 'js/main_shop__q_a48cd660.js') return source;

  const normalized = source.content.replace(
    /^([\t ]*)moment\.locale\(\s*['"]es['"]\s*\);\s*$/m,
    "$1if (window.moment) moment.locale('es');",
  );
  assert(normalized !== source.content, 'Expected one moment.locale call');
  return { ...source, content: normalized };
}

export function bundleLegacyJs(): void {
  const sha = githubSha();
  const indexFile = path.join(SITE, 'index.html');
  const bundleFile = path.join(SITE, '_pages', 'legacy.js');
  let html = read(indexFile);
  const output: string[] = [];

  for (const src of LEGACY_SCRIPTS) html = removeCommentedAsset(html, 'script', src);

  LEGACY_SCRIPTS.forEach((src, position) => {
    assertActiveScript(html, src);
    output.push(scriptSourceComment(readScriptSource(src)));
    html = html.replace(
      scriptPattern(src),
      position === 0 ? `<script src="_pages/legacy.js?v=${sha}" type="text/javascript"></script>` : '',
    );
  });

  ensureDir(path.dirname(bundleFile));
  write(bundleFile, `${output.join('\n\n')}\n`);
  write(indexFile, html);
  assert((read(bundleFile).match(/^\/\* origen:/gm) ?? []).length === LEGACY_SCRIPTS.length, 'Legacy JS source count mismatch');
}

export async function bundleShopJs(externalize: Externalizer): Promise<void> {
  const sha = githubSha();
  const indexFile = path.join(SITE, 'index.html');
  const bundleFile = path.join(SITE, '_pages', 'shop.js');
  const legacyJs = path.join(SITE, '_pages', 'legacy.js');
  const legacyCss = path.join(SITE, '_pages', 'legacy.css');
  let html = read(indexFile);
  const output: string[] = [];
  const hasDateFlow = dateFlowPresent(html);
  const positions = scriptPositions(html, SHOP_SCRIPTS);

  const first = positions[0];
  const second = positions[1];
  assert(first && second, 'Shop script positions are incomplete');
  assert(!/\S/.test(html.slice(first.end, second.start)), 'Unexpected markup between shop scripts');

  SHOP_SCRIPTS.forEach((src, position) => {
    assertActiveScript(html, src);
    output.push(scriptSourceComment(normalizeShopSource(readScriptSource(src), hasDateFlow)));
    html = html.replace(
      scriptPattern(src),
      position === 0 ? `<script src="_pages/shop.js?v=${sha}" type="text/javascript"></script>` : '',
    );
  });

  ensureDir(path.dirname(bundleFile));
  write(bundleFile, `${output.join('\n\n')}\n`);
  write(indexFile, html);

  if (!hasDateFlow) {
    for (const source of DATE_FLOW_JS) pruneSourceBlock(legacyJs, source);
    pruneDateFlowCss(legacyCss);
  }

  assert((read(bundleFile).match(/^\/\* origen:/gm) ?? []).length === SHOP_SCRIPTS.length, 'Shop JS source count mismatch');
  await externalize();
}
