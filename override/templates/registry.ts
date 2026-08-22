import { moduleAssetVersion } from '../core/module-version.js';

const TEMPLATE_SELECTOR = 'template[data-sc-template]';
const TEMPLATE_ATTRIBUTE = 'data-sc-template';
const SOURCE_PATHS = [
  'components/product-modal/product-modal.html',
  'components/category-nav/category-nav.html',
  'components/product-card/product-card.html',
  'components/catalog-tools/catalog-tools.html',
] as const;

type TemplateName = string;
type TemplateManifest = Record<TemplateName, string>;

const COMPILED_TEMPLATES: TemplateManifest | null = null; /*__SC_TEMPLATE_PAYLOAD__*/
const assetVersion = moduleAssetVersion(import.meta.url);

class TemplateRegistry {
  readonly #store = new Map<TemplateName, HTMLTemplateElement>();

  register(name: TemplateName, markup: string): void {
    if (!name) throw new Error('[SushiClub templates] Template sin nombre');
    if (this.#store.has(name)) throw new Error(`[SushiClub templates] Template duplicado: ${name}`);

    const template = document.createElement('template');
    template.innerHTML = markup.trim();
    if (template.content.children.length !== 1) {
      throw new Error(`[SushiClub templates] ${name} debe tener un único elemento raíz`);
    }
    this.#store.set(name, template);
  }

  registerDocument(source: string, sourcePath: string): void {
    const documentSource = new DOMParser().parseFromString(source, 'text/html');
    const templates = documentSource.querySelectorAll<HTMLTemplateElement>(TEMPLATE_SELECTOR);
    if (!templates.length) throw new Error(`[SushiClub templates] Sin templates en ${sourcePath}`);

    for (const template of templates) {
      this.register((template.getAttribute(TEMPLATE_ATTRIBUTE) ?? '').trim(), template.innerHTML);
    }
  }

  install(manifest: TemplateManifest): void {
    for (const [name, markup] of Object.entries(manifest)) this.register(name, markup);
  }

  has(name: TemplateName): boolean {
    return this.#store.has(name);
  }

  clone<T extends Element = Element>(name: TemplateName): T {
    const template = this.#store.get(name);
    if (!template) throw new Error(`[SushiClub templates] Template no disponible: ${name}`);

    const root = template.content.firstElementChild;
    if (!root) throw new Error(`[SushiClub templates] Template vacío: ${name}`);

    const clone = root.cloneNode(true);
    if (!(clone instanceof Element)) throw new Error(`[SushiClub templates] Clon inválido: ${name}`);
    return clone as T;
  }
}

const registry = new TemplateRegistry();

async function loadSource(sourcePath: string): Promise<void> {
  const response = await fetch(`override/${sourcePath}?v=${assetVersion}`, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`[SushiClub templates] No se pudo cargar ${sourcePath} (${response.status})`);
  }
  registry.registerDocument(await response.text(), sourcePath);
}

export const templatesReady: Promise<void> = COMPILED_TEMPLATES
  ? Promise.resolve().then(() => registry.install(COMPILED_TEMPLATES))
  : Promise.all(SOURCE_PATHS.map(loadSource)).then(() => undefined);

export const hasTemplate = (name: string): boolean => registry.has(name);
export const cloneTemplate = <T extends Element = Element>(name: string): T => registry.clone<T>(name);

export const templates = Object.freeze({
  ready: () => templatesReady,
  has: hasTemplate,
  clone: cloneTemplate,
});
