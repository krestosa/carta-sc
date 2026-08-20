import fs from 'node:fs';
import path from 'node:path';

const TEXT_EXTENSIONS = new Set(['.html','.css','.js','.json','.txt','.svg','.xml','.md']);

export function neutralizeCompiled(root: string): void {
  const pages = path.join(root, '_pages');
  const build = path.join(root, '_build');
  if (fs.existsSync(pages)) {
    fs.rmSync(build, { recursive: true, force: true });
    fs.renameSync(pages, build);
  }
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    if (!dir) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { stack.push(file); continue; }
      if (!entry.isFile() || !TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      let text: string;
      try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
      const next = text.replaceAll('_pages', '_build').replaceAll('sc-pages-', 'sc-build-').replaceAll('Pages', 'Build');
      if (next !== text) fs.writeFileSync(file, next);
    }
  }
}
