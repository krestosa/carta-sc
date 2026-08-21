import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { startStaticServer } from '../lab/handoff/static-server.js';

interface TargetInfo {
  readonly type: string;
  readonly webSocketDebuggerUrl?: string;
}

interface BrowserSnapshot {
  readonly url: string;
  readonly cardCount: number;
  readonly productImageCount: number;
  readonly loadedProductImages: number;
  readonly brokenProductImages: number;
  readonly pendingProductImages: number;
  readonly categoryCount: number;
  readonly skeletonCount: number;
  readonly runtimeReady: boolean;
  readonly toolsVisible: boolean;
  readonly searchPresent: boolean;
  readonly themePresent: boolean;
  readonly viewPresent: boolean;
  readonly viewModeBefore: string;
  readonly viewModeAfter: string;
  readonly viewAnimated: boolean;
  readonly themeChanged: boolean;
  readonly searchEmptyStateWorked: boolean;
  readonly animationFrameDelta: number;
  readonly elementAnimateDelta: number;
  readonly localFailures: readonly string[];
  readonly runtimeErrors: readonly string[];
}

interface CdpMessage {
  readonly id?: number;
  readonly method?: string;
  readonly params?: unknown;
  readonly result?: unknown;
  readonly error?: { readonly message?: string };
}

class CdpClient {
  readonly #socket: WebSocket;
  readonly #pending = new Map<number, { resolve(value: unknown): void; reject(error: Error): void }>();
  readonly #events = new Map<string, Array<(params: any) => void>>();
  #nextId = 1;

