import path from 'node:path';
import { SITE, assert, read, replaceRegexOnce, write } from '../../lib/core.js';

export function stampLegacyBootstrap(sha: string): void {
  const file = path.join(SITE, '_js_dev/main.js');
  const source = read(file);
  write(
    file,
    replaceRegexOnce(
      source,
      /var\s+version='[^']+';/,
      `var version='${sha}';`,
      'Could not stamp the legacy bootstrap version exactly once',
    ),
  );
}

export function verifyLegacyBootstrap(sha: string): void {
  assert(
    read(path.join(SITE, '_js_dev/main.js')).includes(`var version='${sha}';`),
    'Stamped legacy bootstrap version is missing',
  );
}
