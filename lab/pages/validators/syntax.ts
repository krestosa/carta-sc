import path from 'node:path';
import { SITE, nodeCheck, walk } from '../lib/core.js';

export function validateJsSyntax():void{
  const roots=[path.join(SITE,'override'),path.join(SITE,'_pages')];
  for(const root of roots)for(const file of walk(root).filter((item)=>item.endsWith('.js')))nodeCheck(file);
}
