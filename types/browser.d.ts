interface Window {
  SCOverride: SCOverrideApi;
  jQuery?: JQueryStaticCompat;
  $?: JQueryStaticCompat;
  __scCatalogAssetVersion?: string;
  __scInitialTheme?: string;
  __scOverrideMainBooted?: boolean;
  __scOverrideEntryBooted?: boolean;
  __scMotionCoreBooted?: boolean;
  __scStoragePolicyBooted?: boolean;
  __scContentNormalizerBooted?: boolean;
  __scRuntimeReady?: number;
  __scAfterRuntime?: Array<() => void>;
  __scLoadRecaptcha?: () => void;
}

type Cleanup = () => void;
type ThemeModeCompat = 'system' | 'light' | 'dark';
type ThemeResolvedCompat = 'light' | 'dark';

interface JQuerySlicknavCompat { btn?: ArrayLike<HTMLElement>; }
interface JQueryCollectionCompat {
  [index: number]: Element | undefined;
  find(selector: string): JQueryCollectionCompat;
  first(): JQueryCollectionCompat;
  off(events?: string, handler?: EventListenerOrEventListenerObject | ((event: Event) => void)): JQueryCollectionCompat;
  on(events: string, handler: EventListenerOrEventListenerObject | ((event: Event) => void)): JQueryCollectionCompat;
  data(key: string): JQuerySlicknavCompat | undefined;
}
interface JQueryStaticCompat {
  (target: string | Element | Document | EventTarget | null): JQueryCollectionCompat;
}

interface SCMediaConfig {
  phone: string; mobile: string; tablet: string; compact: string; compactWide: string; desktop: string;
  reducedMotion: string; reducedTransparency: string; moreContrast: string; forcedColors: string;
}
interface SCQueries {
  phone: MediaQueryList; mobile: MediaQueryList; tablet: MediaQueryList; compact: MediaQueryList; compactWide: MediaQueryList; desktop: MediaQueryList;
  reducedMotion: MediaQueryList; reducedTransparency: MediaQueryList; moreContrast: MediaQueryList; forcedColors: MediaQueryList;
}
interface SCSelectors {
  container: string; productList: string; productCard: string; productCards: string; productLink: string; productTitle: string;
  productDescription: string; productTraits: string; sectionTitle: string; sectionSubtitle: string; categoryToolbar: string;
  legacyPullDownOpen: string; legacyMobileOpen: string;
}
interface SCClasses { catalogLayoutReady: string; catalogSearching: string; staticInitialSection: string; }
interface SCMotionConfig { geometryRefreshDelay: number; easings: { out: string; strongOut: string; in: string; inOut: string; }; }
interface SCConfig { media: SCMediaConfig; queries: SCQueries; selectors: SCSelectors; classes: SCClasses; motion: SCMotionConfig; }

interface SCUtilsApi {
  text(node: Node | null | undefined): string;
  ready(fn: () => void): void;
  each<T>(list: ArrayLike<T> | null | undefined, fn: (value: T, index: number) => void): void;
  matches(node: Element | null | undefined, selector: string): boolean;
  visible(node: HTMLElement | null | undefined): boolean;
  refreshMotion(delay?: number | null): void;
}
interface SCMotionApi {
  ready(): Promise<MotionDeps>; prepare(): Promise<MotionDeps>;
  whenLoaded(fn: (deps: MotionDeps) => void): void; whenReady(fn: (deps: MotionDeps) => void): void;
  run(fn: (deps: MotionDeps) => void): boolean; runLoaded(fn: (deps: MotionDeps) => void): boolean;
  refresh(delay?: number | null): void; reduced(): boolean;
  bindMicroInteraction?(control: HTMLElement, target: HTMLElement | SVGElement, options?: Record<string, unknown>): Cleanup;
  unlock(): void; isReady(): boolean; isLoaded(): boolean;
}
interface SCTemplatesApi { ready(): Promise<void>; has(name: string): boolean; clone(name: string): Element; }
interface SCScrollState { programmatic: boolean; suppressRevealUntil: number; }
interface SCRevealGate { headings: boolean; cards: boolean; released: boolean; release(): void; mark(part: 'headings' | 'cards'): void; }

