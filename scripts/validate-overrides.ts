import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const overrideDir=path.join(root,'override');
const generatedDir=path.join(root,'.generated','browser','override');
const errors:string[]=[];
const fail=(message:string)=>errors.push(message);
const read=(file:string)=>fs.readFileSync(file,'utf8');
const rel=(file:string)=>path.relative(root,file).replaceAll(path.sep,'/');
const relOverride=(file:string)=>path.relative(overrideDir,file).replaceAll(path.sep,'/');
function walk(dir:string):string[]{return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full];});}
for(const required of [overrideDir,path.join(overrideDir,'main.ts'),path.join(overrideDir,'main.css'),path.join(overrideDir,'templates','registry.ts'),generatedDir])if(!fs.existsSync(required))fail(`Missing required frontend path: ${rel(required)}`);
if(!errors.length){
 const files=walk(overrideDir),tsFiles=files.filter(file=>file.endsWith('.ts')),cssFiles=files.filter(file=>file.endsWith('.css')),htmlFiles=files.filter(file=>file.endsWith('.html')),sourceJs=files.filter(file=>file.endsWith('.js'));
 if(sourceJs.length)fail(`Project-owned JS remains in override/: ${sourceJs.map(relOverride).join(', ')}`);
 const generatedJs=walk(generatedDir).filter(file=>file.endsWith('.js'));
 for(const file of generatedJs){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0)fail(`Generated JS syntax error in ${rel(file)}: ${(result.stderr||result.stdout||'').trim()}`);}
 const tsSource=tsFiles.map(read).join('\n');
 if(/\bscrollRestoration\b/.test(tsSource))fail('Override must leave browser scroll restoration native');
 if(/\._data\s*\(/.test(tsSource))fail('Override must not depend on private jQuery _data internals');
 if(/\bdocument\.currentScript\b/.test(tsSource))fail('Override modules must not depend on document.currentScript');
 if(fs.existsSync(path.join(overrideDir,'mutations','scroll-restoration.ts')))fail('Manual scroll-restoration mutation must not be reintroduced');
 const view=read(path.join(overrideDir,'components','catalog-tools','view.ts')),main=read(path.join(overrideDir,'main.ts')),viewStability=read(path.join(overrideDir,'components','catalog-tools','view-stability.css'));
 if(!/MODES(?::[^=]+)?=\['compact','list'\]/.test(view))fail('Catalog view toggle must expose only density and list');
 if(/MODES[^=]*=\[[^\]]*normal/.test(view))fail('Low-density normal view must not be reintroduced');
 if(!/VIEW_MODES(?::[^=]+)?=\['compact','list'\]/.test(main))fail('Catalog bootstrap must expose only density and list');
 if(!viewStability.includes('--sc-view-list-image-width: 210px'))fail('Desktop list geometry must remain canonical');
 for(const file of ['components/product-card/pricing.css','components/product-card/layout.css','components/product-card/image-ratio.css'])if(/@media\s*\(min-width\s*:\s*993px\)/.test(read(path.join(overrideDir,file))))fail(`${file} must inherit shared desktop-first structure`);
 const mainRefs=[...main.matchAll(/['"]([^'"]+\.js)['"]/g)].map(match=>match[1]).filter((ref):ref is string=>Boolean(ref));
 if(new Set(mainRefs).size!==mainRefs.length)fail('Duplicate JavaScript runtime paths in override/main.ts');
 for(const ref of new Set(mainRefs)){const tsRef=ref.replace(/\.js$/,'.ts');if(!fs.existsSync(path.join(overrideDir,tsRef)))fail(`Loader references missing TypeScript source: override/${tsRef}`);}
 const registry=read(path.join(overrideDir,'templates','registry.ts'));
 const templateRefs=[...registry.matchAll(/['"]([^'"]+\.html)['"]/g)].map(match=>match[1]).filter((ref):ref is string=>Boolean(ref));
 for(const ref of templateRefs)if(!fs.existsSync(path.join(overrideDir,ref)))fail(`Template registry references missing source: override/${ref}`);
 const cssRefs=[...read(path.join(overrideDir,'main.css')).matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g)].map(match=>match[1]).filter((ref):ref is string=>Boolean(ref));
 for(const ref of cssRefs){const [assetPath='',query='']=ref.split('?');if(query!=='v=unversioned')fail(`CSS import must use ?v=unversioned: ${ref}`);if(!fs.existsSync(path.resolve(overrideDir,assetPath)))fail(`Missing CSS import target: ${assetPath}`);}
 console.log(`Override validation checked ${tsFiles.length} TypeScript files, ${htmlFiles.length} templates, ${cssFiles.length} CSS files and ${generatedJs.length} generated JS files.`);
}
if(errors.length){console.error(`Override validation failed with ${errors.length} error(s):`);for(const error of errors)console.error(`- ${error}`);process.exit(1);} 
