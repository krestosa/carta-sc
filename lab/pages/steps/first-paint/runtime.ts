// Explica la responsabilidad de este archivo dentro del código propio y mantiene su lógica en el ámbito que le corresponde.
export {
  deferInlineRuntimeScripts as deferInlineRuntime,
  removeRuntimeScripts as removeRuntime,
} from './runtime-html.js';
export {
  patchLegacyRuntime as patchRuntime,
  stripRuntimeSourceMaps as stripMaps,
} from './runtime-patches.js';
