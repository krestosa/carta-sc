import path from 'node:path';
import { SITE, assert, githubSha, read, write } from '../lib/core.js';

interface MutationResult {
  readonly html: string;
  readonly count: number;
}

interface AriaRule {
  readonly tag: string;
  readonly lookahead: string;
  readonly label: string;
}

const NORMALIZED_HEIGHT_PROPERTIES = new Set(['height', 'min-height']);
const ARIA_RULES: readonly AriaRule[] = [
  { tag: 'select', lookahead: '\\bname=["\']sucursalNews["\']', label: 'Espacio preferido' },
  { tag: 'input', lookahead: '\\bclass=["\'][^"\']*\\bnewsMail\\b[^"\']*["\']', label: 'Email para newsletter' },
  { tag: 'button', lookahead: '\\bclass=["\'][^"\']*\\bclose\\b[^"\']*["\']', label: 'Cerrar' },
  { tag: 'a', lookahead: '\\bclass=["\'][^"\']*\\bshopMenuRightIcon\\b[^"\']*["\']', label: 'Ver carrito' },
  { tag: 'a', lookahead: '\\bhref=["\']https://www\\.sushiclub\\.com\\.ar/pedidosonline["\']', label: 'Pedidos online de SushiClub' },
  { tag: 'a', lookahead: '\\bhref=["\'][^"\']*facebook\\.com/sushiclubargentina[^"\']*["\']', label: 'Facebook de SushiClub' },
  { tag: 'a', lookahead: '\\bhref=["\'][^"\']*instagram\\.com/SushiClub_ar[^"\']*["\']', label: 'Instagram de SushiClub' },
  { tag: 'a', lookahead: '\\bhref=["\'][^"\']*tiktok\\.com/@sushiclub_ar[^"\']*["\']', label: 'TikTok de SushiClub' },
  { tag: 'a', lookahead: '\\bhref=["\'][^"\']*pinterest\\.com/sushiclub[^"\']*["\']', label: 'Pinterest de SushiClub' },
];

function findMatchingDivClose(html: string, start: number): readonly [start: number, end: number] {
  const tags = /<div\b[^>]*>|<\/div\s*>/gi;
  tags.lastIndex = start;
  let depth = 0;
  let match: RegExpExecArray | null;

  while ((match = tags.exec(html))) {
    if (match[0].toLowerCase().startsWith('<div')) {
      depth += 1;
      continue;
    }
    depth -= 1;
    if (depth === 0) return [match.index, match.index + match[0].length];
  }

  throw new Error('Could not find matching </div> in captured snapshot markup');
}

function emptyDivContents(html: string, marker: string): string {
  const start = html.indexOf(marker);
  assert(start >= 0, `Could not find snapshot div marker: ${marker}`);
  const openEnd = html.indexOf('>', start);
  assert(openEnd >= 0, `Could not find end of opening div: ${marker}`);
  const [closeStart] = findMatchingDivClose(html, start);
  return `${html.slice(0, openEnd + 1)}${html.slice(closeStart)}`;
}

function removeDivBlock(html: string, marker: string): string {
  const start = html.indexOf(marker);
  assert(start >= 0, `Could not find snapshot div block marker: ${marker}`);
  const [, end] = findMatchingDivClose(html, start);
  return `${html.slice(0, start)}${html.slice(end)}`;
}

function addAriaLabel(html: string, rule: AriaRule): MutationResult {
  const pattern = new RegExp(`<${rule.tag}\\b(?=[^>]*${rule.lookahead})[^>]*>`, 'gi');
  let count = 0;
  const result = html.replace(pattern, (tag) => {
    if (/\baria-label\s*=/i.test(tag)) return tag;
    count += 1;
    const close = tag.endsWith('/>') ? '/>' : '>';
    return `${tag.slice(0, -close.length).trimEnd()} aria-label="${rule.label}"${close}`;
  });
  return { html: result, count };
}

function stripInlineProperties(
  html: string,
  className: string,
  properties: ReadonlySet<string>,
): MutationResult {
  const pattern = new RegExp(`<div\\b(?=[^>]*\\bclass=["'][^"']*\\b${className}\\b[^"']*["'])[^>]*>`, 'gi');
  let count = 0;

  const result = html.replace(pattern, (tag) => {
    const style = /\s+style=["']([^"']*)["']/i.exec(tag);
    if (!style?.[1] || style.index === undefined) return tag;

    const kept: string[] = [];
    let removed = false;
    for (const rawDeclaration of style[1].split(';')) {
      const declaration = rawDeclaration.trim();
      if (!declaration) continue;
      const separator = declaration.indexOf(':');
      const property = separator >= 0 ? declaration.slice(0, separator).trim().toLowerCase() : '';
      if (properties.has(property)) {
        removed = true;
        continue;
      }
      kept.push(declaration);
    }
    if (!removed) return tag;

    count += 1;
    const replacement = kept.length ? ` style="${kept.join('; ')}"` : '';
    return `${tag.slice(0, style.index)}${replacement}${tag.slice(style.index + style[0].length)}`;
  });

  return { html: result, count };
}

