import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd(),handoff=path.resolve(process.argv[2]||'handoff'),reference=process.argv[3]?path.resolve(process.argv[3]):null;
const required=['source','compiled','BUILD_SHA','README.md','build-local.sh','serve-local.sh','build-local.ps1','serve-local.ps1'];
for(const name of required)if(!fs.existsSync(path.join(handoff,name)))throw new Error(`Missing handoff contract path: ${name}`);
function walk(dir:string):string[]{return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full];});}
const source=path.join(handoff,'source');for(const file of walk(source)){const rel=path.relative(source,file).replaceAll(path.sep,'/');if(/\.(?:py|mjs)$/i.test(rel)||/requirements\.txt$/i.test(rel))throw new Error(`Forbidden legacy tooling leaked into handoff source: ${rel}`);if(file.endsWith('.js')&&!rel.startsWith('js/')&&!rel.startsWith('_js_dev/'))throw new Error(`Owned JS source leaked into handoff source: ${rel}`);}
if(reference){const compiled=path.join(handoff,'compiled');const filesA=walk(reference).map(f=>path.relative(reference,f).replaceAll(path.sep,'/')).sort(),filesB=walk(compiled).map(f=>path.relative(compiled,f).replaceAll(path.sep,'/')).sort();if(JSON.stringify(filesA)!==JSON.stringify(filesB))throw new Error('Clean-room handoff file set differs from reference');for(const rel of filesA){const a=fs.readFileSync(path.join(reference,rel)),b=fs.readFileSync(path.join(compiled,rel));if(crypto.createHash('sha256').update(a).digest('hex')!==crypto.createHash('sha256').update(b).digest('hex'))throw new Error(`Clean-room handoff mismatch: ${rel}`);}}
console.log('Handoff validation passed.');
void root;
