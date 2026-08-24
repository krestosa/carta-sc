type UnknownRecord = Record<string, unknown>;

interface TokenSource {
  readonly path: string;
  readonly type: string;
  readonly raw: unknown;
}

interface FlatToken extends TokenSource {
  readonly resolved: unknown;
}

interface SpringPair {
  readonly path: string;
  stiffness?: number;
  damping?: number;
}

const tokenSources = new Map<string, TokenSource>();
let flatTokens: FlatToken[] = [];
let selectedTheme: 'system' | 'light' | 'dark' = 'system';

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing styles showcase element: #${id}`);
  return element as T;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function tokenAlias(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return /^\{([^}]+)\}$/.exec(value)?.[1] ?? null;
}

function collectTokens(node: unknown, path: string[] = [], inheritedType = 'unknown'): void {
  if (!isRecord(node)) return;
  const type = typeof node.$type === 'string' ? node.$type : inheritedType;
  if ('$value' in node) {
    const tokenPath = path.join('.');
    tokenSources.set(tokenPath, { path: tokenPath, type, raw: node.$value });
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (!key.startsWith('$')) collectTokens(value, [...path, key], type);
  }
}

function resolveAny(value: unknown, stack: readonly string[] = []): unknown {
  const alias = tokenAlias(value);
  if (alias) return resolveToken(alias, stack);
  if (Array.isArray(value)) return value.map((item) => resolveAny(item, stack));
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveAny(item, stack)]));
  }
  return value;
}

function resolveToken(path: string, stack: readonly string[] = []): unknown {
  if (stack.includes(path)) throw new Error(`Token alias cycle: ${[...stack, path].join(' -> ')}`);
  const source = tokenSources.get(path);
  if (!source) throw new Error(`Missing token alias: ${path}`);
  return resolveAny(source.raw, [...stack, path]);
}

function numberFrom(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function dimension(value: unknown): string {
  if (!isRecord(value)) return String(value ?? '');
  const amount = numberFrom(value.value);
  const unit = typeof value.unit === 'string' ? value.unit : '';
  return amount === null ? JSON.stringify(value) : `${amount}${unit}`;
}

function durationMilliseconds(value: unknown): number {
  if (!isRecord(value)) return 0;
  const amount = numberFrom(value.value) ?? 0;
  return value.unit === 's' ? amount * 1000 : amount;
}

function color(value: unknown): string {
  if (!isRecord(value) || !Array.isArray(value.components)) return String(value ?? '');
  const components = value.components.slice(0, 3);
  if (value.colorSpace === 'srgb' && components.every((component) => typeof component === 'number')) {
    const channels = components.map((component) => Math.round((component as number) * 255));
    const alpha = numberFrom(value.alpha) ?? 1;
    return alpha === 1 ? `rgb(${channels.join(' ')})` : `rgb(${channels.join(' ')} / ${alpha})`;
  }
  const alpha = numberFrom(value.alpha) ?? 1;
  return `color(${String(value.colorSpace)} ${components.join(' ')}${alpha === 1 ? '' : ` / ${alpha}`})`;
}

function fontFamily(value: unknown): string {
  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => {
    const part = String(item ?? '');
    return /\s/.test(part) ? `'${part.replaceAll("'", "\\'")}'` : part;
  }).join(', ');
}

function cubicBezier(value: unknown): string {
  return Array.isArray(value) && value.length === 4 ? `cubic-bezier(${value.join(', ')})` : String(value ?? '');
}

function shadow(value: unknown): string {
  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => {
    if (!isRecord(item)) return String(item ?? '');
    return [
      item.inset === true ? 'inset' : '',
      dimension(item.offsetX),
      dimension(item.offsetY),
      dimension(item.blur),
      dimension(item.spread),
      color(item.color),
    ].filter(Boolean).join(' ');
  }).join(', ');
}

function border(value: unknown): string {
  if (!isRecord(value)) return String(value ?? '');
  return `${dimension(value.width)} ${String(value.style ?? '')} ${color(value.color)}`;
}

