import fs from 'node:fs';
import { SITE, assert } from '../lib/core.js';
import {
  inspectGeneratedAssets,
  mirrorFonts,
  remoteFontUrls,
  rewriteMirroredFontReferences,
  verifyCriticalFonts,
} from './externalize-assets/fonts.js';
import { ORIGIN } from './externalize-assets/config.js';
import { verifyCriticalImages } from './externalize-assets/network.js';
import {
  pagesTextFiles,
  repositoryStaticAssets,
  rewriteStaticReferences,
  verifyNoSnapshotReferences,
} from './externalize-assets/rewrite.js';

export async function externalizeStaticAssets(): Promise<void> {
  assert(fs.existsSync(SITE), '.pages-site does not exist');
  const sourceAssets = repositoryStaticAssets();
  assert(
    sourceAssets.length === 0,
    `Static asset files are forbidden in the repository: ${sourceAssets.slice(0, 20).join(', ')}`,
  );

  const files = pagesTextFiles();
  const rewriteStats = rewriteStaticReferences(files);
  assert(rewriteStats.replacements > 0, 'No static asset references were externalized');
  assert(rewriteStats.canonicalized > 0, 'Expected captured snapshot asset variants to be canonicalized');
  await verifyCriticalImages();

  const fontUrls = remoteFontUrls(files);
  assert(fontUrls.size > 0, 'No modern SushiClub font URLs were found to mirror');
  const mirrors = await mirrorFonts(fontUrls);
  rewriteMirroredFontReferences(files, mirrors.downloaded);

  const generated = inspectGeneratedAssets();
  assert(
    generated.unexpected.length === 0,
    `Unexpected static asset files remain in Pages artifact: ${generated.unexpected.slice(0, 20).join(', ')}`,
  );
  assert(
    generated.mirrored.length === mirrors.targets.size,
    'Mirrored SushiClub font count does not match downloaded font set',
  );
  verifyCriticalFonts(files, generated.mirrored);
  verifyNoSnapshotReferences(files);

  if (mirrors.failures.length) {
    console.log(`Skipped ${mirrors.failures.length} unavailable optional modern font fallback URL(s).`);
  }
  console.log(
    `Externalized ${rewriteStats.replacements} static asset reference(s) across ${rewriteStats.filesChanged} file(s) to ${ORIGIN}; `
      + `canonicalized ${rewriteStats.canonicalized} snapshot-only asset path(s).`,
  );
  console.log(
    `Mirrored ${generated.mirrored.length} modern font file(s), ${mirrors.bytesTotal} bytes, from SushiClub into the generated Pages artifact only.`,
  );
}
