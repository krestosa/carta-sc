import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const errors=[];
const fail=(m)=>errors.push(m);

const view=read('override/components/catalog-tools/view.js');
const main=read('override/main.js');
const tools=read('override/components/catalog-tools/catalog-tools.css');
const list=read('override/components/catalog-tools/view-stability.css');
const grid=read('override/features/catalog/layout.css');
const sharedStructural=[
  'override/components/product-card/layout.css',
  'override/components/product-card/pricing.css',
  'override/components/product-card/image-ratio.css',
  'override/components/section-heading/layout.css',
  'override/features/content-normalizer/content-normalizer.css',
  'override/components/product-modal/motion.css',
];

if(!view.includes("MODES=['compact','list']"))fail('view.js must expose density + list only');
if(/MODES=\[[^\]]*normal/.test(view))fail('view.js reintroduced low-density normal mode');
if(!main.includes("VIEW_MODES=['compact','list']"))fail('main.js bootstrap must expose density + list only');
if(!view.includes("if(mode==='normal')return'compact'"))fail('legacy normal preference must migrate to density');

if(/data-sc-catalog-view=['"]list['"]/.test(tools))fail('catalog-tools.css must not own list geometry; use view-stability.css');
if(/--sc-view-list-(?:desktop|compact|phone)-/.test(tools))fail('catalog-tools.css contains legacy breakpoint-specific list tokens');
if(!tools.includes('--sc-compact-columns: 4'))fail('desktop density must default to 4 columns');
if(!tools.includes('--sc-compact-columns: 3'))fail('tablet density must override to 3 columns');
if(!tools.includes('--sc-compact-columns: 2'))fail('phone density must override to 2 columns');

if(!list.includes('--sc-view-list-image-width: 210px'))fail('desktop list image token missing');
if(!list.includes('--sc-view-list-image-width: 160px'))fail('tablet list image token missing');
if(!list.includes('--sc-view-list-image-width: 150px'))fail('phone list image token missing');
if(!list.includes('grid-template-columns: var(--sc-view-list-image-width) minmax(0, 1fr) !important'))fail('shared two-column list anatomy missing');
if(!list.includes('grid-column: 2 !important;\n  grid-row: 2 !important'))fail('shared list price placement missing');
if(!list.includes('object-fit: contain !important'))fail('list media must preserve product fitting across breakpoints');
if(/object-fit:\s*cover\s*!important/.test(list))fail('list geometry must not fork to cover-cropped media');
if(/@media\s*\(min-width\s*:\s*993px\)/.test(list))fail('list structure must not fork into a desktop-only media block');

if(!grid.includes('--sc-catalog-base-columns: 4'))fail('catalog layout desktop base must be 4 columns');
for(const file of sharedStructural){
  const css=read(file);
  if(/@media\s*\(min-width\s*:\s*993px\)/.test(css))fail(`${file} contains a desktop-only structural fork`);
}

if(errors.length){
  console.error(`Responsive contract validation failed with ${errors.length} issue(s):`);
  errors.forEach((e)=>console.error(`- ${e}`));
  process.exit(1);
}
console.log('Responsive contract validation passed: desktop owns shared geometry/behavior; density/list inherit across breakpoints.');
