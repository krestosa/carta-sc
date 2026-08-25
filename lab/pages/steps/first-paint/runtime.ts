// Documenta la etapa runtime de la canalización de Pages, separada de la fuente de producción.
export {
  deferInlineRuntimeScripts as deferInlineRuntime,
  removeRuntimeScripts as removeRuntime,
} from './runtime-html.js';
export {
  patchLegacyRuntime as patchRuntime,
  stripRuntimeSourceMaps as stripMaps,
} from './runtime-patches.js';