interface SCProductCardDataApi {
  imageSource(card: HTMLElement): string; cleanPriceText(node: Element | null): string; ensureId(node: HTMLElement | null, base: string): string;
  traitLabels(source: ParentNode | null): string[]; buildTraitGroup(card: HTMLElement, className?: string): HTMLElement | null;
  traitsLabelPrefix: string; createTraitIcon(label: string): SVGSVGElement | null;
  appendTraitVisual(group: HTMLElement, source: ParentNode | null, label: string): Element | null; ignoredTrait(label: string): boolean;
}
interface SCProductCardContentApi {
  clearFlavorRows(root?: ParentNode): void; installTraitReferences(): void; installFlavorRow(link: HTMLElement | null): void; installFlavorRows(root?: ParentNode): void;
  buildTraitRow(className: string, labels: string[], source: ParentNode): HTMLSpanElement; positionTraitReferences(): void;
  ensureDescriptionCopy(target: Element | null): HTMLElement | null; measureDescriptions(): void; scheduleDescriptionMeasure(): void; cancelDescriptionMeasure(): void;
}
interface SCProductCardA11yApi { enhanceLink(link: HTMLElement): void; enhanceHeadings(): void; enhanceAll(root?: ParentNode): void; }
interface SCProductCardMotionApi { install(card: HTMLElement): Cleanup | void; reflow(): void; }
interface SCProductCardApi {
  imageSource(card: HTMLElement): string; traitLabels(source: ParentNode | null): string[]; buildTraitGroup(card: HTMLElement, className?: string): HTMLElement | null;
  enhanceProductLinks(root?: ParentNode): void; refresh(root?: ParentNode): void; repair(): void; init(): void; destroy(): void;
}
interface SCProductCardMotionPartsApi { setupReveal(engine: MotionEngine, profile: { initialY?: number; revealY?: number; threshold?: number }, reduce: boolean): Cleanup; revealViewport?: (() => void) | null; }

interface SCProductModalSelectors { dialog: string; }
interface SCProductModalViewApi { build(link: HTMLElement): HTMLElement | null; }
interface SCProductModalA11yApi {
  focusableElements(dialog: HTMLElement): HTMLElement[]; lockBackground(modal: HTMLElement): Cleanup;
  trapTab(modal: HTMLElement, event: KeyboardEvent): void; containFocus(modal: HTMLElement | null, event: FocusEvent): void;
}
interface SCProductModalMotionApi { open(modal: HTMLElement | null, source: HTMLElement | null): void; reopen(modal: HTMLElement | null, source: HTMLElement | null): void; close(modal: HTMLElement | null, done?: Cleanup | null): void; cancel(modal: HTMLElement | null): void; }
interface SCProductModalApi { open(link: HTMLElement): void; close(): void; getActive(): HTMLElement | null; isClosing(): boolean; init(): void; destroy(): void; }

interface SCCartScrollProfile { maxLag: number; velocityScale: number; }
interface SCCartPartsApi {
  setupBadges(engine: MotionEngine, reduce: boolean): Cleanup;
  setupList(engine: MotionEngine, reduce: boolean): Cleanup;
  setupScroll(engine: MotionEngine, profile: SCCartScrollProfile, reduce: boolean): Cleanup;
}

interface SCThemePaletteSnapshot { [key: string]: string; }
interface SCThemePaletteContext { from: SCThemePaletteSnapshot; to: SCThemePaletteSnapshot; duration: number; token: number; fade: boolean; }
interface SCCatalogSearchApi { install(root: HTMLElement): Cleanup; apply(root: HTMLElement, query: string): void; destroy(): void; getFilters(): string[]; }
interface SCCatalogThemePaletteApi { animate(before: string | SCThemePaletteSnapshot, commit: Cleanup, prepared?: (context: SCThemePaletteContext) => void): SCThemePaletteContext; kill(): void; }
interface SCCatalogThemeApi { install(root: HTMLElement): Cleanup; seed(root: HTMLElement): ThemeModeCompat; apply(root: HTMLElement, mode: string, persist: boolean): void; sync(): void; getMode(): ThemeModeCompat; getResolved(): ThemeResolvedCompat; }
interface SCCatalogViewApi { install(root: HTMLElement): Cleanup; apply(root: HTMLElement, mode: string, persist: boolean): void; refreshLayout(switching?: boolean | null): void; sync(): void; destroy(): void; }
interface SCCatalogToolsApi {
  search?: SCCatalogSearchApi; themePalette?: SCCatalogThemePaletteApi; theme?: SCCatalogThemeApi; view?: SCCatalogViewApi;
  init?: () => void; destroy?: () => void; mount?: () => HTMLElement | null; repair?: () => void;
}

