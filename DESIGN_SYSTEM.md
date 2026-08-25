# SushiClub Web Design System

This document is the visual contract for new SushiClub web work. It does not define page runtime architecture. The canonical values live in `tokens/design.tokens.json`; generated CSS and TypeScript are outputs.

## 1. Token model

The token source has two layers:

- `reference`: raw values. Application CSS and TypeScript never consume this layer directly.
- `system`: semantic decisions that form the public API.

A value becomes a system token only when it is reusable across pages/components or must remain synchronized between CSS and TypeScript. One-off optical adjustments stay local.

Generated APIs:

- `override/core/tokens.generated.css`
- `override/core/tokens.generated.ts`

Never edit generated files by hand.

## 2. Color

New components use semantic groups, not palette names:

- `brand`: primary brand action and its foreground.
- `text`: primary, secondary, muted, disabled, inverse and link.
- `icon`: primary, secondary, muted and inverse.
- `surface`: canvas, subtle, raised, overlay, inverse and transparent.
- `border`: subtle, default, strong and focus.
- `action`: primary, on-primary, selected and disabled.
- `feedback`: error, success, warning and info; each has default, surface, border and on-color.

All owned CSS consumes the semantic variables directly, including `--sc-color-text-primary`, `--sc-color-text-heading`, `--sc-color-surface-canvas` and `--sc-color-action-primary`. The generated API exposes one canonical name per design decision.

Do not add page-specific campaign palettes to the global system unless the same decision is intended to be reused across SushiClub.

## 3. Typography

The current roles remain the shared type vocabulary:

- heading 1–4
- body large, body and body small
- label and label strong
- price and price large

Do not create a new typography role for a single component. Component geometry can be local, but a repeated text style should consume one of the shared roles or be promoted only after cross-page reuse is established.

Component variables may alias typography tokens, but must not duplicate the same font size, line-height or tracking as independent literals.

## 4. Spacing and shape

Reusable spacing follows a 4px rhythm. The private `reference.spacing` layer contains numeric 4px-aligned primitives only when a semantic system decision needs them; application code never consumes that layer directly.

The public component-spacing scale stays deliberately compact:

`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`

Do not publish every multiple of 4 as a system token. Values such as 20px or 28px belong to semantic layout roles when they describe page gutters or grid gaps, rather than becoming generic component spacing. Large editorial whitespace belongs to section rhythm. Optical corrections and breakpoint-specific tuning that are not shared decisions can remain local.

Shared shapes cover none, menu, control, card, dialog and full/pill. Do not fill numerical gaps merely because a literal appears once.

## 5. Layout

Global layout decisions are separate from component geometry:

- container widths: wide, content, narrow and text;
- page gutter: outer page inset;
- grid gap: spacing between grid tracks/items;
- section gap: compact (32px), default (48px), spacious (64px), expanded (80px) and immersive (96px).

Use `--sc-layout-page-gutter` for the page edge and `--sc-layout-grid-gap` for grid item separation. They are independent decisions even when a breakpoint currently gives them the same value.

The wider section rhythm is intentional for editorial, promotional and campaign compositions that rely on negative space. Responsive pages may interpolate between semantic endpoints with `clamp()`, but should not create a new global spacing token for each intermediate breakpoint value.

Reusable layout classes live in `override/core/layout-primitives.css`:

- `.sc-container`
- `.sc-section` with `--compact`, `--spacious`, `--expanded` and `--immersive` rhythm modifiers
- `.sc-stack`
- `.sc-cluster`
- `.sc-grid`

These are layout primitives, not page components. Page-specific composition stays local.

## 6. Responsive contract

TypeScript consumes one layout-oriented media vocabulary:

- `layoutNarrow`: up to 640px;
- `layoutCompact`: up to 767px;
- `layoutMedium`: 768–992px;
- `layoutIntermediate`: 641–992px;
- `layoutBelowWide`: up to 992px;
- `layoutWide`: 993px and above.

Names describe layout ranges rather than device categories.

CSS media queries must use the same breakpoint values represented by the token source. A new breakpoint requires a demonstrated layout need, not a device model.

## 7. Sizes

Shared icon sizes:

- small: 16px
- medium: 20px
- large: 24px

Shared control sizes:

- small: 40px
- medium: 48px
- large: 56px

The minimum touch target remains 48px. A visually smaller control must preserve an effective accessible target when used on touch surfaces.