function transition(value: unknown): string {
  if (!isRecord(value)) return String(value ?? '');
  const duration = dimension(value.duration);
  const timing = cubicBezier(value.timingFunction);
  const delay = dimension(value.delay);
  return `${duration} ${timing} ${delay}`;
}

function cssValue(value: unknown, type: string): string {
  if (type === 'color') return color(value);
  if (type === 'dimension') return dimension(value);
  if (type === 'duration') return dimension(value);
  if (type === 'fontFamily') return fontFamily(value);
  if (type === 'cubicBezier') return cubicBezier(value);
  if (type === 'shadow') return shadow(value);
  if (type === 'border') return border(value);
  if (type === 'transition') return transition(value);
  if (type === 'fontWeight' || type === 'number') return String(value ?? '');
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

function compactJson(value: unknown): string {
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

function token(path: string): FlatToken | undefined {
  return flatTokens.find((entry) => entry.path === path);
}

function tokensUnder(prefix: string): FlatToken[] {
  return flatTokens.filter((entry) => entry.path.startsWith(`${prefix}.`));
}

function resolvedNumber(path: string): number | null {
  const value = token(path)?.resolved;
  if (typeof value === 'number') return value;
  if (isRecord(value)) return numberFrom(value.value);
  return null;
}

function setTheme(theme: typeof selectedTheme): void {
  selectedTheme = theme;
  const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
  document.documentElement.dataset.stylesTheme = theme;
  document.documentElement.dataset.stylesResolved = resolved;
  document.documentElement.dataset.scTheme = theme;
  document.documentElement.dataset.scThemeResolved = resolved;
  document.querySelectorAll<HTMLButtonElement>('[data-theme-option]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.themeOption === theme));
  });
  renderCssVariables();
}

function currentBreakpoint(): string {
  const width = window.innerWidth;
  const phone = resolvedNumber('system.layout.breakpointPhone') ?? 640;
  const tabletMax = resolvedNumber('system.layout.breakpointTabletMax') ?? 992;
  if (width <= phone) return 'mobile';
  if (width <= tabletMax) return 'tablet';
  return 'desktop';
}

function renderStatus(): void {
  const systemGroups = new Set(flatTokens.filter((entry) => entry.path.startsWith('system.')).map((entry) => entry.path.split('.')[1]).filter(Boolean));
  const referenceCount = flatTokens.filter((entry) => entry.path.startsWith('reference.')).length;
  const systemCount = flatTokens.filter((entry) => entry.path.startsWith('system.')).length;
  byId('system-status').innerHTML = [
    ['Tokens', flatTokens.length],
    ['System roles', systemCount],
    ['Reference', referenceCount],
    ['Groups', systemGroups.size],
  ].map(([label, value]) => `<div class="styles-stat"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join('');
}

function renderGrid(): void {
  const breakpoint = currentBreakpoint();
  const columns = breakpoint === 'desktop' ? 12 : breakpoint === 'tablet' ? 8 : 4;
  const gutterPath = breakpoint === 'desktop' ? 'system.layout.gridGutter.desktop' : breakpoint === 'tablet' ? 'system.layout.gridGutter.compact' : 'system.layout.gridGutter.mobile';
  const gutterToken = token(gutterPath);
  const max = token('system.layout.contentMaxWidth');
  byId('grid-meta').innerHTML = [
    `${columns} columnas`,
    `viewport ${window.innerWidth}px`,
    `gutter ${gutterToken ? cssValue(gutterToken.resolved, gutterToken.type) : '—'}`,
    `max-width ${max ? cssValue(max.resolved, max.type) : '—'}`,
  ].map((text) => `<span class="styles-meta-pill">${escapeHtml(text)}</span>`).join('');
}

function renderColors(): void {
  const root = byId('color-groups');
  const groups: Array<'light' | 'dark'> = ['light', 'dark'];
  root.innerHTML = groups.map((group) => {
    const entries = tokensUnder(`system.color.${group}`);
    const cards = entries.map((entry) => {
      const value = cssValue(entry.resolved, entry.type);
      const name = entry.path.split('.').at(-1) ?? entry.path;
      return `<article class="styles-color-card"><div class="styles-color-swatch" style="background:${escapeHtml(value)}"></div><div class="styles-color-info"><strong>${escapeHtml(name)}</strong><code>${escapeHtml(value)}</code></div></article>`;
    }).join('');
    return `<div class="styles-group-title"><h3>${group}</h3><span>${entries.length} roles</span></div><div class="styles-color-grid">${cards}</div>`;
  }).join('');
  const scrim = token('system.color.scrim');
  if (scrim) {
    const value = cssValue(scrim.resolved, scrim.type);
    root.insertAdjacentHTML('beforeend', `<div class="styles-group-title"><h3>shared</h3><span>overlay</span></div><div class="styles-color-grid"><article class="styles-color-card"><div class="styles-color-swatch" style="background:${escapeHtml(value)},linear-gradient(135deg,#fff 50%,#ddd 50%)"></div><div class="styles-color-info"><strong>scrim</strong><code>${escapeHtml(value)}</code></div></article></div>`);
  }
}

function typographyStyle(value: unknown): string {
  if (!isRecord(value)) return '';
  const pairs: string[] = [];
  if (value.fontFamily) pairs.push(`font-family:${fontFamily(value.fontFamily)}`);
  if (value.fontSize) pairs.push(`font-size:${dimension(value.fontSize)}`);
  if (value.fontWeight !== undefined) pairs.push(`font-weight:${String(value.fontWeight)}`);
  if (value.lineHeight !== undefined) pairs.push(`line-height:${String(value.lineHeight)}`);
  if (value.letterSpacing) pairs.push(`letter-spacing:${dimension(value.letterSpacing)}`);
  return pairs.join(';');
}

function renderTypography(): void {
  const entries = tokensUnder('system.typography');
  byId('typography-list').innerHTML = entries.map((entry) => {
    const name = entry.path.replace('system.typography.', '');
    const value = entry.resolved;
    const meta = isRecord(value)
      ? `${dimension(value.fontSize)} · ${String(value.fontWeight ?? '')} · ${String(value.lineHeight ?? '')} · ${dimension(value.letterSpacing)}`
      : compactJson(value);
    return `<article class="styles-type-row"><code class="styles-type-name">${escapeHtml(name)}</code><div class="styles-type-sample" style="${escapeHtml(typographyStyle(value))}">SushiClub — Sabor, precisión y movimiento</div><div class="styles-type-meta">${escapeHtml(meta)}</div></article>`;
  }).join('');
}

function renderSpacing(): void {
  const entries = tokensUnder('system.spacing');
  const max = Math.max(1, ...entries.map((entry) => resolvedNumber(entry.path) ?? 0));
  byId('spacing-list').innerHTML = entries.map((entry) => {
    const amount = resolvedNumber(entry.path) ?? 0;
    const name = entry.path.replace('system.spacing.', '');
    const value = cssValue(entry.resolved, entry.type);
    const width = Math.max(1, amount / max * 100);
    return `<div class="styles-token-visual"><code class="styles-token-visual__name">${escapeHtml(name)}</code><div><div class="styles-token-visual__bar" style="width:${width}%"></div></div><code class="styles-token-visual__value">${escapeHtml(value)}</code></div>`;
  }).join('');
}

function renderShapes(): void {
  byId('shape-list').innerHTML = tokensUnder('system.shape').map((entry) => {
    const value = cssValue(entry.resolved, entry.type);
    const name = entry.path.replace('system.shape.', '');
    return `<article class="styles-system-card"><div class="styles-system-card__preview"><span class="styles-system-card__shape" style="border-radius:${escapeHtml(value)}"></span></div><strong>${escapeHtml(name)}</strong><code>${escapeHtml(value)}</code></article>`;
  }).join('');
}

function renderElevation(): void {
  byId('elevation-list').innerHTML = tokensUnder('system.elevation').map((entry) => {
    const value = cssValue(entry.resolved, entry.type);
    const name = entry.path.replace('system.elevation.', '');
    return `<article class="styles-system-card"><div class="styles-system-card__preview"><span class="styles-system-card__shape" style="width:92px;height:54px;border-radius:8px;background:var(--styles-raised);box-shadow:${escapeHtml(value)}"></span></div><strong>${escapeHtml(name)}</strong><code>${escapeHtml(value)}</code></article>`;
  }).join('');
}

function renderStates(): void {
  byId('state-list').innerHTML = tokensUnder('system.state.opacity').map((entry) => {
    const amount = typeof entry.resolved === 'number' ? entry.resolved : 0;
    const name = entry.path.replace('system.state.opacity.', '');
    return `<article class="styles-state-card"><div class="styles-state-card__target">Target<div class="styles-state-card__layer" style="opacity:${amount}"></div></div><strong>${escapeHtml(name)}</strong><code>${escapeHtml(amount)}</code></article>`;
  }).join('');
}

function motionRow(name: string, value: string, attrs: string, meta: string): string {
  return `<article class="styles-motion-row" ${attrs}><div class="styles-motion-row__name"><strong>${escapeHtml(name)}</strong><code>${escapeHtml(value)}</code></div><div class="styles-motion-track" data-motion-track><span class="styles-motion-dot"></span></div><div class="styles-motion-meta">${escapeHtml(meta)}</div></article>`;
}

function runTransition(row: HTMLElement): void {
  const track = row.querySelector<HTMLElement>('[data-motion-track]');
  const dot = row.querySelector<HTMLElement>('.styles-motion-dot');
  if (!track || !dot) return;
  const distance = Math.max(0, track.clientWidth - 32);
  const duration = Number(row.dataset.duration ?? 700);
  const easing = row.dataset.easing ?? 'linear';
  dot.getAnimations().forEach((animation) => animation.cancel());
  dot.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${distance}px)` }], {
    duration,
    easing,
    fill: 'both',
  });
}