interface SCCategorySelectors { select: string; scroller: string; mobileWrapper: string; mobileRail: string; mobileScroller: string; }
interface SCCategoryIndicatorApi { move(target: Element | null, animateMotion: boolean): void; markDirty(): void; isDirty(): boolean; pause(): void; resume(): void; }
interface SCCategorySubmenuApi { scan(): void; has(parent: HTMLAnchorElement | null): boolean; open(parent: HTMLAnchorElement, pin?: boolean): boolean; close(restoreFocus: boolean): void; position(): void; }
interface SCCategoryNavApi {
  selectors: SCCategorySelectors; currentMarkOffset: number; mq: MediaQueryList;
  interruptAutoScroll(): void; resolveAnchor(href: string | null): HTMLElement | null; anchor(href: string | null): HTMLElement | null;
  parentLink(link: Element): boolean; links(root?: ParentNode): HTMLAnchorElement[]; subcategoryOwner(link: Element | null): HTMLElement | null;
  offset(): number; invalidateOffset(): void; closeLegacy(): void; cleanHash(): void; scrollToTarget(target: HTMLElement, plan?: { y: number; distance: number; duration: number }): void;
  onCategory(event: MouseEvent): void; onSelect(event: Event): void; isAutoScrolling(): boolean;
  railPosition: { centerActive(scroller: HTMLElement): void; revealActive(scroller: HTMLElement, previous: Element | null, target: Element | null): void; }; centerActive(scroller: HTMLElement): void; revealActive(scroller: HTMLElement, previous: Element | null, target: Element | null): void;
  railControls: { overflow(host: HTMLElement | null, scroller: HTMLElement | null): void; hide(host: HTMLElement | null): void; };
  categorySubmenu: SCCategorySubmenuApi; syncLayout(): void; scheduleRailState(): void; refreshSections(): void; repairStructure(): void; init(): void; destroy(): void;
  holdSpy(target: HTMLElement | null): void; releaseSpyHold(): void; refreshMetrics(): void; current(): HTMLElement | null; scheduleSpy(): void; stopSpy(): void;
  categoryActive: { current(): HTMLElement | null; set(target: HTMLElement | null, animate: boolean): void; }; setActive(target: HTMLElement | null, animate: boolean): void;
  layout(): void; semantics(): void; restoreStyles(): void;
  scheduleRail(): void; scheduleOverflow(): void; scheduleSticky(): void; requestCenterActive(previous: Element | null, target: Element | null): void; railState(): void; cancelRailState(): void;
  categoryIndicator: SCCategoryIndicatorApi; moveIndicator(target: Element | null, animateMotion: boolean): void; stickyState: { set(host: HTMLElement | null, stuck: boolean): void; };
  installMotion?: Cleanup | null;
}

interface EditorialState { sentenceStart: boolean; words: number; }
interface SCContentNormalizerRulesApi { titlePeriodClean(value: string): string; smartCase(value: string, state: EditorialState, removePeriods: boolean): string; }
interface SCContentNormalizerDomApi { selector: string; normalizeHost(host: Element | null | undefined): void; normalizeCatalogue(): void; collect(node: Node | null | undefined, target: Set<Element>): void; }
interface SCContentNormalizerObserverApi { observe(): void; disconnect(): void; }
interface SCContentNormalizerApi { locale: string; rules: SCContentNormalizerRulesApi; dom: SCContentNormalizerDomApi; observer: SCContentNormalizerObserverApi; init?: () => void; destroy?: () => void; }
interface SCMutationsApi {
  cleanCategoryHash?: () => void; closeLegacyCategoryMenus?: () => void; disconnectLegacyDom?: () => void; restoreNativeHistory?: () => void;
  scanLegacyDom?: (root: Node) => void; stripLegacyHoverHandlers?: () => void; legacyCategoryHover?: { init(): void; destroy(): void; };
  domNormalization?: { init(): void; destroy(): void; scan(root: Node): void; };
}
interface SCRenderLifecycleApi { markInitialViewport(): void; freezeInitialViewport(): void; waitForStableLayout(): Promise<void>; }
interface SCImagePreloaderApi { start(): void; scan(root?: ParentNode | Node): void; destroy(): void; warmCache(img: HTMLImageElement | null): void; loadAllInBatches: boolean; cacheImages: boolean; }
interface SCMobileHeaderApi { repair(): void; schedule(): void; init(): void; destroy(): void; }
interface SCSectionHeadingApi { init(): void; destroy(): void; cleanup(): void; }
interface SCGlobalUiMotionApi { init(): void; destroy(): void; }

