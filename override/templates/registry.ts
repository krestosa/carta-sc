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

const assetVersion = window.__scCatalogAssetVersion ?? 'unversioned';
const templateStore = new Map<TemplateName, HTMLTemplateElement>();

const registerTemplate = (name: string, markup: string): void => {
  if (!name) throw new Error('[SushiClub templates] Template sin nombre');
  if (templateStore.has(name)) throw new Error(`[SushiClub templates] Template duplicado: ${name}`);

  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  if (template.content.children.length !== 1) {
    throw new Error(`[SushiClub templates] ${name} debe tener un único elemento raíz`);
  }
  templateStore.set(name, template);
};

const registerDocument = (source: string, sourcePath: string): void => {
  const documentSource = new DOMParser().parseFromString(source, 'text/html');
  const templates = documentSource.querySelectorAll<HTMLTemplateElement>(TEMPLATE_SELECTOR);
  if (!templates.length) throw new Error(`[SushiClub templates] Sin templates en ${sourcePath}`);

  templates.forEach((template) => {
    registerTemplate((template.getAttribute(TEMPLATE_ATTRIBUTE) ?? '').trim(), template.innerHTML);
  });
};

const loadSource = async (sourcePath: string): Promise<void> => {
  const response = await fetch(`override/${sourcePath}?v=${assetVersion}`, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`[SushiClub templates] No se pudo cargar ${sourcePath} (${response.status})`);
  }
  registerDocument(await response.text(), sourcePath);
};

const installCompiledTemplates = (manifest: TemplateManifest): void => {
  for (const [name, markup] of Object.entries(manifest)) registerTemplate(name, markup);
};

export const templatesReady: Promise<void> = COMPILED_TEMPLATES
  ? Promise.resolve().then(() => installCompiledTemplates(COMPILED_TEMPLATES))
  : Promise.all(SOURCE_PATHS.map(loadSource)).then(() => undefined);

export const hasTemplate = (name: string): boolean => templateStore.has(name);

export const cloneTemplate = <T extends Element = Element>(name: string): T => {
  const template = templateStore.get(name);
  if (!template) throw new Error(`[SushiClub templates] Template no disponible: ${name}`);

  const root = template.content.firstElementChild;
  if (!root) throw new Error(`[SushiClub templates] Template vacío: ${name}`);

  const clone = root.cloneNode(true);
  if (!(clone instanceof Element)) throw new Error(`[SushiClub templates] Clon inválido: ${name}`);
  return clone as T;
};

export const templates = Object.freeze({
  ready: () => templatesReady,
  has: hasTemplate,
  clone: cloneTemplate,
});
