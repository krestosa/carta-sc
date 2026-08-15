# Override architecture

`override/` contains the UX layer for the static SushiClub catalogue snapshot. The source snapshot and legacy runtime stay intact; new behavior, presentation and compatibility fixes belong here unless a change explicitly requires touching the original files.

## Boot flow

1. `index.html` loads `_js_dev/main.js`.
2. Source `_js_dev/main.js` uses `unversioned` as a placeholder. The Pages workflow stamps the deployed artifact with the exact commit SHA; source files are not rewritten for cache busting.
3. `override/main.js` loads JavaScript in dependency stages. Independent modules in each stage load in parallel.
4. `core/render-lifecycle.js` waits for the catalogue layout to stabilize and marks content already visible in the initial viewport.
5. Motion is unlocked only after the initial layout is stable; section-heading motion is loaded last.

## Responsibilities

- `core/`: shared configuration, utilities, accessibility helpers, prepaint/loading guards and render lifecycle.
- `motion/`: GSAP/ScrollTrigger infrastructure and global UI effects. Component motion stays inside the component.
- `mutations/`: compatibility mutations against the legacy runtime. Do not place presentation CSS here.
- `features/catalog/`: catalogue-level container/grid behavior that is not owned by a single component.
- `features/content-normalizer/`: content normalization. `content-normalizer.js` is required runtime behavior and must stay loaded.
- `components/category-nav/`: category navigation core, layout, rail controls, active state, motion and legacy compatibility styles.
- `components/product-card/`: product data extraction, accessibility, content normalization, reveal/parallax motion and card-specific layout/content/pricing styles.
- `components/product-modal/`: view construction, accessibility/focus isolation, controller state, motion and modal shell/content/control/responsive styles.
- `components/cart/`: cart list reveal, sticky scroll response, badge feedback and their orchestrator.
- `components/mobile-header/`: mobile header/SlickNav adaptation.
- `components/section-heading/`: section-title layout and SplitText motion.

## CSS manifest

`override/main.css` is the only CSS manifest. It imports leaf styles directly and intentionally preserves cascade order.

Rules:

- Imported CSS files must not contain further `@import` statements.
- Source imports use `?v=unversioned`; the Pages workflow replaces this only in the staged deploy artifact with the exact commit SHA.
- Put rules in the component or feature that owns them. Use a late compatibility stylesheet only when legacy cascade constraints require it.

## Runtime invariants

- Keep the source `index.html` snapshot unchanged for cache busting; transform only the staged Pages artifact.
- Browser Back/Forward scroll restoration stays native. Do not add `history.scrollRestoration` handling or a manual scroll-restoration module.
- Do not use private jQuery internals such as `jQuery._data`.
- Keep `features/content-normalizer/content-normalizer.js` loaded.
- Preserve the existing category order and structure.
- The footer is outside the ownership of this override layer.
- Keep legacy `_js_dev/main-legacy.js` separate from override refactors unless an explicit source-runtime change is required.

## Validation

Run:

```bash
node scripts/validate-overrides.mjs
```

The Pages workflow runs this validation before staging or deploying. It checks JavaScript syntax, loader paths and IDs, CSS manifest integrity, cache-version placeholders and the runtime invariants above.