interface SCOverrideApi {
  config: SCConfig; utils: SCUtilsApi; motion: SCMotionApi; templates: SCTemplatesApi; scrollState: SCScrollState; catalogRevealGate: SCRevealGate;
  productCardData: SCProductCardDataApi; productCardContent: SCProductCardContentApi; productCardA11y: SCProductCardA11yApi; productCardMotion: SCProductCardMotionApi; productCard: SCProductCardApi; productCardMotionParts: SCProductCardMotionPartsApi;
  productModalSelectors: SCProductModalSelectors; productModalView: SCProductModalViewApi; productModalA11y: SCProductModalA11yApi; productModalMotion: SCProductModalMotionApi; productModal: SCProductModalApi;
  cartParts: SCCartPartsApi; catalogTools: SCCatalogToolsApi; categoryNav: SCCategoryNavApi; contentNormalizer: SCContentNormalizerApi; mutations: SCMutationsApi;
  renderLifecycle: SCRenderLifecycleApi; imagePreloader: SCImagePreloaderApi; mobileHeader: SCMobileHeaderApi; sectionHeading: SCSectionHeadingApi; globalUiMotion: SCGlobalUiMotionApi; theme: SCCatalogThemeApi; storagePolicy: { allowedLocalStorage: readonly string[]; audit(): void; };
  __cartBadgeMotionBooted?: boolean; __cartComponentBooted?: boolean; __cartListMotionBooted?: boolean; __cartScrollMotionBooted?: boolean;
  __catalogThemeControllerBooted?: boolean; __catalogThemePaletteBooted?: boolean; __catalogToolsBooted?: boolean; __catalogToolsSearchBooted?: boolean; __catalogToolsViewBooted?: boolean;
  __categoryNavActiveStateBooted?: boolean; __categoryNavBooted?: boolean; __categoryNavCoreBooted?: boolean; __categoryNavIndicatorBooted?: boolean; __categoryNavLayoutBooted?: boolean; __categoryNavRailBooted?: boolean; __categoryNavRailControlsBooted?: boolean; __categoryNavRailPositionBooted?: boolean; __categoryNavScrollSpyBooted?: boolean; __categoryNavStickyStateBooted?: boolean;
  __contentNormalizerDomBooted?: boolean; __contentNormalizerObserverBooted?: boolean; __contentNormalizerRulesBooted?: boolean; __domNormalizationBooted?: boolean; __globalUiMotionBooted?: boolean; __historyMutationBooted?: boolean; __imagePreloaderBooted?: boolean; __legacyCategoryHoverBooted?: boolean; __mobileHeaderBooted?: boolean;
  __productCardA11yBooted?: boolean; __productCardBooted?: boolean; __productCardContentBooted?: boolean; __productCardDataBooted?: boolean; __productCardMotionBooted?: boolean; __productCardRevealMotionBooted?: boolean; __productModalA11yBooted?: boolean; __productModalBooted?: boolean; __productModalMotionBooted?: boolean; __productModalViewBooted?: boolean; __renderLifecycleBooted?: boolean; __sectionHeadingBooted?: boolean; __templateRegistryBooted?: boolean;
}

interface Window {
  __scLegacyMainLoaderBooted?: boolean;
}
interface Storage {
  __scPersistenceGuard?: boolean;
}
interface SVGElement { __scViewIconMotion?: MotionHandle[] | null; }
interface HTMLElement {
  __scCategoryConfirm?: Animation | null;
  __scModalMotionToken?: number;
  __scImagePriorityAssigned?: boolean;
}
interface MotionHandle {
  cancel(): void;
  finish(): void;
  active(): boolean;
}
interface MotionTweenOptions { delay?: number; onComplete?: () => void; }
interface MotionPropertyOptions extends MotionTweenOptions { duration: number; ease?: string; clear?: boolean; }
interface MotionTransformState { x: number; y: number; scale: number; rotation: number; }
interface MotionEngine {
  tween(duration: number, ease: string | undefined, update: (progress: number) => void, options?: MotionTweenOptions): MotionHandle;
  delay(seconds: number, callback: () => void): MotionHandle;
  transform(target: HTMLElement | SVGElement, to: Partial<MotionTransformState>, options: MotionPropertyOptions): MotionHandle;
  opacity(target: HTMLElement | SVGElement, to: number, options: MotionPropertyOptions): MotionHandle;
  attributes(target: Element, to: Record<string, number>, options: MotionPropertyOptions): MotionHandle;
  path(target: SVGPathElement, toD: string, options: MotionPropertyOptions): MotionHandle;
  currentTransform(target: HTMLElement | SVGElement): MotionTransformState;
  ease(name: string | undefined, progress: number): number;
}
interface MotionDeps { engine: MotionEngine; }
