# Design token architecture

`tokens/design.tokens.json` is the canonical reusable design language for SushiClub web interfaces. It uses DTCG value shapes, aliases and standard `$type` values, while the project decides which design decisions are worth turning into tokens.

## Two layers

The file has two deliberate layers:

- `reference`: foundational values. Application CSS and TypeScript must not consume these directly.
- `system`: the public semantic API. Generated CSS and TypeScript are derived only from this layer.

This keeps raw values replaceable without coupling components to a palette, numeric scale or implementation detail.

## What becomes a token

Promote a value when it is part of the reusable visual language, is expected to appear on more than one page/component, or must stay synchronized between design, CSS and TypeScript.

Current system areas include:

- semantic light/dark colors for brand, text, icon, surfaces, borders, actions and feedback;
- font family, weights and the established reusable typography roles;
- reusable corner shapes;
- the site spacing vocabulary;
- shared container widths, page gutters, grid gaps and section rhythm;
- accessibility sizes and strokes;
- semantic borders;
- reusable elevations and stacking layers;
- shared state opacity;
- shared icon and control size scales;
- shared media aspect ratios;
- motion durations, curves, transitions and spring parameters.

Only standard DTCG `$type` names are used. Project concepts such as `shape`, `spacing`, `layout`, `layer`, `state`, `media` and `motion.spring` are groups, not custom token types.

Do not create a token merely because a literal exists. A one-off optical offset remains a literal; a component-specific value that needs local overrides remains a custom property owned by that component. Tokens represent reusable decisions, not a catalog of numbers.

## Semantic color contract

New components consume semantic intent rather than palette names:

- `system.color.<mode>.brand`
- `system.color.<mode>.text`
- `system.color.<mode>.icon`
- `system.color.<mode>.surface`
- `system.color.<mode>.border`
- `system.color.<mode>.action`
- `system.color.<mode>.feedback`

The generated color API contains only semantic intent. Owned catalog CSS and new pages consume the same canonical variables; there is no second alias layer.

## Layout contract

Page edge spacing and grid spacing are separate decisions:

- `layout.pageGutter` controls the page/container inset;
- `layout.gridGap` controls spacing between grid tracks/items;
- `layout.sectionGap` controls major vertical rhythm;
- `layout.container` defines wide, content, narrow and text widths.


## Responsive contract

Generated TypeScript exposes only the layout-oriented media contract:

- `layoutNarrow`
- `layoutCompact`
- `layoutMedium`
- `layoutIntermediate`
- `layoutBelowWide`
- `layoutWide`

The API does not publish device-category aliases.

## Component ownership

Generated global variables are the public system API. Component variables remain private to their owner:

- `--sc-card-*` belongs to product-card;
- `--sc-modal-*` belongs to product-modal;
- `--sc-category-*` belongs to category navigation;
- feature-specific prefixes follow the same rule.

If another owner needs one of those values, either the dependency is wrong or the value should be promoted to the system token file.

A private component variable may alias a system token. It should not duplicate the same reusable typography, spacing, color or motion decision as another hardcoded literal.

## Motion ownership

Motion values are tokens because timing, easing and spring behavior form a reusable interaction language across the site. TypeScript owns orchestration, sequencing and runtime behavior.

`tokens/design.tokens.json` owns durations, easing curves, transition presets and spring parameters. `tokens.generated.ts` exposes those values, and `override/motion/config.ts` composes them for the animation engine. There is no second set of hardcoded motion constants.

## Generated APIs

`npm run tokens:build` generates:

- `override/core/tokens.generated.css` for CSS;
- `override/core/tokens.generated.ts` for TypeScript.

Generated files are outputs and must not be edited by hand. Reference tokens are never emitted as public CSS variables.

## Validation

`npm run verify` validates the token document, regenerates platform outputs and runs architecture/design-system audits. The audits reject unsupported token types, broken aliases, superseded token APIs, direct reference-layer consumption, duplicated global palette/easing literals and invalid cross-component custom-property ownership.

`validate-design-system-contract.ts` additionally protects the semantic color, layout, sizing, layering, responsive-contract and base-component contracts required for the wider SushiClub site.

See `DESIGN_SYSTEM.md` for the full visual and component rules.
