import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const ROOT = process.cwd();
export const SITE = path.join(ROOT, '.pages-site');
export const LAB = path.join(ROOT, 'lab', 'pages');
export const PAGE_ASSETS = path.join(LAB, 'assets');

export function githubSha(): string {
  const sha = process.env.GITHUB_SHA ?? '';
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('GITHUB_SHA is missing or invalid');
  return sha;
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function exists(file: string): boolean { return fs.existsSync(file); }
export function isFile(file: string): boolean { return fs.existsSync(file) && fs.statSync(file).isFile(); }
export function isDir(file: string): boolean { return fs.existsSync(file) && fs.statSync(file).isDirectory(); }
export function read(file: string): string { return fs.readFileSync(file, 'utf8'); }
export function write(file: string, content: string | Buffer): void { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content); }
export function ensureDir(dir: string): void { fs.mkdirSync(dir, { recursive: true }); }
export function remove(target: string): void { fs.rmSync(target, { recursive: true, force: true }); }
export function copyFile(source: string, target: string): void { ensureDir(path.dirname(target)); fs.copyFileSync(source, target); }

export function walk(dir: string): string[] {
  if (!isDir(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

export function copyTree(source: string, target: string, shouldCopy?: (relative: string, absolute: string) => boolean): void {
  ensureDir(target);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const absolute = path.join(source, entry.name);
    const relative = path.relative(source, absolute).replaceAll(path.sep, '/');
    if (shouldCopy && !shouldCopy(relative, absolute)) continue;
    const destination = path.join(target, entry.name);
    if (entry.isDirectory()) copyTreeFiltered(absolute, destination, source, shouldCopy);
    else copyFile(absolute, destination);
  }
}

function copyTreeFiltered(source: string, target: string, root: string, shouldCopy?: (relative: string, absolute: string) => boolean): void {
  ensureDir(target);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const absolute = path.join(source, entry.name);
    const relative = path.relative(root, absolute).replaceAll(path.sep, '/');
    if (shouldCopy && !shouldCopy(relative, absolute)) continue;
    const destination = path.join(target, entry.name);
    if (entry.isDirectory()) copyTreeFiltered(absolute, destination, root, shouldCopy);
    else copyFile(absolute, destination);
  }
}

export function replaceOnce(text: string, search: string, replacement: string, message: string): string {
  const first = text.indexOf(search);
  if (first < 0 || text.indexOf(search, first + search.length) >= 0) throw new Error(message);
  return text.slice(0, first) + replacement + text.slice(first + search.length);
}

export function replaceRegexOnce(text: string, pattern: RegExp, replacement: string | ((substring: string, ...args: string[]) => string), message: string): string {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const global = new RegExp(pattern.source, flags);
  const matches = [...text.matchAll(global)];
  if (matches.length !== 1) throw new Error(`${message}; found ${matches.length}`);
  return text.replace(pattern, replacement as string);
}

export function countMatches(text: string, pattern: RegExp): number {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return [...text.matchAll(new RegExp(pattern.source, flags))].length;
}

export function nodeCheck(file: string): void {
  const result = spawnSync(process.execPath, ['--input-type=commonjs', '--check'], { input: read(file), encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`JavaScript syntax error in ${path.relative(ROOT, file)}: ${(result.stderr || result.stdout || '').trim()}`);
}

export function relative(file: string): string { return path.relative(ROOT, file).replaceAll(path.sep, '/'); }
export function stripQuery(value: string): string { return value.split(/[?#]/, 1)[0] ?? value; }
export function escapeRegExp(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
export function requireFile(file: string, message?: string): void { assert(isFile(file) && fs.statSync(file).size > 0, message ?? `Missing file: ${relative(file)}`); }
export function writeJson(file: string, value: unknown): void { write(file, `${JSON.stringify(value, null, 2)}\n`); }
export function readJson<T>(file: string): T { return JSON.parse(read(file)) as T; }