function ensureImageDimensions(
  html: string,
  lookahead: string,
  width: number,
  height: number,
  force = false,
): MutationResult {
  const pattern = new RegExp(`<img\\b(?=[^>]*${lookahead})[^>]*>`, 'gi');
  let count = 0;

  const result = html.replace(pattern, (tag) => {
    let output = tag;
    if (force) {
      output = output
        .replace(/\s+width\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\s+height\s*=\s*["'][^"']*["']/gi, '');
    }

    const close = output.endsWith('/>') ? '/>' : '>';
    let body = output.slice(0, -close.length).trimEnd();
    if (force || !/\bwidth\s*=/i.test(output)) body += ` width="${width}"`;
    if (force || !/\bheight\s*=/i.test(output)) body += ` height="${height}"`;
    output = `${body}${close}`;

    if (output !== tag) count += 1;
    return output;
  });

  return { html: result, count };
}

function repairAnchorIds(html: string): MutationResult {
  const pattern = /<a\b(?=[^>]*\bname="(anchor[^"]*)")[^>]*>/gi;
  let count = 0;

  const result = html.replace(pattern, (tag, name: string) => {
    const id = /\bid="([^"]*)"/i.exec(tag);
    if (id?.[1] === name) return tag;
    count += 1;

    if (id?.index !== undefined) {
      return `${tag.slice(0, id.index)}id="${name}"${tag.slice(id.index + id[0].length)}`;
    }
    return `${tag.slice(0, -1).trimEnd()} id="${name}">`;
  });

  return { html: result, count };
}

function removeExactlyOne(html: string, pattern: RegExp, label: string): string {
  let count = 0;
  const result = html.replace(pattern, () => {
    count += 1;
    return '';
  });
  assert(count === 1, `Expected one ${label}, found ${count}`);
  return result;
}

function restoreRemoteRecaptcha(html: string): string {
  let count = 0;
  const result = html.replace(
    /<script\b[^>]*\bsrc=["']_external\/www\.google\.com\/recaptcha\/api\.js["'][^>]*>\s*<\/script>/i,
    () => {
      count += 1;
      return '<script src="https://www.google.com/recaptcha/api.js" async defer></script>';
    },
  );
  assert(count === 1, `Expected one local captured reCAPTCHA api.js reference, found ${count}`);
  return result;
}

function verifyDimensions(html: string): void {
  const normalized = /<div\b(?=[^>]*\bclass=["'][^"']*\bnormCols\b[^"']*["'])[^>]*>/i.exec(html)?.[0];
  assert(normalized && !/\b(?:height|min-height)\s*:/i.test(normalized), 'Captured normCols height remains after snapshot cleanup');

  const banner = /<img\b(?=[^>]*\bclass=["'][^"']*\bimgBannerShop\b)[^>]*>/i.exec(html)?.[0];
  assert(
    banner && /\bwidth=["']1500["']/i.test(banner) && /\bheight=["']157["']/i.test(banner),
    'Banner intrinsic dimensions are missing after snapshot cleanup',
  );

  const tiktokImages = html.match(/<img\b(?=[^>]*icons8-tiktok-32\.png)[^>]*>/gi) ?? [];
  assert(
    tiktokImages.length > 0
      && tiktokImages.every((tag) => /\bwidth=["']22["']/i.test(tag) && /\bheight=["']22["']/i.test(tag)),
    'TikTok 22x22 intrinsic dimensions are missing after snapshot cleanup',
  );
}

function verifyRuntimeCleanup(html: string): void {
  assert(
    (html.match(/<script\b[^>]*\bsrc=["']js\/jquery-2\.1\.0\.min\.js["'][^>]*>\s*<\/script>/gi) ?? []).length === 1,
    'Pages artifact must retain exactly one explicit jQuery 2.1.0 script tag',
  );
  assert(!/https:\/\/www\.googletagmanager\.com\/gtm\.js\?id=GTM-WQPLGX9/i.test(html), 'Captured GTM runtime tag remains after cleanup');
  assert(html.includes('GTM-WQPLGX9') && html.includes('googletagmanager.com/gtm.js?id='), 'Canonical GTM bootstrap snippet is missing after cleanup');
  assert(
    (html.match(/<script\b[^>]*\bsrc=["']https:\/\/www\.google\.com\/recaptcha\/api\.js["'][^>]*>\s*<\/script>/gi) ?? []).length === 1,
    'Official remote reCAPTCHA api.js script must remain exactly once',
  );
  assert(!html.includes('_external/www.google.com/recaptcha/api.js'), 'Broken local reCAPTCHA api.js reference remains after cleanup');
  assert(
    (html.match(/<div class="g-recaptcha"\s+data-sitekey="[^"]+">\s*<\/div>/gi) ?? []).length === 1,
    'Clean reCAPTCHA host with sitekey must remain exactly once',
  );

  for (const stale of ['recaptcha__en.js', '/recaptcha/api2/anchor?', '/recaptcha/api2/bframe?', 'g-recaptcha-bubble-arrow']) {
    assert(!html.includes(stale), `Captured reCAPTCHA runtime markup remains after cleanup: ${stale}`);
  }
}

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
  verifyDimensions(html);

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
  verifyRuntimeCleanup(html);

  write(file, html);
  console.log(
    `Cleaned snapshot: norm=${normalized.count}, dimensions=${banner.count + tiktok.count}, anchors=${anchors.count}, aria=${ariaCount}`,
  );
}
