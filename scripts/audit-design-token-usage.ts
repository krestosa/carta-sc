import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

interface Finding { readonly category:string; readonly file:string; readonly line:number; readonly value:string }
interface TokenNode { $type?:unknown; $value?:unknown; [key:string]:unknown }

const DTCG_TYPES = new Set(['color','dimension','fontFamily','fontWeight','duration','cubicBezier','number','strokeStyle','border','transition','shadow','gradient','typography']);
const TOKEN_ROOT_GROUPS = new Set(['color','dimension','font','motion','border']);
const COMPONENT_TOKEN_TERMS = /(?:^|\.)(?:component|modal|submenu|search|filter|preloader|card|button|sticky|catalog|spring|opacity|scale|zIndex)(?:\.|$)/i;
const GENERATED = new Set(['override/core/tokens.generated.css','override/core/tokens.generated.ts']);
const GENERATED_IMPORT_OWNERS = new Set(['override/core/variables.ts','override/motion/config.ts']);
const LEGACY_REFERENCES: Array<[string,RegExp]> = [
  ['component-token',/--sc-token-component-[\w-]+/g],
  ['component-token-path',/\bcomponent\.(?:color|dimension|number|duration|shadow)\.[A-Za-z0-9_.]+/g],
  ['token-runtime',/\btokenRuntime\b/g],
  ['spring-token',/\b(?:motionTokens|tokenMotion)\.springs\b/g],
  ['legacy-type-alias',/--sc-type-[\w-]+/g],
  ['legacy-z-alias',/--sc-z-(?:raised|theme-popover|modal)\b/g],
  ['legacy-effect-alias',/--sc-(?:overlay-modal|shadow-modal|shadow-submenu|gradient-sticky-shadow-stops)\b/g],
  ['legacy-opacity-alias',/--sc-opacity-(?:trait-icon|placeholder|sticky-desktop|sticky-mobile)\b/g],
  ['legacy-scale-alias',/--sc-scale-(?:pressed|submenu-pressed)\b/g],
  ['legacy-variables-css',/(?:core\/variables\.css|variables\.css\?v=)/g],
];
const GLOBAL_COLOR_LITERALS = /#(?:0a0a0a|303030|5f5f5f|767676|989898|f5f5f5|fbfbfa|e3e3de|d1d1cb|ffffff|f3f3f0|c8c8c2|9c9c95|6f6f6f|121210|2d2d29|44443e)\b/gi;
const GLOBAL_BEZIER_LITERALS = /(?:cubic-bezier\(\s*0\.2\s*,\s*0\s*,\s*0\s*,\s*1\s*\)|cubic-bezier\(\s*0\.3\s*,\s*0\s*,\s*1\s*,\s*1\s*\)|\[\s*0\.2\s*,\s*0\s*,\s*0\s*,\s*1\s*\]|\[\s*0\.3\s*,\s*0\s*,\s*1\s*,\s*1\s*\])/gi;

const root = process.cwd();
const strict = process.argv.includes('--strict');
const findings:Finding[] = [];
function add(category:string,file:string,line:number,value:string):void { findings.push({category,file,line,value:value.trim().replace(/\s+/g,' ')}); }
function lineOf(source:string,index:number):number { return source.slice(0,index).split('\n').length; }
async function exists(path:string):Promise<boolean>{ try { await stat(path); return true; } catch { return false; } }
async function walk(directory:string):Promise<string[]> {
  if (!(await exists(directory))) return [];
  const entries=await readdir(directory,{withFileTypes:true});
  const nested=await Promise.all(entries.map(async(entry)=>{ const path=join(directory,entry.name); return entry.isDirectory()?walk(path):[path]; }));
  return nested.flat();
}

const tokenDir=resolve(root,'tokens');
const tokenFiles=(await readdir(tokenDir)).filter((name)=>name.endsWith('.tokens.json')).sort();
if (tokenFiles.length!==1 || tokenFiles[0]!=='design.tokens.json') add('token-source','tokens',1,`expected only design.tokens.json; found ${tokenFiles.join(', ')||'none'}`);
if (await exists(resolve(tokenDir,'component.tokens.json'))) add('token-source','tokens/component.tokens.json',1,'component token document must not exist');
if (await exists(resolve(root,'override/core/variables.css'))) add('legacy-file','override/core/variables.css',1,'obsolete global variables compatibility layer still exists');

