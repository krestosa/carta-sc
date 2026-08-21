import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, githubSha, read, write } from '../lib/core.js';
import { transpileBrowserRuntime } from '../lib/browser-runtime.js';
import { PHP_GUARD_SLOT } from './first-paint/delivery.js';

const PHP_GUARD_ENTRY = "{ src: '_pages/php-guard.js?v=' + VERSION, kind: 'classic' },";
const PHP_GUARD_RUNTIME_SOURCE = 'lab/pages/steps/php-guard-runtime.ts';

function removeCapturedKeepalive(html: string): string {
  let matches = 0;
  const result = html.replace(
    /\s*(?:const|let|var)\s+keepSessionAlive\s*=\s*function\s*\(\s*\)\s*\{[\s\S]*?(?=\s*if\s*\(\s*\$\.fn\s*&&\s*\$\.fn\.fancybox\s*\)\s*\{)/i,
    () => {
      matches += 1;
      return '\n';
    },
  );
  assert(matches === 1, `Expected one captured PHP keepalive block, found ${matches}`);
  return result;
}

class PhpRuntimeFinalizer {
  readonly #index = path.join(SITE, 'index.html');
  readonly #guard = path.join(SITE, '_pages/php-guard.js');
  #html = removeCapturedKeepalive(read(this.#index));

  run(): void {
    githubSha();
    this.#installGuardEntry();
    this.#writeGuardRuntime();
    this.#verify();
    write(this.#index, this.#html);
  }

  #installGuardEntry(): void {
    assert(
      this.#html.split(PHP_GUARD_SLOT).length - 1 === 1,
      'Expected one PHP guard injection slot',
    );
    this.#html = this.#html.replace(PHP_GUARD_SLOT, PHP_GUARD_ENTRY);
  }

  #writeGuardRuntime(): void {
    write(
      this.#guard,
      `${transpileBrowserRuntime(PHP_GUARD_RUNTIME_SOURCE, 'classic')}\n`,
    );
  }

  #verify(): void {
    assert(
      !this.#html.includes('keepSessionAlive') && !this.#html.includes('keepalive: 1'),
      'Captured PHP session keepalive remains in final Pages HTML',
    );
    assert(!this.#html.includes(PHP_GUARD_SLOT), 'PHP guard injection slot remains after finalization');
    assert(
      this.#html.split(PHP_GUARD_ENTRY).length - 1 === 1,
      'PHP guard runtime entry must appear exactly once',
    );
    assert(fs.statSync(this.#guard).size >= 500, 'Generated PHP guard is missing or unexpectedly small');

    const active = this.#html.replace(/<!--[\s\S]*?-->/g, '');
    assert(
      !/<(?:script|img|iframe|source|video|audio|embed|object|link)\b[^>]*\b(?:src|data|href)\s*=\s*["'][^"']*\.php(?:[?#][^"']*)?["'][^>]*>/i.test(active),
      'Automatic PHP resource remains in Pages artifact',
    );
  }
}

export function disablePhpRuntime(): void {
  new PhpRuntimeFinalizer().run();
}
