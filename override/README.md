# Override architecture

`override/` contains the UX layer for the static SushiClub catalogue snapshot. The source snapshot and legacy runtime stay intact; new behavior, presentation and compatibility fixes belong here unless a change explicitly requires touching the original files.

## Source boot flow

1. Source `index.html` references `_js_dev/main.js`.
2. Source `_js_dev/main.js` uses `unversioned` as a placeholder and loads `main-legacy`, `override/main.css` and `override/main.js`.
3. Source `override/main.js` loads JavaScript in dependency stages. Independent modules in each stage download in parallel while execution order stays deterministic.
4. `override/templates/registry.js` loads component-owned `.html` template sources from `override/` and exposes them through `SC.templates`. Fixed component markup does not live in the original `index.html` and is not hardcoded inside component JS.
5. Modules that depend on fixed markup wait for the template registry before mounting.
6. `core/render-lifecycle.js` waits for the catalogue layout-ready signal and marks content already visible in the initial viewport.
7. Motion is unlocked only after the initial layout is stable; section-heading motion is initialized last.

The source flow remains readable and modular for development. It is not the network shape served by GitHub Pages.

## Pages production flow

The Pages workflow copies the exact triggering `ux` commit to `.pages-site` and transforms only that staging copy. Source files in Git are not rewritten by the production build.

The staging pipeline currently:

1. Compiles component-owned override `.html` templates into `override/templates/registry.js` inside `.pages-site`; it never injects those templates into `index.html`.
2. Stamps the exact commit SHA into deployed asset URLs.
3. Marks the catalogue banner as eager/high-priority, product images as lazy/async and adds CORS-correct Acumin preload hints.
4. Moves critical preconnect/preload hints to the start of `<head>` and preloads the exact current banner URL.
5. Bundles all override CSS into one deployed `override/main.css` while preserving source import order and rebasing relative `url(...)` values.
6. Bundles all override JavaScript modules, including the compiled template registry, into one deployed `override/main.js` while preserving the source loader order.
7. Flattens the production bootstrap so Pages executes `main-legacy -> override CSS -> override JS` directly instead of requesting `_js_dev/main.js` and using `document.write`.
8. Bundles 16 legacy local stylesheets into `_pages/legacy.css` and normalizes legacy font fallbacks to assets that actually exist.
9. Bundles 16 synchronous legacy vendor scripts into `_pages/legacy.js`.
10. Bundles the remaining two synchronous shop scripts into `_pages/shop.js`.
11. Removes snapshot-only duplicate runtime state: redundant jQuery fallback, captured GTM runtime and captured reCAPTCHA runtime/iframes while retaining the canonical GTM bootstrap and official reCAPTCHA API.
12. Removes the unused Google Maps runtime from this catalogue snapshot only when build guards prove no map markup or map-helper consumer exists.
13. Removes generated imgLiquid background-image styles in staging so product images have one download path.
14. Validates every active local HTML/CSS asset path in the final artifact.
15. Enforces production request/image budgets: exactly the expected bundled local script/stylesheet topology, no blocking remote script tags, lazy product images and one high-priority preloaded banner.
16. Runs syntax, dependency, template, bundle-integrity and stale-SHA guards before deploying the exact commit.

Production bundling is an output optimization only. Do not collapse the source modules merely because Pages serves fewer files.

## Responsibilities

- `core/`: shared configuration, utilities, accessibility helpers, prepaint/loading guards and render lifecycle.
- `templates/`: template registry infrastructure. Component markup itself stays with the component as `.html` source.
- `motion/`: GSAP/ScrollTrigger infrastructure and global UI effects. Component motion stays inside the component.
- `mutations/`: compatibility mutations against the legacy runtime. Do not place presentation CSS here.
- `features/catalog/`: catalogue-level container/grid behavior that is not owned by a single component.
- `features/content-normalizer/`: content normalization split into `rules.js` (editorial casing rules), `dom.js` (DOM/text normalization), `observer.js` (incremental MutationObserver batching) and `content-normalizer.js` (bootstrap/orchestration). The bootstrap is required runtime behavior and must stay loaded.
- `components/category-nav/`: category navigation split into core/layout, rail controls/position/sticky scheduler, indicator, active state, scroll spy, motion, compatibility styles and `category-nav.html` for fixed toolbar/arrow/indicator markup.
- `components/product-card/`: product data extraction, accessibility, content normalization, reveal/parallax motion, card-specific layout/content/pricing styles and `product-card.html` for fixed accessibility/trait-group markup.
- `components/product-modal/`: view construction, accessibility/focus isolation, controller state, motion, modal shell/content/control/responsive styles and `product-modal.html` for the fixed dialog skeleton.
- `components/cart/`: cart list reveal, sticky scroll response, badge feedback and their orchestrator.
- `components/mobile-header/`: mobile header/SlickNav adaptation.
- `components/section-heading/`: section-title layout and SplitText motion.

