import path from 'node:path';
import { SITE, buildId, read, write } from '../lib/core.js';
import { bundleOverrideCss, verifyBundledCss } from './prepare-artifact/css.js';
import { prepareDocument, verifyPreparedDocument } from './prepare-artifact/html.js';
import { stampLegacyBootstrap, verifyLegacyBootstrap } from './prepare-artifact/legacy.js';
import { stampModuleGraph, verifyModuleGraph } from './prepare-artifact/modules.js';

export function prepareArtifact(): void {
  const version = buildId();
  const index = path.join(SITE, 'index.html');

  write(index, prepareDocument(read(index), version));
  stampLegacyBootstrap(version);
  bundleOverrideCss();
  stampModuleGraph(version);

  verifyPreparedDocument(read(index), version);
  verifyLegacyBootstrap(version);
  verifyBundledCss();
  verifyModuleGraph(version);
}
