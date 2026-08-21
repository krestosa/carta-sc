import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { SITE, assert, read } from '../lib/core.js';
import { type Attrs, type HtmlTag, SOCIAL_HOSTS, VOID_TAGS, classSet, decodeHtml, failList, safeDecode, scanTags, unique } from './shared.js';

export function validateHtml():void{
  const index=path.join(SITE,'index.html');assert(fs.existsSync(index)&&fs.statSync(index).isFile(),'Prepared Pages artifact is missing');const html=read(index),issues:string[]=[];if(html.includes('\uFFFD'))issues.push('index.html contains Unicode replacement character U+FFFD');
  const tags=scanTags(html),ids:string[]=[],fragments:string[]=[],labels=new Set<string>(),controls:{tag:string;attrs:Attrs}[]=[],imgStyles:string[]=[],social:{href:string;named:boolean}[]=[];
  const stack:{name:string;textStart:number;tag:HtmlTag;imgAlt:string}[]=[];
  for(const tag of tags){if(tag.closing){for(let i=stack.length-1;i>=0;i--){const item=stack[i];if(item?.name!==tag.name)continue;const segment=html.slice(item.textStart,tag.index).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();if(item.name==='a'){const href=(item.tag.attrs.href??'').trim();let host='';try{host=new URL(href,'https://local.invalid/').hostname.toLowerCase();}catch{}if(host&&SOCIAL_HOSTS.has(host)){const named=Boolean(segment||(item.tag.attrs['aria-label']??'').trim()||(item.tag.attrs.title??'').trim()||item.imgAlt);social.push({href,named});}}stack.splice(i);break;}continue;}
    if(tag.attrs.id)ids.push(tag.attrs.id);if(tag.name==='label'&&tag.attrs.for)labels.add(tag.attrs.for);
    if(tag.name==='a'){const href=(tag.attrs.href??'').trim();if(href.startsWith('#')&&href.length>1)fragments.push(safeDecode(decodeHtml(href.slice(1))));}
    if(tag.name==='div'&&classSet(tag.attrs).has('imgShop')&&tag.attrs.style!==undefined)imgStyles.push(tag.attrs.style);
    if(['input','select','textarea'].includes(tag.name)){const inputType=(tag.attrs.type??'').toLowerCase();if(!(tag.name==='input'&&['hidden','submit','button','image','reset'].includes(inputType)))controls.push({tag:tag.name,attrs:tag.attrs});}
    if(tag.name==='img'&&tag.attrs.alt){for(const item of stack)item.imgAlt=tag.attrs.alt;}
    if(!VOID_TAGS.has(tag.name)&&!tag.raw.endsWith('/>'))stack.push({name:tag.name,textStart:tag.index+tag.raw.length,tag,imgAlt:''});
  }
  const counts=new Map<string,number>();for(const id of ids)counts.set(id,(counts.get(id)??0)+1);for(const [id,count] of counts)if(count>1)issues.push(`duplicate id '${id}' appears ${count} times`);const idSet=new Set(ids);for(const fragment of unique(fragments).sort())if(!idSet.has(fragment))issues.push(`fragment target does not exist: #${fragment}`);
  for(const style of imgStyles){const normalized=decodeHtml(style).trim();if(normalized.startsWith('uploads_shop/')||normalized.startsWith('url('))issues.push(`malformed imgShop inline style: ${style.slice(0,120)}`);if(/(^|;)\s*background-(?:image|size|position|repeat)\s*:/i.test(normalized))issues.push('imgShop retains eager imgLiquid background styles after cleanup');}
  for(const control of controls){const a=control.attrs,named=Boolean((a['aria-label']??'').trim()||(a['aria-labelledby']??'').trim()||(a.title??'').trim()||(a.id&&labels.has(a.id)));if(!named)issues.push(`form control lacks an accessible name: ${control.tag}[${a.name||a.id||'<unnamed>'}]`);}
  for(const link of social)if(!link.named)issues.push(`social link lacks an accessible name: ${link.href}`);
  if(issues.length)failList('Pages HTML validation failed',issues);
}
