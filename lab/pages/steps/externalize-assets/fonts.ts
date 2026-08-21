import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, read, walk, write } from '../../lib/core.js';
import {
  FORBIDDEN_SUFFIXES,
  MAX_FONT_BYTES,
  MIRRORED_FONT_SUFFIXES,
  REQUIRED_FONTS,
  remoteFontPattern,
  type MirrorFailure,
  type MirrorResult,
} from './config.js';
import { requestAsset } from './network.js';

export function remoteFontUrls(files: readonly string[]): Set<string> {
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
      const response = await requestAsset(candidate);
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

export async function mirrorFonts(urls: ReadonlySet<string>): Promise<MirrorResult> {
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

export function rewriteMirroredFontReferences(files: readonly string[], downloaded: ReadonlyMap<string, string>): void {
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

export function inspectGeneratedAssets(): { readonly mirrored: readonly string[]; readonly unexpected: readonly string[] } {
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

export function verifyCriticalFonts(files: readonly string[], mirrored: readonly string[]): void {
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
