import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, githubSha, read, walk } from '../lib/core.js';
import { failList } from './shared.js';

export function validateFinalInvariants():void{
  const sha=githubSha(),index=path.join(SITE,'index.html');assert(fs.existsSync(index),'Final Pages artifact is missing');const html=read(index),issues:string[]=[];
  for(const required of [path.join(SITE,'override','main.js'),path.join(SITE,'override','main.css'),path.join(SITE,'_pages','legacy.js'),path.join(SITE,'_pages','shop.js'),path.join(SITE,'_pages','deferred.css'),path.join(SITE,'_pages','php-guard.js'),path.join(SITE,'_critical-media','sushiclub-logo.svg')])if(!fs.existsSync(required)||fs.statSync(required).size===0)issues.push(`missing final artifact file: ${path.relative(SITE,required).replaceAll(path.sep,'/')}`);
  if(html.includes('unversioned'))issues.push('unversioned cache token remains in final Pages HTML');if(!html.includes(`_critical-media/sushiclub-logo.svg?v=${sha}`))issues.push('versioned system logo is missing from final HTML');if(/<script\b[^>]*\bsrc=["'][^"']*(?:override\/runtime-main\.js|override\/[^"']+\.ts)[^"']*["']/i.test(html))issues.push('source-only override runtime reference remains in final HTML');if(walk(SITE).some((file)=>file.endsWith('.ts')))issues.push('TypeScript source leaked into final Pages artifact');if(issues.length)failList('Final Pages invariant validation failed',issues);
}
