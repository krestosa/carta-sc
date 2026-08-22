import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, read, write } from '../../lib/core.js';

const CSS_IMPORT = /^\s*@import\s+["'](?<path>\.\/[^"']+)\?v=unversioned["'];\s*$/gm;

function rebaseCssUrls(bundle: string, source: string, content: string): string {
  return content.replace(
    /url\(\s*(?<quote>["']?)(?<value>.*?)(?:\k<quote>)\s*\)/gi,
    (full: string, ...args: unknown[]) => {
      const groups = args.at(-1) as { quote?: string; value?: string } | undefined;
      const value = (groups?.value ?? '').trim();
      const quote = groups?.quote ?? '';
      if (!value || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(value)) return full;

      const parts = /^(?<path>[^?#]+)(?<suffix>[?#].*)?$/.exec(value);
      if (!parts?.groups?.path) return full;
      const resolved = path.normalize(path.join(path.dirname(source), parts.groups.path));
      const rebased = path.relative(path.dirname(bundle), resolved).split(path.sep).join('/');
      return `url(${quote}${rebased}${parts.groups.suffix ?? ''}${quote})`;
    },
  );
}

export function bundleOverrideCss(): void {
  const file = path.join(SITE, 'override/main.css');
  const manifest = read(file);
  const imports = [...manifest.matchAll(CSS_IMPORT)]
    .map((match) => match.groups?.path)
    .filter((value): value is string => Boolean(value));

  assert(imports.length > 0, 'No CSS imports were found to bundle');
  assert(new Set(imports).size === imports.length, 'Duplicate CSS imports found while bundling');
  assert(
    manifest.replace(CSS_IMPORT, '').trim() === '',
    'override/main.css contains non-import content; refusing unsafe bundle',
  );

  const chunks = imports.map((importPath) => {
    const source = path.join(path.dirname(file), importPath.slice(2));
    assert(fs.existsSync(source), `Missing CSS source while bundling: ${source}`);
    const content = read(source);
    assert(!content.includes('@import'), `Nested CSS import found while bundling: ${source}`);
    return `/* origen: ${importPath} */\n${rebaseCssUrls(file, source, content).trimEnd()}`;
  });

  write(file, `${chunks.join('\n\n')}\n`);
}

export function verifyBundledCss(): void {
  assert(!read(path.join(SITE, 'override/main.css')).includes('@import'), 'CSS imports remain in bundled Pages artifact');
}
