import fs from 'node:fs';
import path from 'node:path';

const TEXT_EXTENSIONS = new Set([
  '.html',
  '.css',
  '.js',
  '.json',
  '.txt',
  '.svg',
  '.xml',
  '.md',
]);

const NEUTRALIZATIONS = [
  ['_pages', '_build'],
  ['sc-pages-', 'sc-build-'],
  ['Pages', 'Build'],
] as const;

function textFiles(root: string): string[] {
  const files: string[] = [];
  const directories = [root];

  while (directories.length) {
    const directory = directories.pop();
    if (!directory) continue;

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        directories.push(target);
      } else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(target);
      }
    }
  }
  return files;
}

function neutralizeText(text: string): string {
  return NEUTRALIZATIONS.reduce(
    (current, [source, target]) => current.replaceAll(source, target),
    text,
  );
}

function renamePagesDirectory(root: string): void {
  const pages = path.join(root, '_pages');
  if (!fs.existsSync(pages)) return;

  const build = path.join(root, '_build');
  fs.rmSync(build, { recursive: true, force: true });
  fs.renameSync(pages, build);
}

export function neutralizeCompiled(root: string): void {
  renamePagesDirectory(root);

  for (const file of textFiles(root)) {
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const neutralized = neutralizeText(text);
    if (neutralized !== text) fs.writeFileSync(file, neutralized);
  }
}
