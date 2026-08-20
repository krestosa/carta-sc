import { stripQuery } from '../lib/core.js';

export type Attrs=Record<string,string>;
export interface HtmlTag { name:string; attrs:Attrs; raw:string; index:number; closing:boolean; }
export const VOID_TAGS=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
export const SOCIAL_HOSTS=new Set(['facebook.com','www.facebook.com','instagram.com','www.instagram.com','tiktok.com','www.tiktok.com','pinterest.com','www.pinterest.com']);

export function decodeHtml(value:string):string{return value.replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');}
function parseAttrs(raw:string):Attrs{
  const attrs:Attrs={};
  const body=raw.replace(/^<\/?[a-z0-9:-]+/i,'').replace(/\/?\s*>$/,'');
  const re=/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for(const match of body.matchAll(re)){const key=(match[1]??'').toLowerCase();if(!key)continue;attrs[key]=decodeHtml(match[2]??match[3]??match[4]??'');}
  return attrs;
}
function maskRawText(html:string):string{
  return html.replace(/(<(?<tag>script|style)\b[^>]*>)(?<body>[\s\S]*?)(<\/\k<tag>\s*>)/gi,(_all:string,open:string,_tag:string,_body:string,close:string,...args:unknown[])=>{
    const groups=args.at(-1) as {body?:string}|undefined;
    return open+' '.repeat((groups?.body??'').length)+close;
  });
}
export function scanTags(html:string):HtmlTag[]{
  const out:HtmlTag[]=[],masked=maskRawText(html),re=/<\/?[a-zA-Z][^>]*>/g;
  for(const match of masked.matchAll(re)){const raw=match[0],name=/^<\/?\s*([a-z0-9:-]+)/i.exec(raw)?.[1]?.toLowerCase();if(!name||match.index===undefined)continue;out.push({name,attrs:parseAttrs(raw),raw,index:match.index,closing:/^<\//.test(raw)});}
  return out;
}
export function classSet(attrs:Attrs):Set<string>{return new Set((attrs.class??'').trim().split(/\s+/).filter(Boolean));}
export function unique<T>(items:T[]):T[]{return [...new Set(items)];}
export function countLiteral(text:string,value:string):number{return text.split(value).length-1;}
export function urlPath(value:string):string{return stripQuery(value).replace(/^\.\//,'').replace(/^\//,'');}
export function remote(value:string):boolean{return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value);}
export function safeDecode(value:string):string{try{return decodeURIComponent(value);}catch{return value;}}
export function localResource(value:string):string|null{
  const decoded=decodeHtml(value.trim());
  if(!decoded||/^(?:#|data:|blob:|javascript:|mailto:|tel:)/i.test(decoded)||remote(decoded))return null;
  return safeDecode(stripQuery(decoded));
}
export function failList(title:string,issues:string[]):never{const deduped=unique(issues);throw new Error(`${title} with ${deduped.length} issue(s):\n${deduped.map((item)=>`- ${item}`).join('\n')}`);}
