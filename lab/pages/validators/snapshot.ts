import fs from 'node:fs';
import path from 'node:path';
import { ROOT, read, relative } from '../lib/core.js';
import { failList } from './shared.js';

export function validateSnapshotIntegration():void{
  const issues:string[]=[];
  const overrideDir=path.join(ROOT,'override'),bootstrapPath=path.join(ROOT,'_js_dev','main.js'),indexPath=path.join(ROOT,'index.html'),registryPath=path.join(overrideDir,'templates','registry.ts');
  for(const required of [overrideDir,bootstrapPath,indexPath,registryPath])if(!fs.existsSync(required))issues.push(`Missing lab integration input: ${relative(required)}`);
  if(!issues.length){
    const bootstrap=read(bootstrapPath),index=read(indexPath),registry=read(registryPath);
    if((bootstrap.match(/var version='unversioned';/g)??[]).length!==1)issues.push("Snapshot _js_dev/main.js must contain exactly one var version='unversioned'; placeholder");
    if((index.match(/_js_dev\/main\.js\?v=[^"']+/g)??[]).length!==1)issues.push('Snapshot index.html must reference _js_dev/main.js exactly once');
    if(/data-sc-template=/.test(index))issues.push('Snapshot index.html must not contain override component templates');
    if(!registry.includes('var COMPILED_TEMPLATES:Record<string,string>|null=null;/*__SC_TEMPLATE_PAYLOAD__*/'))issues.push('Pages lab requires the typed compiled-template injection slot in override/templates/registry.ts');
  }
  if(issues.length)failList('Pages lab snapshot/override integration validation failed',issues);
}
