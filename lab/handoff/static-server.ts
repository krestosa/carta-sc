import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MIME_TYPES = new Map<string, string>([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

export interface StaticServerHandle {
  readonly url: string;
  close(): Promise<void>;
}

function safeFile(root: string, requestUrl: string): string | null {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  const requested = pathname === '/' ? '/index.html' : pathname;
  const relative = requested.replace(/^\/+/, '');
  const target = path.resolve(root, relative);
  const resolvedRoot = path.resolve(root);
  if (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}${path.sep}`)) return null;
  return target;
}

function sendFile(root: string, requestUrl: string, response: http.ServerResponse): void {
  const file = safeFile(root, requestUrl);
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    response.end('Not found');
    return;
  }

  const mime = MIME_TYPES.get(path.extname(file).toLowerCase()) ?? 'application/octet-stream';
  response.writeHead(200, {
    'content-type': mime,
    'content-length': fs.statSync(file).size,
    'cache-control': 'no-store, max-age=0',
    'x-content-type-options': 'nosniff',
  });
  fs.createReadStream(file).pipe(response);
}

export async function startStaticServer(root: string, requestedPort = 0): Promise<StaticServerHandle> {
  const resolvedRoot = path.resolve(root);
  if (!fs.existsSync(path.join(resolvedRoot, 'index.html'))) {
    throw new Error(`Static server root is missing index.html: ${resolvedRoot}`);
  }

  const server = http.createServer((request, response) => sendFile(resolvedRoot, request.url ?? '/', response));
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(requestedPort, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not resolve static server address');
  const url = `http://127.0.0.1:${address.port}`;

  return {
    url,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}

async function runCli(): Promise<void> {
  const root = path.resolve(process.argv[2] ?? 'compiled');
  const port = Number.parseInt(process.argv[3] ?? process.env.PORT ?? '4173', 10);
  const handle = await startStaticServer(root, Number.isFinite(port) ? port : 4173);
  console.log(`Static handoff server: ${handle.url}`);
  console.log('Press Ctrl+C to stop.');

  const shutdown = async (): Promise<void> => {
    await handle.close();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(path.resolve(entry)).href) {
  runCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  });
}
