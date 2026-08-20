import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const source=path.join(root,'override');
const generated=path.join(root,'.generated','browser','override');
if(!fs.existsSync(generated))throw new Error('Missing .generated/browser/override; compile browser TypeScript first');
const sourceJs:string[]=[];
function walk(dir:string):string[]{return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full];});}
for(const file of walk(source))if(file.endsWith('.js'))sourceJs.push(path.relative(root,file));
if(sourceJs.length)throw new Error(`Project-owned JavaScript must not be versioned in override/: ${sourceJs.join(', ')}`);
const tsFiles=walk(source).filter(file=>file.endsWith('.ts'));
const generatedJs=walk(generated).filter(file=>file.endsWith('.js'));
if(tsFiles.length!==generatedJs.length)throw new Error(`Generated browser JS count mismatch: ts=${tsFiles.length}, js=${generatedJs.length}`);
console.log(`Runtime compile ready: ${tsFiles.length} TypeScript sources -> ${generatedJs.length} generated JavaScript files.`);