function runSpring(row: HTMLElement): void {
  const track = row.querySelector<HTMLElement>('[data-motion-track]');
  const dot = row.querySelector<HTMLElement>('.styles-motion-dot');
  if (!track || !dot) return;
  const stiffness = Number(row.dataset.stiffness ?? 700);
  const dampingRatio = Number(row.dataset.damping ?? 1);
  const distance = Math.max(0, track.clientWidth - 32);
  let position = 0;
  let velocity = 0;
  let previous = performance.now();
  const started = previous;
  const damping = 2 * dampingRatio * Math.sqrt(stiffness);
  const frame = (now: number): void => {
    const delta = Math.min(.032, Math.max(.001, (now - previous) / 1000));
    previous = now;
    const steps = 4;
    const dt = delta / steps;
    for (let index = 0; index < steps; index += 1) {
      const acceleration = stiffness * (1 - position) - damping * velocity;
      velocity += acceleration * dt;
      position += velocity * dt;
    }
    dot.style.transform = `translateX(${position * distance}px)`;
    const settled = Math.abs(1 - position) < .001 && Math.abs(velocity) < .01;
    if (!settled && now - started < 2200) requestAnimationFrame(frame);
    else dot.style.transform = `translateX(${distance}px)`;
  };
  dot.getAnimations().forEach((animation) => animation.cancel());
  dot.style.transform = 'translateX(0)';
  requestAnimationFrame(frame);
}

