# Design token architecture

`design.tokens.json` is the only design-token source. It follows the DTCG Format Module 2025.10 vocabulary and contains only application-wide, platform-agnostic design decisions.

## Ownership rule

A value belongs in `design.tokens.json` only when all of these are true:

1. It represents a design decision rather than implementation mechanics.
2. It is meaningful across multiple components or platforms.
3. Changing it is expected to update the product systemically.
4. Its value can be expressed with an official DTCG 2025.10 `$type`.

Examples: semantic theme colors, the primary font family and weights, accessibility focus/touch dimensions, shared motion duration/easing vocabulary, and shared semantic borders.

A value belongs in a component or feature CSS custom property when it is owned by that UI unit and is reused, overridden by state/theme/responsiveness, or improves readability. Examples: modal radius, submenu shadow, filter-chip height, sticky-shadow opacity, component z-index, and component typography sizes.

A value belongs in local TypeScript configuration when it controls runtime implementation rather than visual-system semantics. Examples: spring physics, orchestration delays, animation offsets, batching policy, and measurement tolerances.

A one-off value stays a literal when naming it would not add semantics or reuse.

## Boundaries

- Do not create additional `*.tokens.json` documents for components.
- Do not create numeric token tables such as `dimension.one`, `dimension.two`, etc.
- Do not invent `$type` values. The builder accepts only the DTCG 2025.10 types.
- The standard defines an allowed type vocabulary; the project does not need to instantiate every type.
- Springs are not a DTCG 2025.10 token type and remain runtime motion configuration.
- Application CSS does not consume canonical `--sc-token-*` variables directly. Generated semantic platform aliases such as `--sc-color-*`, `--sc-font-*`, `--sc-motion-*`, `--sc-transition-*`, `--sc-border-*`, `--sc-focus-*`, and `--sc-touch-target` form the CSS API.
- Application TypeScript consumes generated token data only through the owning adapters (`core/variables.ts` for media and `motion/config.ts` for motion).
- `tokens.generated.css` and `tokens.generated.ts` are build artifacts and must never be edited by hand.

`npm run tokens:verify` validates the DTCG document, regenerates platform artifacts, and runs the architecture audit in strict mode.
