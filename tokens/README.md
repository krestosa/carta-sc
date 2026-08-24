# Design token architecture

`tokens/design.tokens.json` is the canonical reusable design language for SushiClub web interfaces. It uses DTCG 2025.10 value shapes, aliases and standard `$type` values, while the project decides which design decisions are worth turning into tokens.

## Two layers

The file has two deliberate layers:

- `reference`: foundational values. Application CSS and TypeScript must not consume these directly.
- `system`: the public semantic API. Generated CSS and TypeScript are derived only from this layer.

This keeps raw values replaceable without coupling components to a palette, numeric scale or implementation detail.

## What becomes a token

Promote a value when it is part of the reusable visual language, is expected to appear on more than one page/component, or must stay synchronized between design, CSS and TypeScript.

Current system areas include:

- semantic light/dark colors and scrim;
- font family, weights and reusable typography roles;
- reusable corner shapes;
- the site spacing vocabulary;
- shared layout boundaries and gutters;
- accessibility sizes and strokes;
- semantic borders;
- reusable elevations;
- shared state opacity;
- global layer levels;
- shared media aspect ratios;
- motion durations, curves, transitions and spring parameters.

Only standard DTCG 2025.10 `$type` names are used. Project concepts such as `shape`, `spacing`, `layer`, `state`, `media` and `motion.spring` are groups, not custom token types. For example, corner radii and spacing use `dimension`, layer levels and spring parameters use `number`, and complete text styles use `typography`.

Do not create a token merely because a literal exists. A one-off `6px` offset remains a literal; a component-specific value that needs local overrides remains a custom property owned by that component. Tokens represent reusable decisions, not a catalog of numbers.

## Component ownership

Generated global variables are the public system API. Component variables remain private to their owner:

- `--sc-card-*` belongs to product-card;
- `--sc-modal-*` belongs to product-modal;
- `--sc-category-*` belongs to category navigation;
- feature-specific prefixes follow the same rule.

If another owner needs one of those values, either the dependency is wrong or the value should be promoted to the system token file.

## Motion ownership

Motion values are tokens because timing, easing and spring behavior form a reusable interaction language across the site. TypeScript owns orchestration, sequencing and runtime behavior.

`tokens/design.tokens.json` therefore owns durations, easing curves, transition presets and spring parameters. `tokens.generated.ts` exposes those values, and `override/motion/config.ts` composes them for the animation engine. There is no second set of hardcoded motion constants.

## Generated APIs

`npm run tokens:build` generates:

- `override/core/tokens.generated.css` for CSS;
- `override/core/tokens.generated.ts` for TypeScript.

Generated files are outputs and must not be edited by hand. Reference tokens are never emitted as public CSS variables.

## Validation

`npm run tokens:verify` validates the token document, regenerates platform outputs and runs the architecture audit. The audit rejects unsupported `$type` values, broken aliases, legacy token APIs, direct reference-layer consumption, duplicated global palette/easing literals and invalid cross-component custom-property ownership.
