import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, read, walk, write } from '../lib/core.js';

interface DownloadResponse {
  readonly bytes: Buffer;
  readonly contentType: string;
}

interface MirrorFailure {
  readonly url: string;
  readonly reason: string;
}

interface RewriteStats {
  filesChanged: number;
  replacements: number;
  canonicalized: number;
}

const ORIGIN = 'https://www.sushiclub.com.ar/';
const ASSET_ROOTS = ['uploads_shop', 'uploads', 'gfx', 'fonts', 'fuentes', 'iconos'] as const;
const TEXT_SUFFIXES = new Set(['.html', '.css', '.js']);
const FORBIDDEN_SUFFIXES = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.avif',
  '.eot', '.woff', '.woff2', '.ttf', '.otf',
  '.mp4', '.webm', '.mov', '.m4v', '.avi', '.pdf',
]);
const MIRRORED_FONT_SUFFIXES = new Set(['.woff', '.woff2', '.ttf', '.otf']);
const REQUIRED_FONTS = new Set([
  '_remote-assets/fuentes/AcuminPro-Regular.woff2',
  '_remote-assets/fuentes/AcuminPro-Semibold.woff2',
  '_remote-assets/fonts/fontawesome-webfont.woff2',
  '_remote-assets/fonts/glyphicons-halflings-regular.woff',
  '_remote-assets/fonts/hnl.woff',
  '_remote-assets/fonts/bariol_bold-webfont.woff',
  '_remote-assets/fonts/bariol_light-webfont.woff',
  '_remote-assets/fonts/bariol_regular-webfont.woff',
  '_remote-assets/fonts/websymbolsligaregular.woff',
  '_remote-assets/fonts/PlutoBold.otf',
]);
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36';
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_FONT_BYTES = 8 * 1024 * 1024;

const rootGroup = ASSET_ROOTS.join('|');
const assetDirectoryPattern = new RegExp(
  `(?<![A-Za-z0-9:/])(?:\\.\\./|\\./|/)*(?<root>${rootGroup})/`,
  'gi',
);
const faviconPattern = /(?<![A-Za-z0-9:/])(?:\.\.\/|\.\/|\/)*favicon\.ico\b/gi;
const snapshotSuffixPattern = /(?:__q_[0-9a-f]{8}|__\d+)(?=\.(?:png|jpe?g|gif|webp|svg|ico|bmp|avif|eot|woff2?|ttf|otf|mp4|webm|mov|m4v|avi|pdf)\b)/gi;
const remoteFontPattern = /https:\/\/www\.sushiclub\.com\.ar\/(?:fonts|fuentes)\/[^"'\s()<>?#]+?\.(?:woff2?|ttf|otf)(?:[?#][^"'\s()<>]*)?/gi;

async function request(url: string): Promise<DownloadResponse> {
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      referer: `${ORIGIN}carta_delivery.php`,
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    contentType: (response.headers.get('content-type') ?? '').toLowerCase(),
  };
}

function repositoryStaticAssets(): string[] {
  return walk(process.cwd()).filter((file) => {
    if (file.includes(`${path.sep}.git${path.sep}`)) return false;
    if (file.includes(`${path.sep}.pages-site${path.sep}`)) return false;
    if (file.includes(`${path.sep}node_modules${path.sep}`)) return false;
    return FORBIDDEN_SUFFIXES.has(path.extname(file).toLowerCase());
  });
}

function textFiles(): string[] {
  return walk(SITE).filter((file) => TEXT_SUFFIXES.has(path.extname(file).toLowerCase()));
}

function rewriteStaticReferences(files: readonly string[]): RewriteStats {
  const stats: RewriteStats = { filesChanged: 0, replacements: 0, canonicalized: 0 };

  for (const file of files) {
    const source = read(file);
    let rewritten = source.replace(assetDirectoryPattern, (full, ...args: unknown[]) => {
      const groups = args.at(-1) as { root?: string } | undefined;
      stats.replacements += 1;
      return `${ORIGIN}${groups?.root ?? full}/`;
    });
    rewritten = rewritten.replace(faviconPattern, () => {
      stats.replacements += 1;
      return `${ORIGIN}favicon.ico`;
    });
    rewritten = rewritten.replace(snapshotSuffixPattern, () => {
      stats.canonicalized += 1;
      return '';
    });

    if (rewritten === source) continue;
    write(file, rewritten);
    stats.filesChanged += 1;
  }
  return stats;
}

