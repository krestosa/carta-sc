import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, read } from '../lib/core.js';
import { failList, localResource, scanTags } from './shared.js';

const RESOURCE_ATTRS:Record<string,string[]>={script:['src'],img:['src','srcset'],source:['src','srcset'],video:['src','poster'],audio:['src'],iframe:['src'],link:['href']};
const CHECKED_LINK_RELS=new Set(['stylesheet','preload','prefetch','icon','shortcut','apple-touch-icon']);
function check(value:string,base:string,checked:Set<string>,issues:string[]):void{
  const resource=localResource(value);if(resource===null)return;if(resource.startsWith('/')){issues.push(`root-relative resource is invalid for project Pages: ${value}`);return;}
  const target=path.resolve(base,resource),rel=path.relative(SITE,target);if(rel.startsWith('..')||path.isAbsolute(rel)){issues.push(`resource escapes Pages artifact: ${value}`);return;}if(checked.has(target))return;checked.add(target);if(!fs.existsSync(target)||!fs.statSync(target).isFile())issues.push(`missing local resource: ${value} -> ${rel.replaceAll(path.sep,'/')}`);
}
export function validateLocalAssets():void{
  const index=path.join(SITE,'index.html');assert(fs.existsSync(index),'Prepared Pages artifact is missing');const issues:string[]=[],checked=new Set<string>();
  for(const tag of scanTags(read(index))){if(tag.closing||!RESOURCE_ATTRS[tag.name])continue;if(tag.name==='link'){const rel=new Set((tag.attrs.rel??'').toLowerCase().split(/\s+/));if(![...rel].some((value)=>CHECKED_LINK_RELS.has(value)))continue;}for(const attr of RESOURCE_ATTRS[tag.name]??[]){const value=tag.attrs[attr];if(!value)continue;if(attr==='srcset'){for(const candidate of value.split(',')){const url=candidate.trim().split(/\s+/)[0]??'';if(url)check(url,SITE,checked,issues);}}else check(value,SITE,checked,issues);}}
  for(const css of [path.join(SITE,'_pages','legacy.css'),path.join(SITE,'override','main.css')]){if(!fs.existsSync(css)){issues.push(`missing active stylesheet: ${path.relative(SITE,css).replaceAll(path.sep,'/')}`);continue;}for(const match of read(css).matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi))check(match[2]??'',path.dirname(css),checked,issues);}
  if(issues.length)failList('Pages local asset validation failed',issues);
}
