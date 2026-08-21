# Native TypeScript Rewrite Contract

This document defines the architectural and implementation rules for every owned TypeScript source in this repository. It is a project contract: new work and refactors must preserve these rules unless the contract itself is deliberately changed.

## 1. Primary goal

All owned `.ts` files must read and behave as code designed natively for TypeScript.

A valid rewrite is not a syntax conversion, file-extension change, formatter pass, or type layer wrapped around script-style code. The implementation must be designed from the current domain, behavior, dependencies, lifecycle, state and build requirements.

Behavior is the compatibility contract. Internal structure is free to change when that produces clearer, safer and more maintainable TypeScript.

## 2. Functional preservation

A rewrite must preserve the observable product unless a separate task explicitly changes behavior.

This includes:

- UI behavior and interaction semantics.
- Animation timing, easing, delays, offsets, scales, states and cancellation behavior.
- Responsive behavior on mobile, tablet and desktop.
- Firefox compatibility.
- Accessibility behavior and ARIA contracts.
- DOM contracts required by the existing site.
- Persisted preferences and storage behavior.
- Category navigation, scrolling, sticky states and search behavior.
- Modal, cart, product-card and mobile-menu behavior.
- Pages generation.
- Handoff generation and validation.
- CI and workflow contracts.

A cleaner architecture is not an acceptable reason to silently remove or alter a feature.

## 3. TypeScript-native module architecture

Owned code must use ES modules and explicit dependencies.

Preferred mechanisms:

- `import` and `export`.
- Small composition roots.
- Explicit constructors, factories or initializer functions when lifecycle is required.
- Pure functions for stateless transformations.
- Classes only when identity, encapsulated state or lifecycle genuinely benefits from them.
- Domain-oriented modules instead of generic utility dumping grounds.

Avoid script-order dependency. A module must not depend on another source merely having executed earlier unless it is an unavoidable external compatibility boundary.

## 4. Patterns that must not be reintroduced

Owned TypeScript must not regress to script-style architecture such as:

- IIFEs used as module boundaries.
- `'use strict'` boilerplate.
- `var`.
- application namespaces mounted on `window`.
- `window.__somethingBooted` initialization flags.
- service locators implemented through global objects.
- private state attached as ad-hoc properties to DOM nodes.
- implicit dependency discovery through globals.
- giant functions that own unrelated responsibilities.
- generated/minified JavaScript pasted into TypeScript source.
- regex patching of compiled JavaScript when the behavior can be represented in typed source or an explicit build contract.
- source-code validators that depend on incidental formatting or local variable names instead of semantic contracts.
- preserving an old function shape solely because the previous implementation used it.

An `init()` or factory is valid only when lifecycle semantics require it. It must not exist just to wrap an entire former script.

## 5. Types must model the domain

Types should describe actual concepts rather than silence the compiler.

Use, where appropriate:

- interfaces for stable object contracts;
- type aliases for unions and compositions;
- discriminated unions for state machines;
- literal unions for finite modes;
- `readonly` for immutable data;
- `as const` for token/configuration objects;
- generics when they preserve meaningful relationships between types;
- narrow DOM element types;
- explicit event types;
- explicit cleanup/lifecycle contracts.

Do not add abstraction only to make the code look more typed.

The following are not acceptable escape hatches in owned code except for an externally justified boundary with a documented reason:

- `any`;
- `@ts-ignore`;
- `@ts-nocheck`;
- broad casts that hide an incorrect model;
- `Record<string, unknown>` used as a substitute for understanding the structure;
- repeated non-null assertions used to bypass lifecycle problems.

## 6. Global, domain and local variables

Shared values follow a hierarchy comparable to design tokens in CSS/Sass.

### Project-wide configuration

Values genuinely shared across unrelated features belong in focused shared modules such as:

- breakpoints/media queries;
- selectors that form a cross-feature DOM contract;
- storage keys;
- motion tokens;
- global runtime configuration;
- shared semantic constants.

These values should normally be immutable and typed using `const`, `readonly` and/or `as const`.

### Domain configuration

Values shared only inside one feature belong to that feature, for example cart motion values, category-scroll constants or modal geometry.

Do not promote a value to global configuration simply because more than one function in the same feature uses it.