async function verifyCriticalImages(): Promise<void> {
  for (const url of [
    `${ORIGIN}gfx/web-sushiclub2_black_m2.png`,
    `${ORIGIN}gfx/web-sushiclub2_black.png`,
  ]) {
    const response = await request(url);
    assert(
      response.contentType.startsWith('image/'),
      `Critical SushiClub image is not usable: type=${response.contentType || '(missing)'}, url=${url}`,
    );
  }
}

function remoteFontUrls(files: readonly string[]): Set<string> {
  const urls = new Set<string>();
  for (const file of files) {
    for (const match of read(file).matchAll(remoteFontPattern)) {
      if (match[0]) urls.add(match[0]);
    }
  }
  return urls;
}

function mirrorTarget(sourceUrl: string): { readonly relative: string; readonly absolute: string } {
  const parsed = new URL(sourceUrl);
  const relative = parsed.pathname.replace(/^\//, '');
  const absolute = path.join(SITE, '_remote-assets', relative);
  assert(
    relative.startsWith('fonts/') || relative.startsWith('fuentes/'),
    `Refusing unexpected mirrored font path: ${relative}`,
  );
  assert(
    MIRRORED_FONT_SUFFIXES.has(path.extname(absolute).toLowerCase()),
    `Refusing unexpected mirrored font extension: ${absolute}`,
  );
  return { relative, absolute };
}

function fontCandidates(sourceUrl: string): string[] {
  const parsed = new URL(sourceUrl);
  parsed.search = '';
  parsed.hash = '';
  const canonical = parsed.toString();
  return canonical === sourceUrl ? [sourceUrl] : [sourceUrl, canonical];
}

async function downloadFont(sourceUrl: string): Promise<{ readonly payload?: Buffer; readonly error: string }> {
  let lastError = '';
  for (const candidate of fontCandidates(sourceUrl)) {
    try {
      const response = await request(candidate);
      assert(response.bytes.length > 0, 'empty response');
      assert(response.bytes.length <= MAX_FONT_BYTES, 'response is unexpectedly large');
      const prefix = response.bytes.subarray(0, 512).toString('utf8').toLowerCase();
      assert(
        !prefix.includes('<html') && !response.contentType.startsWith('text/html'),
        'response is HTML, not a font',
      );
      return { payload: response.bytes, error: '' };
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  return { error: lastError };
}

async function mirrorFonts(urls: ReadonlySet<string>): Promise<{
  readonly downloaded: ReadonlyMap<string, string>;
  readonly targets: ReadonlySet<string>;
  readonly failures: readonly MirrorFailure[];
  readonly bytesTotal: number;
}> {
  const downloaded = new Map<string, string>();
  const targets = new Set<string>();
  const failures: MirrorFailure[] = [];
  let bytesTotal = 0;

  for (const sourceUrl of [...urls].sort()) {
    const target = mirrorTarget(sourceUrl).absolute;
    if (targets.has(target)) {
      downloaded.set(sourceUrl, target);
      continue;
    }

    const result = await downloadFont(sourceUrl);
    if (!result.payload) {
      failures.push({ url: sourceUrl, reason: result.error });
      continue;
    }

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, result.payload);
    targets.add(target);
    downloaded.set(sourceUrl, target);
    bytesTotal += result.payload.length;
  }

  return { downloaded, targets, failures, bytesTotal };
}

function rewriteMirroredFontReferences(files: readonly string[], downloaded: ReadonlyMap<string, string>): void {
  const replacements = [...downloaded.entries()].sort((left, right) => right[0].length - left[0].length);
  for (const file of files) {
    let content = read(file);
    for (const [url, target] of replacements) {
      const relative = path.relative(path.dirname(file), target).split(path.sep).join('/');
      content = content.split(url).join(relative);
    }
    write(file, content);
  }
}

function inspectGeneratedAssets(): { readonly mirrored: readonly string[]; readonly unexpected: readonly string[] } {
  const mirrored: string[] = [];
  const unexpected: string[] = [];

  for (const file of walk(SITE)) {
    if (!FORBIDDEN_SUFFIXES.has(path.extname(file).toLowerCase())) continue;
    const relative = path.relative(SITE, file).split(path.sep).join('/');
    const inFontMirror = relative.startsWith('_remote-assets/fonts/') || relative.startsWith('_remote-assets/fuentes/');
    if (inFontMirror && MIRRORED_FONT_SUFFIXES.has(path.extname(file).toLowerCase())) mirrored.push(relative);
    else unexpected.push(relative);
  }
  return { mirrored, unexpected };
}

function verifyCriticalFonts(files: readonly string[], mirrored: readonly string[]): void {
  const mirroredSet = new Set(mirrored);
  const missing = [...REQUIRED_FONTS].filter((font) => !mirroredSet.has(font));
  assert(missing.length === 0, `Critical mirrored font(s) missing: ${missing.join(', ')}`);

  const criticalNames = new Set([...REQUIRED_FONTS].map((font) => path.basename(font).toLowerCase()));
  const remaining: Array<[file: string, url: string]> = [];
  for (const file of files) {
    for (const match of read(file).matchAll(remoteFontPattern)) {
      const url = match[0];
      if (url && criticalNames.has(path.basename(new URL(url).pathname).toLowerCase())) {
        remaining.push([path.relative(SITE, file), url]);
      }
    }
  }
  assert(remaining.length === 0, `Critical cross-origin font reference(s) remain: ${JSON.stringify(remaining.slice(0, 10))}`);
}

function verifyNoSnapshotReferences(files: readonly string[]): void {
  const localReferences: string[] = [];
  const snapshotReferences: string[] = [];

  for (const file of files) {
    const content = read(file);
    const relative = path.relative(SITE, file);
    assetDirectoryPattern.lastIndex = 0;
    faviconPattern.lastIndex = 0;
    snapshotSuffixPattern.lastIndex = 0;
    if (assetDirectoryPattern.test(content) || faviconPattern.test(content)) localReferences.push(relative);
    if (snapshotSuffixPattern.test(content)) snapshotReferences.push(relative);
  }

  assert(localReferences.length === 0, `Local static asset reference(s) remain: ${localReferences.join(', ')}`);
  assert(snapshotReferences.length === 0, `Snapshot-only static asset filename(s) remain: ${snapshotReferences.join(', ')}`);
}

export async function externalizeStaticAssets(): Promise<void> {
  assert(fs.existsSync(SITE), '.pages-site does not exist');
  const sourceAssets = repositoryStaticAssets();
  assert(
    sourceAssets.length === 0,
    `Static asset files are forbidden in the repository: ${sourceAssets.slice(0, 20).join(', ')}`,
  );

  const files = textFiles();
  const rewriteStats = rewriteStaticReferences(files);
  assert(rewriteStats.replacements > 0, 'No static asset references were externalized');
  assert(rewriteStats.canonicalized > 0, 'Expected captured snapshot asset variants to be canonicalized');
  await verifyCriticalImages();

  const fontUrls = remoteFontUrls(files);
  assert(fontUrls.size > 0, 'No modern SushiClub font URLs were found to mirror');
  const mirrors = await mirrorFonts(fontUrls);
  rewriteMirroredFontReferences(files, mirrors.downloaded);

  const generated = inspectGeneratedAssets();
  assert(
    generated.unexpected.length === 0,
    `Unexpected static asset files remain in Pages artifact: ${generated.unexpected.slice(0, 20).join(', ')}`,
  );
  assert(
    generated.mirrored.length === mirrors.targets.size,
    'Mirrored SushiClub font count does not match downloaded font set',
  );
  verifyCriticalFonts(files, generated.mirrored);
  verifyNoSnapshotReferences(files);

  if (mirrors.failures.length) {
    console.log(`Skipped ${mirrors.failures.length} unavailable optional modern font fallback URL(s).`);
  }
  console.log(
    `Externalized ${rewriteStats.replacements} static asset reference(s) across ${rewriteStats.filesChanged} file(s) to ${ORIGIN}; `
      + `canonicalized ${rewriteStats.canonicalized} snapshot-only asset path(s).`,
  );
  console.log(
    `Mirrored ${generated.mirrored.length} modern font file(s), ${mirrors.bytesTotal} bytes, from SushiClub into the generated Pages artifact only.`,
  );
}