function renderMotion(): void {
  const durations = tokensUnder('system.motion.duration');
  byId('duration-list').innerHTML = durations.map((entry) => {
    const ms = durationMilliseconds(entry.resolved);
    const name = entry.path.replace('system.motion.duration.', '');
    return motionRow(name, cssValue(entry.resolved, entry.type), `data-motion-demo data-duration="${ms}" data-easing="linear"`, `${ms} ms`);
  }).join('');

  const easings = tokensUnder('system.motion.easing');
  byId('easing-list').innerHTML = easings.map((entry) => {
    const easing = cssValue(entry.resolved, entry.type);
    const name = entry.path.replace('system.motion.easing.', '');
    return motionRow(name, easing, `data-motion-demo data-duration="900" data-easing="${escapeHtml(easing)}"`, easing);
  }).join('');

  const springPairs = new Map<string, SpringPair>();
  for (const entry of tokensUnder('system.motion.spring')) {
    const parts = entry.path.split('.');
    const leaf = parts.at(-1);
    if (leaf !== 'stiffness' && leaf !== 'damping') continue;
    const parent = parts.slice(0, -1).join('.');
    const pair = springPairs.get(parent) ?? { path: parent };
    const amount = typeof entry.resolved === 'number' ? entry.resolved : undefined;
    if (leaf === 'stiffness') pair.stiffness = amount;
    else pair.damping = amount;
    springPairs.set(parent, pair);
  }
  byId('spring-list').innerHTML = [...springPairs.values()].map((pair) => {
    const name = pair.path.replace('system.motion.spring.', '');
    const stiffness = pair.stiffness ?? 700;
    const damping = pair.damping ?? 1;
    return motionRow(name, `k ${stiffness} / ζ ${damping}`, `data-motion-demo data-spring data-stiffness="${stiffness}" data-damping="${damping}"`, `stiffness ${stiffness} · damping ${damping}`);
  }).join('');

  document.querySelectorAll<HTMLElement>('[data-motion-demo]').forEach((row) => {
    row.querySelector<HTMLElement>('[data-motion-track]')?.addEventListener('click', () => {
      if (row.hasAttribute('data-spring')) runSpring(row); else runTransition(row);
    });
  });
}

