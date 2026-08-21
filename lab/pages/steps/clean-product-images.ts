import path from 'node:path';
import { SITE, assert, read, write } from '../lib/core.js';

const IMG_SHOP_BACKGROUND_PROPERTIES = new Set([
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
]);

function splitDeclarations(style: string): string[] {
  const declarations: string[] = [];
  let start = 0;
  let quote = '';
  let escaped = false;
  let parenthesisDepth = 0;
  let inEntity = false;

  for (let index = 0; index < style.length; index += 1) {
    const character = style[index] ?? '';

    if (inEntity) {
      if (character === ';') inEntity = false;
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }

    if (character === '&') inEntity = true;
    else if (character === '"' || character === "'") quote = character;
    else if (character === '(') parenthesisDepth += 1;
    else if (character === ')' && parenthesisDepth > 0) parenthesisDepth -= 1;
    else if (character === ';' && parenthesisDepth === 0) {
      declarations.push(style.slice(start, index));
      start = index + 1;
    }
  }

  declarations.push(style.slice(start));
  return declarations;
}

function cleanInlineStyle(style: string): { readonly style: string; readonly changed: boolean } {
  const kept: string[] = [];
  let changed = false;

  for (const raw of splitDeclarations(style)) {
    const declaration = raw.trim();
    if (!declaration) continue;

    const separator = declaration.indexOf(':');
    assert(separator >= 0, `Malformed imgShop inline declaration before cleanup: ${declaration}`);
    const property = declaration.slice(0, separator).trim().toLowerCase();
    if (IMG_SHOP_BACKGROUND_PROPERTIES.has(property)) {
      changed = true;
      continue;
    }
    kept.push(declaration);
  }

  return { style: kept.join('; '), changed };
}

export function cleanProductImages(): void {
  const file = path.join(SITE, 'index.html');
  let cleaned = 0;
  const html = read(file).replace(
    /(<div\b(?=[^>]*\bclass="[^"]*\bimgShop\b[^"]*")[^>]*?)\sstyle="([^"]*)"([^>]*>)/gi,
    (full, prefix: string, inlineStyle: string, suffix: string) => {
      const result = cleanInlineStyle(inlineStyle);
      if (!result.changed) return full;

      cleaned += 1;
      const styleAttribute = result.style ? ` style="${result.style};"` : '';
      return `${prefix}${styleAttribute}${suffix}`;
    },
  );

  assert(cleaned > 0, 'No imgShop inline background styles were removed');
  assert(
    !/<div\b(?=[^>]*\bclass="[^"]*\bimgShop\b[^"]*")(?=[^>]*\bstyle="[^"]*background-(?:image|size|position|repeat)\s*:)[^>]*>/i.test(html),
    'An imgShop inline background style remains after cleanup',
  );
  assert(
    !/<div\b(?=[^>]*\bclass="[^"]*\bimgShop\b[^"]*")[^>]*\bstyle="\s*uploads_shop\//i.test(html),
    'Malformed imgShop URL-only style remains after cleanup',
  );
  write(file, html);
}
