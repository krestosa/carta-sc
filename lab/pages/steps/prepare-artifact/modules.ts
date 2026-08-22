import path from 'node:path';
import { SITE, assert, read, walk, write } from '../../lib/core.js';

const RELATIVE_MODULE_SPECIFIER = /(?<prefix>\b(?:from\s+|import\s*\(\s*))(?<quote>["'])(?<path>\.{1,2}\/[^"']+\.js)(?:\?v=(?<version>[^"']+))?\k<quote>/g;
const RUNTIME_IMPORT = /import\(\s*`\.\/runtime-main\.js\?v=\$\{encodeURIComponent\([^)]*\)\}`\s*\)/;

interface ModuleSpecifier {
  readonly path: string;
  readonly version: string | null;
}

function moduleFiles(): string[] {
  return walk(path.join(SITE, 'override')).filter((file) => file.endsWith('.js'));
}

function relativeModuleSpecifiers(source: string): ModuleSpecifier[] {
  return [...source.matchAll(RELATIVE_MODULE_SPECIFIER)].flatMap((match) => {
    const modulePath = match.groups?.path;
    if (!modulePath) return [];
    return [{ path: modulePath, version: match.groups?.version ?? null } satisfies ModuleSpecifier];
  });
}

export function stampModuleGraph(sha: string): void {
  const files = moduleFiles();
  assert(files.length > 1, 'Compiled override module graph is missing');

  for (const file of files) {
    const source = read(file);
    const stamped = source.replace(
      RELATIVE_MODULE_SPECIFIER,
      (_match: string, ...args: unknown[]) => {
        const groups = args.at(-1) as { prefix?: string; quote?: string; path?: string } | undefined;
        const prefix = groups?.prefix ?? '';
        const quote = groups?.quote ?? "'";
        const specifier = groups?.path ?? '';
        return `${prefix}${quote}${specifier}?v=${sha}${quote}`;
      },
    );
    write(file, stamped.replace(/^\s*\/\/[#@]\s*sourceMappingURL=.*$/gm, ''));
  }
}

export function verifyModuleGraph(sha: string): void {
  const main = read(path.join(SITE, 'override/main.js'));
  const versionHelper = read(path.join(SITE, 'override/core/module-version.js'));
  assert(main.includes('moduleAssetVersion(import.meta.url)'), 'ES-module entrypoint must derive its version from module metadata');
  assert(versionHelper.includes('new URL(metaUrl)'), 'Module-version helper must parse import.meta.url through URL');
  assert(RUNTIME_IMPORT.test(main), 'ES-module runtime bootstrap is missing');
  assert(!main.includes('__scCatalogAssetVersion'), 'Legacy asset-version global remains in compiled runtime');

  for (const file of moduleFiles()) {
    const source = read(file);
    for (const specifier of relativeModuleSpecifiers(source)) {
      assert(
        specifier.version === sha,
        `Unversioned module dependency remains in ${path.relative(SITE, file)}: ${specifier.path}`,
      );
    }
  }
}
