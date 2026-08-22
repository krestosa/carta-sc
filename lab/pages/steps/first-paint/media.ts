import path from 'node:path';
import { URL } from 'node:url';
import { SITE, assert, read, write } from '../../lib/core.js';

interface ProductImageMatchGroups {
  readonly divAttrs?: string;
  readonly imgAttrs?: string;
  readonly close?: string;
}

const PRODUCT_RUNTIME_CLASSES = new Set([
  'imgLiquid',
  'imgLiquid_bgSize',
  'imgLiquid_ready',
  'imgLiquid_error',
]);
const STRIPPED_LOGO_STYLE_PROPERTIES = new Set(['margin-left', 'transform']);
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const CRITICAL_MEDIA_MAX_BYTES = 3_000_000;
const DOWNLOAD_ATTEMPTS = 3;
const DOWNLOAD_TIMEOUT_MS = 10_000;
const DOWNLOAD_RETRY_MS = 600;
const MOBILE_LOGO_SIZE = { width: 333, height: 100 } as const;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function cleanInlineDisplay(attrs: string): string {
  const style = /\s+style=["'](?<value>[^"']*)["']/i.exec(attrs);
  const value = style?.groups?.value;
  if (!value || style.index === undefined) return attrs;

  const rules = value
    .split(';')
    .map((rule) => rule.trim())
    .filter((rule) => rule && !/^display\s*:\s*none$/i.test(rule));
  const replacement = rules.length ? ` style="${rules.join('; ')}"` : '';
  return `${attrs.slice(0, style.index)}${replacement}${attrs.slice(style.index + style[0].length)}`;
}

function normalizeProductContainerClasses(attrs: string): string {
  const classAttribute = /class=["'](?<classes>[^"']*)["']/i.exec(attrs);
  const classes = classAttribute?.groups?.classes;
  if (!classes || classAttribute.index === undefined) return attrs;

  const normalized = classes
    .split(/\s+/)
    .filter((className) => className && !PRODUCT_RUNTIME_CLASSES.has(className))
    .join(' ');
  return `${attrs.slice(0, classAttribute.index)}class="${normalized}"${attrs.slice(classAttribute.index + classAttribute[0].length)}`;
}

function hardLazyImageAttributes(attrs: string): string {
  const source = /\s+(?:data-sc-src|src)=["'](?<src>[^"']+)["']/i.exec(attrs)?.groups?.src;
  if (!source) return attrs;

  return attrs
    .replace(/\s+(?:data-sc-src|src)=["'][^"']+["']/gi, '')
    .replace(/\s+(?:loading|decoding|fetchpriority|data-sc-lcp-product)=["'][^"']*["']/gi, '')
    .concat(` data-sc-src="${source}" loading="lazy" decoding="async" fetchpriority="low"`);
}