function renderSizes(): void {
  const entries = [...tokensUnder('system.size'), ...tokensUnder('system.stroke')];
  byId('size-list').innerHTML = entries.map((entry) => {
    const value = cssValue(entry.resolved, entry.type);
    const name = entry.path.replace('system.', '');
    const px = resolvedNumber(entry.path) ?? 0;
    const size = Math.min(76, Math.max(1, px));
    return `<article class="styles-system-card"><div class="styles-system-card__preview"><span style="display:block;width:${size}px;height:${size}px;max-width:76px;max-height:76px;border:${Math.max(1,Math.min(4,px))}px solid var(--styles-ink);border-radius:4px"></span></div><strong>${escapeHtml(name)}</strong><code>${escapeHtml(value)}</code></article>`;
  }).join('');
}

function renderBreakpoints(): void {
  const entries = tokensUnder('system.layout').filter((entry) => entry.path.includes('.breakpoint') || entry.path.includes('.gridGutter') || entry.path.endsWith('.contentMaxWidth'));
  const active = currentBreakpoint();
  byId('breakpoint-list').innerHTML = entries.map((entry) => {
    const name = entry.path.replace('system.layout.', '');
    const value = cssValue(entry.resolved, entry.type);
    const highlighted = name.toLowerCase().includes(active) ? 'outline:2px solid var(--styles-ink);outline-offset:-2px;' : '';
    return `<article class="styles-system-card" style="${highlighted}"><div class="styles-system-card__preview"><strong style="font-size:26px;letter-spacing:-.04em">${escapeHtml(value)}</strong></div><strong>${escapeHtml(name)}</strong><code>${highlighted ? `ACTIVE · ${escapeHtml(value)}` : escapeHtml(value)}</code></article>`;
  }).join('');
}

function collectCssVariables(): string[] {
  const found = new Set<string>();
  const visitRules = (rules: CSSRuleList): void => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        for (const property of Array.from(rule.style)) if (property.startsWith('--sc-')) found.add(property);
      }
      if ('cssRules' in rule) {
        const nested = (rule as CSSGroupingRule).cssRules;
        if (nested) visitRules(nested);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try { if (sheet.cssRules) visitRules(sheet.cssRules); } catch { /* same-origin CSS is inspectable; skip anything else */ }
  }
  return [...found].sort();
}

