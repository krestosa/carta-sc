import fs from 'node:fs';
import path from 'node:path';

export const ROOT = process.cwd();

export interface WalkOptions {
  readonly ignoredDirectories?: ReadonlySet<string>;
}

export function normalizePath(value: string): string {
  return value.replaceAll(path.sep, '/');
}

export function relativeTo(base: string, file: string): string {
  return normalizePath(path.relative(base, file));
}

export function readText(file: string): string {
  return fs.readFileSync(file, 'utf8');
}

export function readProjectFile(relativePath: string): string {
  return readText(path.join(ROOT, relativePath));
}

export function walkFiles(directory: string, options: WalkOptions = {}): string[] {
  if (!fs.existsSync(directory)) return [];

  const files: string[] = [];
  const stack = [directory];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory() && options.ignoredDirectories?.has(entry.name)) continue;

      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else if (entry.isFile()) files.push(fullPath);
    }
  }

  return files;
}

export function listRelativeFiles(directory: string): string[] {
  return walkFiles(directory).map((file) => relativeTo(directory, file)).sort();
}
