# Design token architecture

`tokens/design.tokens.json` is the only design-token source. It follows the Design Tokens Community Group Format Module 2025.10 vocabulary directly.

The file intentionally does not use a `$schema` property. The 2025.10 Format Module does not define one; properties beginning with `$` are reserved by the format, so adding a tool-specific `$schema` would make the source less portable rather than more conformant.

## What belongs in DTCG

A value belongs in `design.tokens.json` only when it is a product-wide design decision that is meaningful across component boundaries and can be represented with an official DTCG 2025.10 `$type`.

Current global token types:

- `color`: palette and semantic light/dark theme colors.
- `dimension`: responsive boundaries, accessibility dimensions and shared layout alignment.
- `fontFamily`: application typeface stacks.
- `fontWeight`: application font weights.
- `number`: only genuinely shared unitless values such as the product-media aspect ratio and semantic layer level.
- `typography`: semantic heading/body roles. Font size, weight, family, tracking and line height live together in the official composite.
- `border`: semantic default, strong and focus borders.

The builder accepts only official 2025.10 types. A type being supported by DTCG does not mean the project must create a token of that type.

## What does not belong in DTCG

Component geometry, one-off spacing, component radii, component shadows, local opacity, local z-index, local text sizes and similar implementation details stay with their owning CSS file as local custom properties when reuse or responsive/state override justifies a variable. Otherwise they stay as literals.

Do not create numeric token tables such as `dimension.one`, `spacing.4` or equivalent. Names must describe a design decision, not restate a raw number.

Motion is intentionally TypeScript-owned. Animation durations, easings, springs, orchestration offsets and runtime timing constants live under `override/motion/` or the feature/component TypeScript that owns them. DTCG `duration`, `cubicBezier` and `transition` are valid standard types, but this project does not use them because motion is maintained alongside the runtime.

## Penpot / Tokens Studio compatibility

Names such as `spacing`, `sizing`, `font-size`, `letter-spacing`, `border-radius`, `stroke-width`, `opacity`, `rotation`, `text-case` and `text-decoration` may appear as token categories in design tools. They are not all DTCG `$type` values.

For DTCG 2025.10 interoperability:

- spacing, sizing, font size, letter spacing, radius and stroke width are represented as `dimension`;
- opacity and rotation can only be represented as `number` when they are truly global design decisions;
- text case and text decoration are not 2025.10 token types and remain tool/platform concerns;
- complete type styles use the standard `typography` composite token.

Tool-specific metadata belongs in `$extensions` only when it is actually required. The canonical source does not depend on Penpot or Tokens Studio extensions.

## Generated platform API

`npm run tokens:build` generates:

- `override/core/tokens.generated.css`: the small CSS API for global design decisions.
- `override/core/tokens.generated.ts`: media-query constants derived from global breakpoint tokens.

Application CSS consumes those semantic generated variables rather than raw token paths. Component variables remain local to their owner.

`npm run tokens:verify` validates the DTCG file, rebuilds the generated artifacts, verifies that the committed generated files are current, and runs the architecture audit in strict mode.
