import fs from 'node:fs';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';

const DEFAULT_PORT = 8080;
const DEFAULT_HOST = '127.0.0.1';
const MIME_TYPES: Readonly<Record<string, string>> = {
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

function argumentValue(name: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function serveRoot(): string {
  const explicit = argumentValue('--root');
  return path.resolve(explicit ?? path.join(process.cwd(), 'handoff', 'compiled'));
}

function requestPath(request: IncomingMessage): string {
  const pathname = (request.url ?? '/').split('?', 1)[0] ?? '/';
  return decodeURIComponent(pathname);
}

function fileForRequest(root: string, request: IncomingMessage): string | null {
  const requested = requestPath(request);
  const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
  const candidate = path.resolve(root, relative);

  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) return null;
  if (!fs.existsSync(candidate)) return candidate;
  return fs.statSync(candidate).isDirectory() ? path.join(candidate, 'index.html') : candidate;
}

function sendText(response: ServerResponse, status: number, message: string): void {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
}

function handleRequest(root: string, request: IncomingMessage, response: ServerResponse): void {
  let target: string | null;
  try {
    target = fileForRequest(root, request);
  } catch {
    sendText(response, 400, 'Bad request');
    return;
  }

  if (!target) {
    sendText(response, 403, 'Forbidden');
    return;
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    sendText(response, 404, 'Not found');
    return;
  }

  response.setHeader(
    'Content-Type',
    MIME_TYPES[path.extname(target).toLowerCase()] ?? 'application/octet-stream',
  );
  fs.createReadStream(target).pipe(response);
}

export function serveHandoff(root = serveRoot()): http.Server {
  const server = http.createServer((request, response) => handleRequest(root, request, response));
  server.listen(DEFAULT_PORT, DEFAULT_HOST, () => {
    console.log(`Serving ${root} at http://${DEFAULT_HOST}:${DEFAULT_PORT}`);
  });
  return server;
}

serveHandoff();