## HTML templates

Fixed override UI structure belongs in component-owned `.html` files, not in the legacy `index.html` and not as structural strings inside component JavaScript.

Current sources:

- `components/product-modal/product-modal.html`
- `components/category-nav/category-nav.html`
- `components/product-card/product-card.html`

`templates/registry.js` is the only generic parser/registry layer. Components call `SC.templates.clone(name)`, then populate dynamic content, bind events, manage state and mount/unmount the cloned node.

Rules:

- Every template uses `<template data-sc-template="name">` and has exactly one root element.
- Template names are unique across `override/`.
- The source registry must reference every override `.html` template source; orphan template files fail validation.
- Structural component modules must not recreate fixed UI with `document.createElement()` or `innerHTML`.
- Pages compiles the `.html` sources into the override JS bundle; production does not fetch template HTML and does not inject override templates into `index.html`.

## CSS manifest

`override/main.css` is the source CSS manifest. It imports leaf styles directly and intentionally preserves cascade order.

Rules:

- Imported CSS files must not contain further `@import` statements.
- Source imports use `?v=unversioned`; staging turns the manifest into a single production file.
- Put rules in the component or feature that owns them. Use a late compatibility stylesheet only when legacy cascade constraints require it.

## Runtime invariants

- Keep the source `index.html` snapshot unchanged for override component markup. Do not add override templates or new component structure to the legacy HTML, either in source or staging.
- All fixed new UI markup must originate from `.html` files under `override/`.
- Browser Back/Forward scroll restoration stays native. Do not add `history.scrollRestoration` handling or a manual scroll-restoration module.
- Do not use private jQuery internals such as `jQuery._data`.
- Override modules must not depend on `document.currentScript`, `import.meta` or development-loader script element IDs because Pages concatenates them into one classic production bundle.
- Keep `features/content-normalizer/content-normalizer.js` loaded.
- Preserve the existing category order and structure.
- The footer is outside the ownership of this override layer.
- Keep legacy source files intact unless an explicit source-runtime change is required; staging optimizations belong under `scripts/`.

## Pages build scripts

- `scripts/validate-overrides.mjs`: validates source override topology, JS/CSS/HTML template ownership and invariants.
- `scripts/compile-pages-templates.py`: compiles component-owned override `.html` templates into the staging template registry without touching `index.html`.
- `scripts/prepare-pages-artifact.py`: SHA stamping, initial resource hints, image loading priorities, safe map pruning and override bundle generation.
- `scripts/optimize-pages-critical-path.py`: moves critical hints to the start of `<head>` and preloads the exact current banner asset.
- `scripts/clean-pages-product-images.py`: removes generated imgLiquid product background styles from staging.
- `scripts/clean-pages-snapshot.py`: removes captured duplicate runtime state and repairs canonical third-party integrations in staging.
- `scripts/flatten-pages-bootstrap.py`: replaces the staging development bootstrap with direct production tags.
- `scripts/bundle-pages-legacy-css.py`: builds `_pages/legacy.css` and normalizes missing legacy font fallbacks.
- `scripts/bundle-pages-legacy-js.py`: builds `_pages/legacy.js`.
- `scripts/bundle-pages-shop-js.py`: builds `_pages/shop.js`.
- `scripts/validate-pages-local-assets.py`: resolves active final HTML/CSS local references and rejects missing assets.
- `scripts/validate-pages-performance-budget.py`: enforces the expected local request topology, image-loading policy and critical preloads.

Each builder is intentionally strict. If source structure changes, update the builder only after understanding the new dependency instead of weakening its guard.

## Validation

Run:

```bash
node scripts/validate-overrides.mjs
```

The Pages workflow also parses all Python build scripts, builds the staging artifact, compiles override templates, runs `node --check` on generated JavaScript bundles, validates local assets and production performance budgets, checks exact bundle source counts, verifies that component templates never appear in `index.html`, and confirms that the branch SHA is still current immediately before deploy.
