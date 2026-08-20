import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildPages } from '../pages/build.js';
import { ROOT, SITE, copyTree, remove } from '../pages/lib/core.js';
import { neutralizeCompiled } from './shared.js';

export async function rebuildHandoff():Promise<void>{
  const packageRoot=path.resolve(ROOT,'..');
  const shaFile=path.join(packageRoot,'BUILD_SHA');
  if(!process.env.GITHUB_SHA&&fs.existsSync(shaFile))process.env.GITHUB_SHA=fs.readFileSync(shaFile,'utf8').trim();
  await buildPages();
  const compiled=path.join(packageRoot,'compiled');
  remove(compiled); copyTree(SITE,compiled); neutralizeCompiled(compiled);
  fs.writeFileSync(shaFile,`${process.env.GITHUB_SHA??'local'}\n`);
}
const entry=process.argv[1];if(entry&&import.meta.url===pathToFileURL(path.resolve(entry)).href){rebuildHandoff().catch((e:unknown)=>{console.error(e instanceof Error?e.stack??e.message:e);process.exitCode=1;});}
