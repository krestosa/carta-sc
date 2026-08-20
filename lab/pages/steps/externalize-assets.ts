import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, read, walk, write } from '../lib/core.js';

const ORIGIN='https://www.sushiclub.com.ar/';
const ASSET_ROOTS=['uploads_shop','uploads','gfx','fonts','fuentes','iconos'] as const;
const TEXT_SUFFIXES=new Set(['.html','.css','.js']);
const FORBIDDEN=new Set(['.png','.jpg','.jpeg','.gif','.webp','.svg','.ico','.bmp','.avif','.eot','.woff','.woff2','.ttf','.otf','.mp4','.webm','.mov','.m4v','.avi','.pdf']);
const MIRROR_FONTS=new Set(['.woff','.woff2','.ttf','.otf']);
const rootGroup=ASSET_ROOTS.join('|');
const assetDirRe=new RegExp(`(?<![A-Za-z0-9:/])(?:\\.\\./|\\./|/)*(?<root>${rootGroup})/`,'gi');
const assetFileRe=/(?<![A-Za-z0-9:/])(?:\.\.\/|\.\/|\/)*favicon\.ico\b/gi;
const snapshotSuffixRe=/(?:__q_[0-9a-f]{8}|__\d+)(?=\.(?:png|jpe?g|gif|webp|svg|ico|bmp|avif|eot|woff2?|ttf|otf|mp4|webm|mov|m4v|avi|pdf)\b)/gi;
const remoteFontRe=/https:\/\/www\.sushiclub\.com\.ar\/(?:fonts|fuentes)\/[^"'\s()<>?#]+?\.(?:woff2?|ttf|otf)(?:[?#][^"'\s()<>]*)?/gi;
const requiredFonts=new Set(['_remote-assets/fuentes/AcuminPro-Regular.woff2','_remote-assets/fuentes/AcuminPro-Semibold.woff2','_remote-assets/fonts/fontawesome-webfont.woff2','_remote-assets/fonts/glyphicons-halflings-regular.woff','_remote-assets/fonts/hnl.woff','_remote-assets/fonts/bariol_bold-webfont.woff','_remote-assets/fonts/bariol_light-webfont.woff','_remote-assets/fonts/bariol_regular-webfont.woff','_remote-assets/fonts/websymbolsligaregular.woff','_remote-assets/fonts/PlutoBold.otf']);
const USER_AGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36';

async function request(url:string):Promise<{bytes:Buffer;contentType:string}>{const response=await fetch(url,{headers:{'user-agent':USER_AGENT,referer:`${ORIGIN}carta_delivery.php`},redirect:'follow',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);return {bytes:Buffer.from(await response.arrayBuffer()),contentType:(response.headers.get('content-type')??'').toLowerCase()};}

export async function externalizeStaticAssets():Promise<void>{
  assert(fs.existsSync(SITE),'.pages-site does not exist');
  const sourceAssets=walk(process.cwd()).filter((file)=>!file.includes(`${path.sep}.git${path.sep}`)&&!file.includes(`${path.sep}.pages-site${path.sep}`)&&!file.includes(`${path.sep}node_modules${path.sep}`)&&FORBIDDEN.has(path.extname(file).toLowerCase()));
  assert(sourceAssets.length===0,`Static asset files are forbidden in the repository: ${sourceAssets.slice(0,20).join(', ')}`);
  let changed=0,replacements=0,canonicalized=0;
  const textFiles=walk(SITE).filter((file)=>TEXT_SUFFIXES.has(path.extname(file).toLowerCase()));
  for(const file of textFiles){const source=read(file);let rewritten=source.replace(assetDirRe,(full,...args:unknown[])=>{replacements++;const groups=args.at(-1) as Record<string,string>|undefined;return `${ORIGIN}${groups?.root??full}/`;});rewritten=rewritten.replace(assetFileRe,()=>{replacements++;return `${ORIGIN}favicon.ico`;});rewritten=rewritten.replace(snapshotSuffixRe,()=>{canonicalized++;return '';});if(rewritten!==source){write(file,rewritten);changed++;}}
  assert(replacements>0,'No static asset references were externalized');assert(canonicalized>0,'Expected captured snapshot asset variants to be canonicalized');
  for(const url of [`${ORIGIN}gfx/web-sushiclub2_black_m2.png`,`${ORIGIN}gfx/web-sushiclub2_black.png`]){const response=await request(url);assert(response.contentType.startsWith('image/'),`Critical SushiClub image is not usable: type=${response.contentType||'(missing)'}, url=${url}`);}
  const fontUrls=new Set<string>();for(const file of textFiles){for(const m of read(file).matchAll(remoteFontRe))if(m[0])fontUrls.add(m[0]);}assert(fontUrls.size>0,'No modern SushiClub font URLs were found to mirror');
  const downloaded=new Map<string,string>();const targets=new Set<string>();const failed:Array<[string,string]>=[];let bytesTotal=0;
  for(const sourceUrl of [...fontUrls].sort()){
    const parsed=new URL(sourceUrl),rel=parsed.pathname.replace(/^\//,''),target=path.join(SITE,'_remote-assets',rel);
    assert(rel.startsWith('fonts/')||rel.startsWith('fuentes/'),`Refusing unexpected mirrored font path: ${rel}`);assert(MIRROR_FONTS.has(path.extname(target).toLowerCase()),`Refusing unexpected mirrored font extension: ${target}`);
    if(targets.has(target)){downloaded.set(sourceUrl,target);continue;}
    const candidates=[sourceUrl];parsed.search='';parsed.hash='';const canonical=parsed.toString();if(canonical!==sourceUrl)candidates.push(canonical);
    let payload:Buffer|undefined,last='';for(const candidate of candidates){try{const response=await request(candidate);assert(response.bytes.length>0,'empty response');assert(response.bytes.length<=8*1024*1024,'response is unexpectedly large');assert(!response.bytes.subarray(0,512).toString('utf8').toLowerCase().includes('<html')&&!response.contentType.startsWith('text/html'),'response is HTML, not a font');payload=response.bytes;break;}catch(error){last=error instanceof Error?error.message:String(error);}}
    if(!payload){failed.push([sourceUrl,last]);continue;}fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,payload);targets.add(target);downloaded.set(sourceUrl,target);bytesTotal+=payload.length;
  }
  for(const file of textFiles){let text=read(file);for(const [url,target] of [...downloaded.entries()].sort((a,b)=>b[0].length-a[0].length)){const rel=path.relative(path.dirname(file),target).split(path.sep).join('/');text=text.split(url).join(rel);}write(file,text);}
  const unexpected:string[]=[],mirrored:string[]=[];for(const file of walk(SITE)){if(!FORBIDDEN.has(path.extname(file).toLowerCase()))continue;const rel=path.relative(SITE,file).split(path.sep).join('/');if(rel.startsWith('_remote-assets/fonts/')||rel.startsWith('_remote-assets/fuentes/')){if(MIRROR_FONTS.has(path.extname(file).toLowerCase()))mirrored.push(rel);else unexpected.push(rel);}else unexpected.push(rel);}assert(unexpected.length===0,`Unexpected static asset files remain in Pages artifact: ${unexpected.slice(0,20).join(', ')}`);
  const mirroredSet=new Set(mirrored),missing=[...requiredFonts].filter((item)=>!mirroredSet.has(item));assert(missing.length===0,`Critical mirrored font(s) missing: ${missing.join(', ')}`);assert(mirrored.length===targets.size,'Mirrored SushiClub font count does not match downloaded font set');
  const criticalNames=new Set([...requiredFonts].map((item)=>path.basename(item).toLowerCase()));const criticalRefs:Array<[string,string]>=[];for(const file of textFiles){for(const match of read(file).matchAll(remoteFontRe)){const url=match[0];if(url&&criticalNames.has(path.basename(new URL(url).pathname).toLowerCase()))criticalRefs.push([path.relative(SITE,file),url]);}}assert(criticalRefs.length===0,`Critical cross-origin font reference(s) remain: ${JSON.stringify(criticalRefs.slice(0,10))}`);
  const localRefs:string[]=[],snapshotRefs:string[]=[];for(const file of textFiles){const text=read(file),rel=path.relative(SITE,file);assetDirRe.lastIndex=0;assetFileRe.lastIndex=0;snapshotSuffixRe.lastIndex=0;if(assetDirRe.test(text)||assetFileRe.test(text))localRefs.push(rel);if(snapshotSuffixRe.test(text))snapshotRefs.push(rel);}assert(localRefs.length===0,`Local static asset reference(s) remain: ${localRefs.join(', ')}`);assert(snapshotRefs.length===0,`Snapshot-only static asset filename(s) remain: ${snapshotRefs.join(', ')}`);
  if(failed.length)console.log(`Skipped ${failed.length} unavailable optional modern font fallback URL(s).`);
  console.log(`Externalized ${replacements} static asset reference(s) across ${changed} file(s) to ${ORIGIN}; canonicalized ${canonicalized} snapshot-only asset path(s).`);console.log(`Mirrored ${mirrored.length} modern font file(s), ${bytesTotal} bytes, from SushiClub into the generated Pages artifact only.`);
}
