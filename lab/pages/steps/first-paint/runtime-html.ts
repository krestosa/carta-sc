import { assert, escapeRegExp } from '../../lib/core.js';

const RUNTIME_SCRIPTS = [
  'js/jquery-2.1.0.min.js',
  '_pages/legacy.js',
  '_js_dev/main-legacy.js',
  'override/main.js',
  '_pages/shop.js',
] as const;

const INLINE_RUNTIME_MARKERS = [
  /function\s+isValidEmailAddress\s*\(\s*emailAddress\s*\)/,
  /keepSessionAlive\s*=\s*function\s*\(/,
] as const;

interface InlineScriptMatch {
  readonly index: number;
  readonly source: string;
  readonly body: string;
}

function runtimeScriptPattern(relativePath: string, sha: string): RegExp {
  const version = relativePath.startsWith('js/jquery') ? '' : `\\?v=${escapeRegExp(sha)}`;
  return new RegExp(
    `<script\\b(?=[^>]*src=["']${escapeRegExp(relativePath)}${version}["'])[^>]*>\\s*<\\/script>\\s*`,
    'i',
  );
}

function inlineScripts(html: string): InlineScriptMatch[] {
  return [...html.matchAll(/<script(?<attrs>[^>]*)>(?<body>[\s\S]*?)<\/script>/gi)].flatMap((match) => {
    if (match.index === undefined) return [];
    return [{
      index: match.index,
      source: match[0],
      body: match.groups?.body ?? '',
    } satisfies InlineScriptMatch];
  });
}

function unwrapDomReady(body: string): string {
  const wrapper = /^\s*document\.addEventListener\('DOMContentLoaded',function\(\)\{\s*(?<inner>[\s\S]*?)\s*\},\{once:true\}\);\s*$/.exec(body);
  return wrapper?.groups?.inner ?? body;
}

function runtimeReadyScript(body: string): string {
  return `<script>window.addEventListener('sc:runtime-ready', () => {\n${body}\n}, { once: true });</script>`;
}

export function removeRuntimeScripts(html: string, sha: string): string {
  let result = html;
  for (const relativePath of RUNTIME_SCRIPTS) {
    const pattern = runtimeScriptPattern(relativePath, sha);
    const matches = result.match(new RegExp(pattern.source, 'gi')) ?? [];
    assert(matches.length === 1, `runtime tag mismatch: ${relativePath}=${matches.length}`);
    result = result.replace(pattern, '');
  }
  return result;
}

export function deferInlineRuntimeScripts(html: string): string {
  let result = html;
  for (const marker of INLINE_RUNTIME_MARKERS) {
    const match = inlineScripts(result).find((script) => marker.test(script.body));
    assert(match, `inline runtime marker missing: ${marker.source}`);
    const replacement = runtimeReadyScript(unwrapDomReady(match.body));
    result = result.slice(0, match.index) + replacement + result.slice(match.index + match.source.length);
  }
  return result;
}