  private constructor(socket: WebSocket) {
    this.#socket = socket;
    socket.addEventListener('message', (event) => this.#onMessage(String(event.data)));
  }

  static async connect(url: string): Promise<CdpClient> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => resolve(), { once: true });
      socket.addEventListener('error', () => reject(new Error(`Could not connect to Chrome DevTools: ${url}`)), { once: true });
    });
    return new CdpClient(socket);
  }

  async send<T = any>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = this.#nextId++;
    const promise = new Promise<T>((resolve, reject) => {
      this.#pending.set(id, { resolve: (value) => resolve(value as T), reject });
    });
    this.#socket.send(JSON.stringify({ id, method, params }));
    return promise;
  }

  on(method: string, listener: (params: any) => void): void {
    const listeners = this.#events.get(method) ?? [];
    listeners.push(listener);
    this.#events.set(method, listeners);
  }

  close(): void {
    this.#socket.close();
  }

  #onMessage(raw: string): void {
    const message = JSON.parse(raw) as CdpMessage;
    if (message.id !== undefined) {
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      this.#pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message ?? 'CDP command failed'));
      else pending.resolve(message.result);
      return;
    }
    if (!message.method) return;
    for (const listener of this.#events.get(message.method) ?? []) listener(message.params);
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function freePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  assert(address && typeof address !== 'string', 'Could not allocate Chrome debugging port');
  const port = address.port;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

function chromeCandidates(): string[] {
  if (process.env.CHROME_PATH) return [process.env.CHROME_PATH];
  if (process.platform === 'win32') {
    return [
      path.join(process.env.PROGRAMFILES ?? 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ];
  }
  if (process.platform === 'darwin') return ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  return ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
}

function findChrome(): string {
  const candidate = chromeCandidates().find((file) => file && fs.existsSync(file));
  if (!candidate) throw new Error(`Chrome executable not found. Checked: ${chromeCandidates().join(', ')}`);
  return candidate;
}

async function launchChrome(): Promise<{ process: ChildProcess; client: CdpClient; cleanup(): Promise<void> }> {
  const port = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'carta-sc-browser-'));
  const args = [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-extensions',
    '--disable-sync',
    '--metrics-recording-only',
    '--mute-audio',
    '--window-size=1440,1000',
    'about:blank',
  ];
  if (process.platform !== 'win32') args.splice(1, 0, '--no-sandbox');

  const child = spawn(findChrome(), args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const endpoint = `http://127.0.0.1:${port}/json/list`;
  let target: TargetInfo | undefined;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Chrome exited before DevTools became available: ${child.exitCode}`);
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const targets = await response.json() as TargetInfo[];
        target = targets.find((entry) => entry.type === 'page' && entry.webSocketDebuggerUrl);
        if (target?.webSocketDebuggerUrl) break;
      }
    } catch {
      // Chrome may still be starting.
    }
    await delay(125);
  }
  assert(target?.webSocketDebuggerUrl, 'Chrome DevTools page target did not become available');
  const client = await CdpClient.connect(target.webSocketDebuggerUrl);
  return {
    process: child,
    client,
    cleanup: async () => {
      client.close();
      if (child.exitCode === null) child.kill();
      await delay(50);
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    },
  };
}

async function evaluate<T>(client: CdpClient, expression: string): Promise<T> {
  const response = await client.send<any>('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (response.exceptionDetails) throw new Error(`Browser evaluation failed: ${JSON.stringify(response.exceptionDetails)}`);
  return response.result?.value as T;
}

async function waitFor(client: CdpClient, expression: string, timeout = 20_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate<boolean>(client, expression)) return;
    await delay(100);
  }
  throw new Error(`Browser condition timed out: ${expression}`);
}

const PROBE_SCRIPT = `(() => {
  if (window.__cartaHandoffProbe) return;
  const state = { raf: 0, animate: 0, errors: [] };
  const originalRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    state.raf += 1;
    return originalRaf(callback);
  };
  const originalAnimate = Element.prototype.animate;
  if (originalAnimate) {
    Element.prototype.animate = function(...args) {
      state.animate += 1;
      return originalAnimate.apply(this, args);
    };
  }
  window.addEventListener('error', (event) => state.errors.push(String(event.message || event.error || 'window error')));
  window.addEventListener('unhandledrejection', (event) => state.errors.push(String(event.reason || 'unhandled rejection')));
  Object.defineProperty(window, '__cartaHandoffProbe', { value: state, configurable: false });
})();`;

const FUNCTIONAL_READY = `(() => {
  const tools = document.querySelector('.sc-catalog-tools');
  return !!tools
    && tools.hasAttribute('data-sc-view')
    && tools.hasAttribute('data-sc-theme-mode')
    && document.documentElement.hasAttribute('data-sc-catalog-view');
})()`;

const SNAPSHOT_SCRIPT = `(() => {
  const cards = [...document.querySelectorAll('.productoShop')];
  const images = [...document.querySelectorAll('.productoShop .imgShop img, .productoShop .imgLiquidNoFillShop img')];
  const tools = document.querySelector('.sc-catalog-tools');
  const visible = (el) => {
    if (!el) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
  };
  return {
    cardCount: cards.length,
    productImageCount: images.length,
    loadedProductImages: images.filter((img) => img.complete && img.naturalWidth > 0).length,
    brokenProductImages: images.filter((img) => img.complete && img.getAttribute('src') && img.naturalWidth <= 0).length,
    pendingProductImages: images.filter((img) => img.getAttribute('data-sc-src') && !img.getAttribute('src')).length,
    categoryCount: document.querySelectorAll('.sc-category-nav a, .sc-category-nav button, .nav-tabsTopShop a.anchorLink, .sc-category-rail a, .sc-category-rail button').length,
    skeletonCount: [...document.querySelectorAll('.sc-card-placeholder-loading, .sc-product-skeleton, [data-sc-skeleton]')].filter(visible).length,
    runtimeReady: !!tools && tools.hasAttribute('data-sc-view') && tools.hasAttribute('data-sc-theme-mode') && document.documentElement.hasAttribute('data-sc-catalog-view'),
    toolsVisible: visible(tools),
    searchPresent: !!document.querySelector('.sc-catalog-search-input'),
    themePresent: !!document.querySelector('.sc-theme-toggle'),
    viewPresent: !!document.querySelector('.sc-catalog-view-toggle'),
    probe: window.__cartaHandoffProbe || { raf: 0, animate: 0, errors: [] },
  };
})()`;

async function scrollCatalog(client: CdpClient): Promise<void> {
  await evaluate(client, `(async () => {
    const step = 700;
    const end = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    for (let y = 0; y <= end; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 35));
    }
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 250));
    return true;
  })()`);
}

async function exerciseView(client: CdpClient): Promise<{ before: string; after: string; animated: boolean }> {
  return evaluate(client, `(async () => {
    const root = document.documentElement;
    const button = document.querySelector('.sc-catalog-view-toggle');
    if (!button) return { before: '', after: '', animated: false };
    const shapes = () => [...document.querySelectorAll('[data-sc-view-shape]')].map((node) => ['x','y','width','height','rx','ry'].map((name) => node.getAttribute(name) || '').join(':')).join('|');
    const before = root.getAttribute('data-sc-catalog-view') || '';
    const start = shapes();
    button.click();
    const samples = [];
    for (const wait of [25, 35, 45, 55]) {
      await new Promise((resolve) => setTimeout(resolve, wait));
      samples.push(shapes());
    }
    await new Promise((resolve) => setTimeout(resolve, 260));
    const end = shapes();
    const after = root.getAttribute('data-sc-catalog-view') || '';
    return { before, after, animated: samples.some((sample) => sample !== start && sample !== end) };
  })()`);
}

async function exerciseTheme(client: CdpClient): Promise<boolean> {
  return evaluate(client, `(async () => {
    const tools = document.querySelector('.sc-catalog-tools');
    const toggle = document.querySelector('.sc-theme-toggle');
    if (!tools || !toggle) return false;
    const before = tools.getAttribute('data-sc-theme-mode') || 'system';
    toggle.click();
    await new Promise((resolve) => setTimeout(resolve, 40));
    const options = [...document.querySelectorAll('[data-sc-theme-option]')];
    const target = options.find((node) => node.getAttribute('data-sc-theme-option') !== before);
    if (!target) return false;
    target.click();
    await new Promise((resolve) => setTimeout(resolve, 360));
    const after = tools.getAttribute('data-sc-theme-mode') || '';
    return before !== after;
  })()`);
}

async function exerciseSearch(client: CdpClient): Promise<boolean> {
  return evaluate(client, `(async () => {
    const input = document.querySelector('.sc-catalog-search-input');
    if (!input) return false;
    input.value = '__handoff_no_match_927451__';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 220));
    const empty = document.querySelector('.sc-catalog-search-empty-message');
    const worked = !!empty && !empty.hidden;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 180));
    return worked;
  })()`);
}

async function inspectSite(client: CdpClient, url: string): Promise<BrowserSnapshot> {
  const localFailures: string[] = [];
  const runtimeErrors: string[] = [];
  client.on('Network.responseReceived', (params) => {
    const response = params?.response;
    const responseUrl = String(response?.url ?? '');
    if (response && responseUrl.startsWith('http://127.0.0.1') && !responseUrl.endsWith('/favicon.ico') && response.status >= 400) {
      localFailures.push(`${response.status} ${responseUrl}`);
    }
  });
  client.on('Runtime.exceptionThrown', (params) => runtimeErrors.push(params?.exceptionDetails?.text ?? 'runtime exception'));
  client.on('Log.entryAdded', (params) => {
    const entry = params?.entry;
    const entryUrl = String(entry?.url ?? '');
    if (entry?.level === 'error' && entryUrl.startsWith('http://127.0.0.1') && !entryUrl.endsWith('/favicon.ico')) {
      runtimeErrors.push(entry.text ?? 'browser error');
    }
  });

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  await client.send('Log.enable');
  await client.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE_SCRIPT });
  await client.send('Page.navigate', { url });
  await waitFor(client, `document.readyState === 'complete'`);
  await waitFor(client, `document.querySelectorAll('.productoShop').length > 100`);
  await waitFor(client, FUNCTIONAL_READY, 30_000);
  await scrollCatalog(client);
  await waitFor(client, `[...document.querySelectorAll('.productoShop .imgShop img, .productoShop .imgLiquidNoFillShop img')].filter((img) => img.complete && img.naturalWidth > 0).length >= 8`, 30_000);

  const before = await evaluate<any>(client, SNAPSHOT_SCRIPT);
  const view = await exerciseView(client);
  const themeChanged = await exerciseTheme(client);
  const searchEmptyStateWorked = await exerciseSearch(client);
  const after = await evaluate<any>(client, SNAPSHOT_SCRIPT);

  return {
    url,
    cardCount: after.cardCount,
    productImageCount: after.productImageCount,
    loadedProductImages: after.loadedProductImages,
    brokenProductImages: after.brokenProductImages,
    pendingProductImages: after.pendingProductImages,
    categoryCount: after.categoryCount,
    skeletonCount: after.skeletonCount,
    runtimeReady: after.runtimeReady,
    toolsVisible: after.toolsVisible,
    searchPresent: after.searchPresent,
    themePresent: after.themePresent,
    viewPresent: after.viewPresent,
    viewModeBefore: view.before,
    viewModeAfter: view.after,
    viewAnimated: view.animated,
    themeChanged,
    searchEmptyStateWorked,
    animationFrameDelta: Math.max(0, after.probe.raf - before.probe.raf),
    elementAnimateDelta: Math.max(0, after.probe.animate - before.probe.animate),
    localFailures: [...new Set(localFailures)],
    runtimeErrors: [...new Set([...(after.probe.errors ?? []), ...runtimeErrors])],
  };
}

function validateSnapshot(label: string, snapshot: BrowserSnapshot): void {
  assert(snapshot.cardCount > 100, `${label}: product grid is incomplete (${snapshot.cardCount})`);
  assert(snapshot.productImageCount > 100, `${label}: product image inventory is incomplete (${snapshot.productImageCount})`);
  assert(snapshot.loadedProductImages >= 8, `${label}: product images did not load (${snapshot.loadedProductImages})`);
  assert(snapshot.brokenProductImages === 0, `${label}: broken product images detected (${snapshot.brokenProductImages})`);
  assert(snapshot.runtimeReady, `${label}: catalog runtime did not mount its functional state`);
  assert(snapshot.toolsVisible && snapshot.searchPresent && snapshot.themePresent && snapshot.viewPresent, `${label}: catalog controls are incomplete`);
  assert(snapshot.viewModeBefore !== snapshot.viewModeAfter, `${label}: view toggle did not change mode`);
  assert(snapshot.viewAnimated, `${label}: view icon changed without its expected interpolation`);
  assert(snapshot.themeChanged, `${label}: theme control did not change mode`);
  assert(snapshot.searchEmptyStateWorked, `${label}: search empty-state interaction failed`);
  assert(snapshot.animationFrameDelta > 0 || snapshot.elementAnimateDelta > 0, `${label}: no animation activity detected during interactions`);
  assert(snapshot.localFailures.length === 0, `${label}: local HTTP failures: ${snapshot.localFailures.join('; ')}`);
  assert(snapshot.runtimeErrors.length === 0, `${label}: runtime errors: ${snapshot.runtimeErrors.join('; ')}`);
}

function compareSnapshots(pages: BrowserSnapshot, handoff: BrowserSnapshot): void {
  const exact: Array<[keyof BrowserSnapshot, string]> = [
    ['cardCount', 'product card count'],
    ['productImageCount', 'product image count'],
    ['categoryCount', 'category control count'],
    ['runtimeReady', 'runtime readiness'],
    ['toolsVisible', 'catalog tools visibility'],
    ['searchPresent', 'search control'],
    ['themePresent', 'theme control'],
    ['viewPresent', 'view control'],
    ['viewAnimated', 'view animation'],
    ['themeChanged', 'theme interaction'],
    ['searchEmptyStateWorked', 'search interaction'],
  ];
  for (const [key, label] of exact) {
    assert(pages[key] === handoff[key], `Handoff differs from Pages: ${label}: pages=${String(pages[key])} handoff=${String(handoff[key])}`);
  }

  const imageGap = Math.abs(pages.loadedProductImages - handoff.loadedProductImages);
  assert(imageGap <= 2, `Handoff differs from Pages: loaded product images pages=${pages.loadedProductImages} handoff=${handoff.loadedProductImages}`);
}

async function main(): Promise<void> {
  const pagesRoot = path.resolve(process.argv[2] ?? '.pages-site');
  const handoffRoot = path.resolve(process.argv[3] ?? path.join('handoff', 'compiled'));
  const pagesServer = await startStaticServer(pagesRoot);
  const handoffServer = await startStaticServer(handoffRoot);
  const browser = await launchChrome();

  try {
    const pages = await inspectSite(browser.client, pagesServer.url);
    const handoff = await inspectSite(browser.client, handoffServer.url);
    validateSnapshot('Pages', pages);
    validateSnapshot('Handoff', handoff);
    compareSnapshots(pages, handoff);
    console.log('Browser parity passed.');
    console.log(JSON.stringify({ pages, handoff }, null, 2));
  } finally {
    await browser.cleanup();
    await Promise.all([pagesServer.close(), handoffServer.close()]);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