Component-specific artwork dimensions, such as product trait icons, remain local.

## 8. Elevation and layers

Elevation expresses visual depth; layer tokens express stacking order. Do not substitute one for the other.

Global stacking order:

`base < raised < sticky < dropdown < popover < drawer/mobile navigation < toast < modal < tooltip`

New overlay-like components must consume the appropriate layer token rather than inventing a `z-index`.

## 9. Motion

Motion tokens define duration, easing and spring language. Components own sequencing and orchestration.

Do not create component-specific global motion tokens such as `buttonDuration` or `homeAnimation`. Reuse the existing duration/easing/spring vocabulary and keep choreography local.

Every animated component must define reduced-motion behavior.

## 10. Component custom properties

A component may own private custom properties for internal geometry:

- `--sc-card-*`
- `--sc-modal-*`
- `--sc-category-*`
- equivalent owner-specific prefixes

A private property must not be consumed by another owner. If two independent components need the same design decision, promote that decision to the system token source rather than sharing a private property.

## 11. TypeScript variables and selectors

`override/core/variables.ts` contains global media-query access plus the selectors/classes required by the current catalog host document.

Rules for new work:

- visual values never become handwritten TypeScript constants when a system token already exists;
- shared visual values come from `systemTokens`;
- global responsive state comes from generated `tokenMedia`/`queries`;
- selectors and state classes specific to a component belong with that component, not in a growing global selector registry;
- host-document selectors are integration boundaries, not naming examples for new components.

## 12. Class and state naming

New visual classes use the `sc-` namespace and a component/element/modifier structure:

```html
<button
  class="sc-button sc-button--primary"
  data-sc-reservation-submit
  aria-busy="false">
  Reservar
</button>
```

Use:

- class names for styling;
- `data-sc-*` hooks for JavaScript behavior/ownership;
- ARIA attributes for semantic state when a matching ARIA state exists.

Avoid generic new state classes such as `.active`, `.open`, `.selected` or `.disabled`.

## 13. Required component states

Interactive components define the states that apply to their semantics.

| State | Contract |
| --- | --- |
| default | required |
| hover | when hover is available |
| focus-visible | required |
| pressed | actions/toggles |
| selected | selectable controls |
| disabled | controls that can be unavailable |
| loading / busy | asynchronous actions |
| invalid / error | form controls |
| light/dark | required through semantic tokens |
| forced colors | required for controls |
| reduced motion | required when animated |

State styling should use native pseudo-classes and ARIA attributes before inventing custom state classes.

## 14. Base visual components

`override/components/base/base.css` defines reusable visual contracts for:

- Button: primary, secondary, tertiary and danger.
- Icon button.
- Form field/control/helper/message.
- Chip and Badge.
- Tabs.
- Surface.
- Divider.
- Popover and Dialog shells.
- Alert.
- Empty state.
- Loading indicator.
- Toast.

These styles intentionally do not own page behavior. Product cards, reservation workflows, benefits cards and other domain components compose these decisions without becoming generic all-purpose components.

## 15. Accessibility

Global accessibility primitives include:

- 48px touch target;
- visible focus contract;
- screen-reader-only utility;
- increased contrast handling;
- reduced transparency;
- forced colors;
- reduced motion.

New component CSS owns its component-specific accessibility states. `core/a11y.css` contains global accessibility rules; feature-specific fixes remain with their owning component.

## 16. Creating a token

Create a system token only if at least one applies:

1. the decision repeats across independent components/pages;
2. it is a brand/system rule;
3. CSS and TypeScript must share it;
4. changing it should intentionally update multiple surfaces.

Otherwise keep it local.

Never add raw palette names (`blue500`, `gray3`) to the public system API. Raw values belong in `reference`; public values describe intent.

## 17. Creating a component

Before adding a component:

1. verify that an existing base component cannot express the interaction;
2. identify which design decisions are global tokens and which geometry is local;
3. use `sc-` styling classes and `data-sc-*` behavior hooks;
4. define semantic states and accessibility behavior;
5. support both themes through semantic color variables;
6. consume shared motion/layout primitives instead of reproducing them;
7. keep private custom properties inside the component owner.

## 18. Validation

`npm run verify` regenerates token outputs and audits design-token usage. The design-system contract validator additionally checks that required semantic foundations and base visual files remain present.

Warnings about a tokenizable literal should be resolved when the literal is a shared decision. Do not silence the audit by creating meaningless tokens.