export function hardLazy(html: string): { readonly html: string; readonly count: number } {
  let count = 0;
  const result = html.replace(
    /(?<open><div\b(?<divAttrs>[^>]*class=["'][^"']*\bimgShop\b[^"']*["'][^>]*)>\s*<img\b)(?<imgAttrs>[^>]*)(?<close>>)/gi,
    (_match, ...args: unknown[]) => {
      const groups = args.at(-1) as ProductImageMatchGroups | undefined;
      count += 1;

      const divAttrs = normalizeProductContainerClasses(groups?.divAttrs ?? '');
      const imgAttrs = hardLazyImageAttributes(cleanInlineDisplay(groups?.imgAttrs ?? ''));
      return `<div${divAttrs}>\n<img${imgAttrs}${groups?.close ?? '>'}`;
    },
  );

  assert(count >= 100, 'product images not found');
  return { html: result, count };
}

function catalogToolsShell(): string {
  const source = read(path.join(SITE, 'override', 'components', 'catalog-tools', 'catalog-tools.html'));
  const template = /<template\b[^>]*data-sc-template=["']catalog-tools["'][^>]*>(?<body>[\s\S]*?)<\/template>/i.exec(source);
  const body = template?.groups?.body;
  assert(body, 'catalog-tools template missing');

  let shell = body
    .trim()
    .replace('<section class="sc-catalog-tools"', '<section class="sc-catalog-tools" data-sc-static-shell="1"');
  const searchResultsMarker = '<div class="sc-catalog-search-results"';
  assert(shell.includes(searchResultsMarker), 'catalog-tools search-results marker missing');
  shell = shell.replace(
    searchResultsMarker,
    `<div class="sc-trait-reference-placeholder" aria-hidden="true"></div>\n    ${searchResultsMarker}`,
  );
  return shell;
}

export function injectCatalogToolsShell(html: string): string {
  if (/<section\b[^>]*class=["'][^"']*\bsc-catalog-tools\b/i.test(html)) return html;

  const container = /(<div\b[^>]*class=["'][^"']*\bcontainerShop\b[^"']*["'][^>]*>)/i.exec(html);
  assert(container?.index !== undefined, 'catalog container not found for static tools shell');
  const openingTag = container[1] ?? container[0];
  return `${html.slice(0, container.index)}${openingTag}\n${catalogToolsShell()}\n${html.slice(container.index + container[0].length)}`;
}

async function fetchCriticalImage(url: string): Promise<Buffer> {
  let lastError: unknown;

  for (let attempt = 0; attempt < DOWNLOAD_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      });
      assert(response.ok, `HTTP ${response.status}`);

      const contentType = response.headers.get('content-type') ?? '';
      const data = Buffer.from(await response.arrayBuffer());
      assert(
        data.length > 0 && data.length <= CRITICAL_MEDIA_MAX_BYTES && contentType.startsWith('image/'),
        `critical asset invalid: type=${contentType} bytes=${data.length}`,
      );
      return data;
    } catch (error: unknown) {
      lastError = error;
      if (attempt + 1 < DOWNLOAD_ATTEMPTS) await delay(DOWNLOAD_RETRY_MS * (attempt + 1));
    }
  }

  throw new Error(`critical media mirror failed for ${url}: ${errorMessage(lastError)}`);
}

function safeImageExtension(url: string): string {
  const extension = path.extname(new URL(url).pathname).toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.has(extension) ? extension : '.bin';
}

function cleanLogoStyle(attrs: string): string {
  const style = /\s+style=["'](?<value>[^"']*)["']/i.exec(attrs);
  const value = style?.groups?.value;
  if (!value || style.index === undefined) return attrs;

  const kept = value
    .split(';')
    .map((rule) => rule.trim())
    .filter(Boolean)
    .filter((rule) => {
      const property = (rule.split(':', 1)[0] ?? '').trim().toLowerCase();
      return !STRIPPED_LOGO_STYLE_PROPERTIES.has(property);
    });
  const replacement = kept.length ? ` style="${kept.join('; ')}"` : '';
  return `${attrs.slice(0, style.index)}${replacement}${attrs.slice(style.index + style[0].length)}`;
}

function criticalLogoAttributes(attrs: string, asset: string): string {
  return cleanLogoStyle(attrs)
    .replace(/\s+(?:width|height|loading|decoding|fetchpriority|data-sc-lcp-logo)=["'][^"']*["']/gi, '')
    .replace(/\bsrc=["'][^"']+["']/i, `src="${asset}"`)
    .concat(
      ` width="${MOBILE_LOGO_SIZE.width}" height="${MOBILE_LOGO_SIZE.height}" loading="eager" decoding="async" fetchpriority="high" data-sc-lcp-logo="1"`,
    );
}

export async function mirrorCriticalMedia(html: string, sha: string): Promise<string> {
  const logo = /<img\b(?<attrs>[^>]*\bsrc=["'](?<url>[^"']*web-sushiclub2_black_m2\.png)["'][^>]*)>/i.exec(html);
  const sourceUrl = logo?.groups?.url;
  const sourceAttrs = logo?.groups?.attrs;
  assert(sourceUrl && sourceAttrs && logo.index !== undefined, 'mobile SushiClub logo missing before mirror');

  const relativePath = `_critical-media/mobile-logo${safeImageExtension(sourceUrl)}`;
  write(path.join(SITE, relativePath), await fetchCriticalImage(sourceUrl));
  const asset = `${relativePath}?v=${sha}`;
  const replacement = `<img${criticalLogoAttributes(sourceAttrs, asset)}>`;
  let result = `${html.slice(0, logo.index)}${replacement}${html.slice(logo.index + logo[0].length)}`;

  const head = /<head\b[^>]*>/i.exec(result);
  assert(head?.index !== undefined, 'head missing');
  const hints = [
    `<link rel="preload" as="image" href="${asset}" fetchpriority="high" media="(max-width: 992px)">`,
    '<link rel="preconnect" href="https://www.sushiclub.com.ar" crossorigin>',
  ].join('\n');
  const insertionPoint = head.index + head[0].length;
  result = `${result.slice(0, insertionPoint)}\n${hints}\n${result.slice(insertionPoint)}`;
  return result;
}
