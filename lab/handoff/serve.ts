import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const args = process.argv.slice(2);
const rootArg = args.indexOf('--root');
const explicitRoot = rootArg >= 0 ? args[rootArg + 1] : undefined;
const root = path.resolve(explicitRoot ?? path.join(process.cwd(), 'handoff', 'compiled'));

const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

http.createServer((req, res) => {
  const pathname = (req.url ?? '/').split('?', 1)[0] ?? '/';
  const raw = decodeURIComponent(pathname);
  const relative = raw === '/' ? 'index.html' : raw.replace(/^\/+/, '');
  const file = path.resolve(root, relative);

  if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  let target = file;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    res.writeHead(404).end('Not found');
    return;
  }

  res.setHeader('Content-Type', mime[path.extname(target).toLowerCase()] ?? 'application/octet-stream');
  fs.createReadStream(target).pipe(res);
}).listen(8080, '127.0.0.1', () => {
  console.log(`Serving ${root} at http://127.0.0.1:8080`);
});