function renderCssVariables(): void {
  const target = document.getElementById('css-variable-table');
  if (!target) return;
  const computed = getComputedStyle(document.documentElement);
  const variables = collectCssVariables();
  target.innerHTML = variables.map((name) => `<tr><td><code>${escapeHtml(name)}</code></td><td><code>${escapeHtml(computed.getPropertyValue(name).trim() || '—')}</code></td></tr>`).join('');
}

function renderTokens(): void {
  const tbody = byId<HTMLTableSectionElement>('token-table');
  tbody.innerHTML = flatTokens.map((entry) => {
    const resolved = cssValue(entry.resolved, entry.type);
    const alias = tokenAlias(entry.raw);
    const raw = alias ? `{${alias}}` : compactJson(entry.raw);
    const search = `${entry.path} ${entry.type} ${resolved} ${raw}`.toLowerCase();
    return `<tr data-token-row data-search="${escapeHtml(search)}"><td><code>${escapeHtml(entry.path)}</code></td><td>${escapeHtml(entry.type)}</td><td><code>${escapeHtml(resolved)}</code></td><td><code>${escapeHtml(raw)}</code></td></tr>`;
  }).join('');
}

function setupTokenFilter(): void {
  const input = byId<HTMLInputElement>('token-filter');
  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    document.querySelectorAll<HTMLTableRowElement>('[data-token-row]').forEach((row) => {
      row.hidden = Boolean(query && !(row.dataset.search ?? '').includes(query));
    });
  });
}

function replayAllMotion(): void {
  document.querySelectorAll<HTMLElement>('[data-motion-demo]').forEach((row, index) => {
    window.setTimeout(() => {
      if (row.hasAttribute('data-spring')) runSpring(row); else runTransition(row);
    }, Math.min(index * 24, 360));
  });
}

function setupNavigation(): void {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.styles-sidebar a')];
  const sections = links.map((link) => document.querySelector<HTMLElement>(link.hash)).filter((section): section is HTMLElement => Boolean(section));
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible?.target.id) return;
    links.forEach((link) => link.classList.toggle('is-active', link.hash === `#${visible.target.id}`));
  }, { rootMargin: '-15% 0px -68% 0px', threshold: [0, .2, .5] });
  sections.forEach((section) => observer.observe(section));
}

function setupThemeControls(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-theme-option]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.themeOption;
      if (value === 'system' || value === 'light' || value === 'dark') setTheme(value);
    });
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (selectedTheme === 'system') setTheme('system');
  });
}

function renderAll(): void {
  renderStatus();
  renderGrid();
  renderColors();
  renderTypography();
  renderSpacing();
  renderShapes();
  renderElevation();
  renderStates();
  renderMotion();
  renderSizes();
  renderBreakpoints();
  renderTokens();
  requestAnimationFrame(renderCssVariables);
}

async function initialize(): Promise<void> {
  setupThemeControls();
  setTheme('system');
  try {
    const response = await fetch('../tokens/design.tokens.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const source: unknown = await response.json();
    collectTokens(source);
    flatTokens = [...tokenSources.values()].map((entry) => ({ ...entry, resolved: resolveToken(entry.path) }))
      .sort((a, b) => a.path.localeCompare(b.path));
    renderAll();
    setupTokenFilter();
    setupNavigation();
    byId<HTMLButtonElement>('replay-motion').addEventListener('click', replayAllMotion);
    window.addEventListener('resize', () => {
      renderGrid();
      renderBreakpoints();
    }, { passive: true });
    window.setTimeout(replayAllMotion, 240);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    byId('system-status').innerHTML = `<div class="styles-error">No se pudo leer el sistema: ${escapeHtml(message)}</div>`;
  }
}

void initialize();
