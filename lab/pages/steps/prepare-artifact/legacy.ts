// Explica la responsabilidad de este archivo dentro del código propio y mantiene su lógica en el ámbito que le corresponde.
import path from 'node:path';
import { SITE, assert, read, replaceRegexOnce, write } from '../../lib/core.js';

export function stampLegacyBootstrap(version: string): void {
  const file = path.join(SITE, '_js_dev/main.js');
  const source = read(file);
  write(
    file,
    replaceRegexOnce(
      source,
      /var\s+version='[^']+';/,
      `var version='${version}';`,
      'Could not stamp the legacy bootstrap version exactly once',
    ),
  );
}

export function verifyLegacyBootstrap(version: string): void {
  assert(
    read(path.join(SITE, '_js_dev/main.js')).includes(`var version='${version}';`),
    'Stamped legacy bootstrap version is missing',
  );
}