const tokenPath=resolve(tokenDir,'design.tokens.json');
const tokenSource=await readFile(tokenPath,'utf8');
const tokenDocument=JSON.parse(tokenSource) as Record<string,unknown>;
if ('$schema' in tokenDocument) add('dtcg-extension','tokens/design.tokens.json',1,'$schema is not part of the DTCG Format root/group vocabulary');
for (const key of Object.keys(tokenDocument)) {
  if (key.startsWith('$')) continue;
  if (!TOKEN_ROOT_GROUPS.has(key)) add('token-root','tokens/design.tokens.json',1,`non-global root group: ${key}`);
}
function auditTokenNode(node:unknown,path:string[],inheritedType?:string):void {
  if (!node || typeof node!=='object' || Array.isArray(node)) return;
  const object=node as TokenNode;
  let type=inheritedType;
  if (typeof object.$type==='string') { type=object.$type; if (!DTCG_TYPES.has(type)) add('dtcg-type','tokens/design.tokens.json',1,`${path.join('.')||'<root>'}: ${type}`); }
  if ('$value' in object) {
    const tokenName=path.join('.');
    if (!type) add('dtcg-type','tokens/design.tokens.json',1,`${tokenName}: no resolvable $type`);
    if (COMPONENT_TOKEN_TERMS.test(tokenName)) add('component-token-in-global-source','tokens/design.tokens.json',1,tokenName);
    return;
  }
  for (const [key,value] of Object.entries(object)) if (!key.startsWith('$')) auditTokenNode(value,[...path,key],type);
}
auditTokenNode(tokenDocument,[]);

const scanRoots=[resolve(root,'override'),resolve(root,'scripts')];
const sourceFiles=(await Promise.all(scanRoots.map(walk))).flat().filter((path)=>['.css','.ts'].includes(extname(path)));
const declarations=new Map<string,Set<string>>();
const usages:Array<{name:string;file:string;line:number;fallback:boolean}>=[];
function declare(name:string,file:string):void { const owners=declarations.get(name)??new Set<string>(); owners.add(file); declarations.set(name,owners); }
for (const absolute of sourceFiles) {
  const file=relative(root,absolute).replace(/\\/g,'/');
  if (GENERATED.has(file)) continue;
  const source=await readFile(absolute,'utf8');
  for (const [category,pattern] of LEGACY_REFERENCES) { pattern.lastIndex=0; for (const match of source.matchAll(pattern)) add(category,file,lineOf(source,match.index??0),match[0]??''); }
  for (const match of source.matchAll(/--sc-token-[\w-]+/g)) add('direct-token-css-api',file,lineOf(source,match.index??0),match[0]??'');
  if (source.includes('tokens.generated.js') && !GENERATED_IMPORT_OWNERS.has(file)) add('direct-generated-ts-api',file,1,'tokens.generated.js may only be adapted by core/variables.ts or motion/config.ts');
  GLOBAL_COLOR_LITERALS.lastIndex=0; for (const match of source.matchAll(GLOBAL_COLOR_LITERALS)) add('duplicated-global-color',file,lineOf(source,match.index??0),match[0]??'');
  GLOBAL_BEZIER_LITERALS.lastIndex=0; for (const match of source.matchAll(GLOBAL_BEZIER_LITERALS)) add('duplicated-global-easing',file,lineOf(source,match.index??0),match[0]??'');
  if (extname(file)==='.css') {
    for (const match of source.matchAll(/(--sc-[\w-]+)\s*:/g)) declare(match[1]??'',file);
    for (const match of source.matchAll(/var\(\s*(--sc-[\w-]+)(\s*,[^)]*)?\)/g)) usages.push({name:match[1]??'',file,line:lineOf(source,match.index??0),fallback:Boolean(match[2])});
  } else {
    for (const match of source.matchAll(/\.style\.setProperty\(\s*['"](--sc-[\w-]+)['"]/g)) declare(match[1]??'',file);
    for (const match of source.matchAll(/['"](--sc-[\w-]+)['"]/g)) usages.push({name:match[1]??'',file,line:lineOf(source,match.index??0),fallback:false});
  }
}
const generatedCss=await readFile(resolve(root,'override/core/tokens.generated.css'),'utf8');
for (const match of generatedCss.matchAll(/(--sc-[\w-]+)\s*:/g)) declare(match[1]??'','override/core/tokens.generated.css');
for (const usage of usages) if (!usage.fallback && !declarations.has(usage.name)) add('orphan-css-variable',usage.file,usage.line,usage.name);

const counts=new Map<string,number>();
for (const finding of findings) counts.set(finding.category,(counts.get(finding.category)??0)+1);
const ordered=[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
console.log(`[design-token-architecture] ${findings.length} violation(s)`);
for (const [category,count] of ordered) console.log(`  ${category}: ${count}`);
for (const [category] of ordered) {
  const categoryFindings=findings.filter((finding)=>finding.category===category);
  const output=strict?categoryFindings:categoryFindings.slice(0,12);
  if (!output.length) continue;
  console.log(`\n[${category}] ${strict?'findings':'examples'}:`);
  for (const finding of output) console.log(`  ${finding.file}:${finding.line} ${finding.value}`);
}
if (strict && findings.length) { console.error(`\n[design-token-architecture] strict mode failed with ${findings.length} violation(s).`); process.exitCode=1; }
