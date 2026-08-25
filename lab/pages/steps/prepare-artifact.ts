// Explica la responsabilidad de este archivo dentro del código propio y mantiene su lógica en el ámbito que le corresponde.
import path from 'node:path';
import { SITE, githubSha, read, write } from '../lib/core.js';
import { bundleOverrideCss, verifyBundledCss } from './prepare-artifact/css.js';
import { prepareDocument, verifyPreparedDocument } from './prepare-artifact/html.js';
import { stampLegacyBootstrap, verifyLegacyBootstrap } from './prepare-artifact/legacy.js';
import { stampModuleGraph, verifyModuleGraph } from './prepare-artifact/modules.js';

export function prepareArtifact(): void {
  const sha = githubSha();
  const index = path.join(SITE, 'index.html');

  write(index, prepareDocument(read(index), sha));
  stampLegacyBootstrap(sha);
  bundleOverrideCss();
  stampModuleGraph(sha);

  verifyPreparedDocument(read(index), sha);
  verifyLegacyBootstrap(sha);
  verifyBundledCss();
  verifyModuleGraph(sha);
}
