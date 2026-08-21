import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, githubSha, read, write } from '../lib/core.js';
import { PHP_GUARD_SLOT } from './first-paint/delivery.js';

const PHP_GUARD_ENTRY = "{ src: '_pages/php-guard.js?v=' + VERSION, kind: 'classic' },";

const PHP_GUARD_SOURCE = String.raw`{
  const browser = window;

  const requestUrl = (input) => {
    if (typeof input === 'string') return input;
    if (input && typeof input.url === 'string') return input.url;
    return input == null ? '' : String(input);
  };

  const isPhpRequest = (input) => {
    const value = requestUrl(input);
    if (!value) return false;
    try {
      return /\.php$/i.test(new URL(value, browser.location.href).pathname);
    } catch {
      return /\.php(?:[?#]|$)/i.test(value);
    }
  };

  const jquery = browser.jQuery;
  if (jquery?.Deferred && typeof jquery.ajax === 'function') {
    const nativeAjax = jquery.ajax;
    jquery.ajax = function (...args) {
      const [url, options] = args;
      const settings = url && typeof url === 'object' ? url : (options || {});
      const target = typeof url === 'string' ? url : settings.url;
      if (!isPhpRequest(target)) return nativeAjax.apply(this, args);

      const deferred = jquery.Deferred();
      return deferred.promise({
        readyState: 0,
        status: 0,
        statusText: 'static-pages',
        responseText: '',
        abort() { return this; },
        getAllResponseHeaders() { return ''; },
        getResponseHeader() { return null; },
        setRequestHeader() { return this; },
        overrideMimeType() { return this; },
        statusCode() { return this; },
      });
    };

    if (jquery.fn && typeof jquery.fn.load === 'function') {
      const nativeLoad = jquery.fn.load;
      jquery.fn.load = function (...args) {
        const [url] = args;
        if (typeof url === 'string' && isPhpRequest(url.split(/\s+/)[0])) return this;
        return nativeLoad.apply(this, args);
      };
    }
  }

  if (typeof browser.fetch === 'function') {
    const nativeFetch = browser.fetch;
    browser.fetch = function (input, init) {
      if (!isPhpRequest(input)) return nativeFetch.call(this, input, init);
      if (typeof browser.Response === 'function') {
        return Promise.resolve(new browser.Response('', { status: 200, statusText: 'OK' }));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(''),
        json: () => Promise.resolve({}),
      });
    };
  }

  if (browser.navigator && typeof browser.navigator.sendBeacon === 'function') {
    const nativeBeacon = browser.navigator.sendBeacon.bind(browser.navigator);
    browser.navigator.sendBeacon = (url, data) => isPhpRequest(url) || nativeBeacon(url, data);
  }
}
`;

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

export function disablePhpRuntime(): void {
  githubSha();
  const index = path.join(SITE, 'index.html');
  const guard = path.join(SITE, '_pages/php-guard.js');
  let html = removeCapturedKeepalive(read(index));

  assert(html.split(PHP_GUARD_SLOT).length - 1 === 1, 'Expected one PHP guard injection slot');
  html = html.replace(PHP_GUARD_SLOT, PHP_GUARD_ENTRY);
  write(guard, PHP_GUARD_SOURCE);

  assert(!html.includes('keepSessionAlive') && !html.includes('keepalive: 1'), 'Captured PHP session keepalive remains in final Pages HTML');
  assert(!html.includes(PHP_GUARD_SLOT), 'PHP guard injection slot remains after finalization');
  assert(html.split(PHP_GUARD_ENTRY).length - 1 === 1, 'PHP guard runtime entry must appear exactly once');
  assert(fs.statSync(guard).size >= 500, 'Generated PHP guard is missing or unexpectedly small');

  const active = html.replace(/<!--[\s\S]*?-->/g, '');
  assert(
    !/<(?:script|img|iframe|source|video|audio|embed|object|link)\b[^>]*\b(?:src|data|href)\s*=\s*["'][^"']*\.php(?:[?#][^"']*)?["'][^>]*>/i.test(active),
    'Automatic PHP resource remains in Pages artifact',
  );
  write(index, html);
}