### Module-local values

Implementation details that are only meaningful inside one module stay private to that module and are not exported.

### Mutable state

Mutable state must have a clear owner.

Prefer:

- private class fields;
- closures returned by a factory when a class is unnecessary;
- `WeakMap` / `WeakSet` for state associated with DOM objects;
- dedicated state objects when multiple functions intentionally share lifecycle state.

Avoid unexplained module-level mutable state when ownership can be made explicit.

## 7. Global browser state

Owned application behavior should not live on `window` by default.

A browser global is acceptable only for a real interoperability boundary with existing external/legacy code or hosting infrastructure. Such globals must be:

- minimal;
- typed in `types/browser.d.ts`;
- named for the boundary rather than for internal implementation details;
- removed when the boundary disappears.

Internal modules must communicate through imports, return values, typed events or explicit dependency injection rather than application globals.

## 8. DOM ownership

DOM code must use the most specific practical element type.

Examples:

- `HTMLButtonElement` for buttons;
- `HTMLInputElement` for inputs;
- `HTMLImageElement` for images;
- `SVGPathElement` for SVG paths.

Runtime narrowing is preferred over blind casting.

State must not be hidden on arbitrary DOM properties. Use `dataset` only for actual DOM-facing metadata. Use `WeakMap` for private runtime state.

Selectors that form a stable application contract may be centralized. Selectors specific to a component should remain local to the component.

## 9. Lifecycle and cleanup

Any module that installs listeners, observers, animation handles, timers or generated DOM must have explicit ownership and cleanup.

Typical lifecycle contracts may use:

- `mount` / `destroy`;
- `start` / `stop`;
- an initializer returning a `Cleanup` function;
- a controller with explicit lifecycle methods.

The chosen shape should fit the feature rather than force every feature into the same pattern.

Required cleanup includes, where applicable:

- event listeners;
- `MutationObserver`;
- `IntersectionObserver`;
- `ResizeObserver`;
- requestAnimationFrame handles;
- timers;
- active motion handles;
- temporary DOM nodes;
- modified global/browser state owned by the module.

Duplicate initialization must not multiply listeners or observers.

## 10. Motion architecture

Motion is repository-owned and self-contained.

Animation features should depend on typed local motion contracts and shared motion tokens rather than external runtime globals.

Preserve:

- easing semantics;
- durations;
- delays/stagger;
- offsets and scale values;
- interruption behavior;
- reduced-motion paths;
- exact final geometry/state.

Animation state associated with elements should use explicit ownership, normally `WeakMap` plus cancellable handles.

Do not encode component animation behavior inside a generic motion engine when the behavior belongs to a component.

## 11. Build and Pages architecture

The browser runtime is an ES-module graph. The build system must understand and preserve that model rather than reconstruct a classic-script architecture.

Rules:

- TypeScript compilation produces the browser module graph.
- Pages must deliver module entrypoints with the correct `type="module"` contract.
- Module syntax must be validated as module syntax, not CommonJS/classic-script syntax.
- Build steps should transform artifacts through explicit typed operations.
- Do not regex-patch compiled application JavaScript to change application semantics when the same behavior can live in source TypeScript or an explicit generated-loader contract.
- Generated loaders should be readable modern JavaScript produced from structured TypeScript logic, not compressed ES5-style source strings.
- Asset versioning and import rewriting must preserve the module graph.

Build-only behavior belongs to the build pipeline. Shared runtime modules should not contain Pages-specific state unless the browser application itself genuinely owns that state.

## 12. Tooling, validators and Handoff

The TypeScript-native requirement applies to tooling too, including:

- `lab/pages`;
- `lab/handoff`;
- `scripts`;
- validators;
- build helpers.

Tooling must not remain as compressed procedural code merely because it does not ship to the browser.

Validators must test semantic contracts rather than exact incidental source formatting.

Examples of good validation targets:

- a literal union exposes only the allowed view modes;
- the module entrypoint is delivered as a module;
- generated files exist and have valid syntax;
- required ARIA or DOM contracts exist;
- artifacts contain only allowed source/runtime boundaries.

Examples of fragile validation targets to avoid:

- a specific local variable name;
- exact whitespace;
- an exact function body copied from an earlier implementation;
- a minified marker string inside a generated loader.

## 13. Generated code

Generated JavaScript is an artifact, not authored source.

If JavaScript must be generated by tooling, the generator itself must be clean TypeScript and should construct the output from explicit concepts. Generated output should remain readable unless minification is a deliberate build-stage optimization.

Do not paste generated/minified JavaScript into a TypeScript file and call that TypeScript-native code.

## 14. Modularity without fragmentation

Modularity means coherent ownership, not maximum file count.

Create a separate module when it represents a meaningful responsibility, reusable contract or independently testable subsystem.

Do not create one file per trivial function merely to appear modular.

Conversely, split a file when it owns multiple independent state machines, domains or lifecycle responsibilities.

A component folder may contain, where useful:

- controller/lifecycle;
- types;
- constants/tokens;
- DOM/view logic;
- animation logic;
- focused subcontrollers.

This is guidance, not a mandatory directory template.

## 15. Comments and naming

Names must describe current concepts, not migration history or former implementation details.

Comments should explain non-obvious constraints, browser behavior, compatibility boundaries or reasoning. They should not narrate obvious code.

Avoid names and comments whose only purpose is to preserve terminology from an implementation that no longer exists.

## 16. Compatibility boundary

Legacy directories and inherited application assets may be read to understand required behavior, DOM structure and compatibility constraints.

Owned TypeScript should isolate compatibility work at narrow boundaries rather than spread defensive legacy assumptions throughout every module.

Do not rewrite unrelated legacy source merely to make the repository stylistically uniform unless a task explicitly expands scope.

## 17. Rewrite methodology

For each file or coherent feature group:

1. Identify its observable behavior and external contracts.
2. Identify its state and the true owner of that state.
3. Identify incoming and outgoing dependencies.
4. Separate domain constants from project-wide tokens and module-local values.
5. Design the TypeScript API from those concepts.
6. Reimplement behavior using explicit modules and types.
7. Remove obsolete compatibility/global mechanisms when no consumer still requires them.
8. Compile and validate before publishing the batch.
9. Inspect generated Pages/Handoff behavior when the change affects build/runtime delivery.
10. Only then publish the batch to `type`.

The previous implementation is a behavioral reference, not an architectural template.

## 18. Workflow stability is a hard requirement

The `type` branch must not intentionally be left with broken workflows.

Before moving the branch for a code batch:

- browser typecheck must pass;
- tooling typecheck must pass;
- source/runtime validators must pass;
- affected build stages must be exercised locally as far as the environment allows;
- known workflow contracts must be checked against the new architecture.

After publication:

- inspect the corresponding GitHub Actions run;
- if CI exposes a repository-only/environment-only issue that could not be reproduced locally, fix it before continuing to stack unrelated changes;
- do not normalize a red workflow as an acceptable intermediate state.

A documentation-only commit is exempt from runtime rebuild requirements when it cannot affect build or code paths, but its workflow must still be observed.

## 19. Commit strategy

Prefer coherent, reviewable batches.

A commit should represent one architectural step such as:

- browser runtime module rewrite;
- Pages module-delivery rewrite;
- validator contract rewrite;
- first-paint/media pipeline rewrite;
- Handoff tooling rewrite.

Do not combine unrelated cleanup simply because the files are nearby.

Do not force-push `type` for normal progress. Use fast-forward history.

Do not merge into `main` unless explicitly requested.

## 20. Definition of done

The rewrite is complete only when:

- all owned TypeScript reads as native TypeScript;
- application dependencies are explicit;
- shared/global/domain/local values have clear ownership;
- application-global state is reduced to justified interoperability boundaries;
- lifecycle and cleanup are explicit;
- tooling and validators follow the same quality standard as browser code;
- Pages and Handoff understand the ES-module architecture directly;
- no source validator relies on accidental formatting from an older implementation;
- no authored TypeScript contains pasted/minified JavaScript architecture;
- browser and tooling typechecks pass;
- runtime/source/production/responsive validators pass;
- Pages builds successfully in CI;
- Handoff builds and validates successfully;
- the final workflow is green;
- `main` remains untouched unless explicitly requested.
