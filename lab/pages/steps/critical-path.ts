import path from 'node:path';
import { SITE, assert, escapeRegExp, githubSha, read, write } from '../lib/core.js';

export function optimizeCriticalPath():void{
  const sha=githubSha();
  const file=path.join(SITE,'index.html');
  let html=read(file);
  let fontCount=0;
  html=html.replace(/https:\/\/fonts\.googleapis\.com\/css\?family=Roboto:300,400,700(?:&amp;|&)display=swap|https:\/\/fonts\.googleapis\.com\/css\?family=Roboto:300,400,700/i,()=>{fontCount++;return 'https://fonts.googleapis.com/css?family=Roboto:300,400,700&amp;display=swap';});
  assert(fontCount===1,`Expected one Roboto Google Fonts stylesheet URL, found ${fontCount}`);
  const banner=/<img\b(?=[^>]*\bclass="[^"]*\bimgBannerShop\b[^"]*")(?=[^>]*\bsrc="([^"]+)")[^>]*>/i.exec(html);
  assert(banner?.[1],'Could not locate the catalogue banner image');
  const bannerSrc=banner[1];
  const patterns=[
    /<link\s+rel="preconnect"\s+href="https:\/\/fonts\.googleapis\.com"\s*>/i,
    /<link\s+rel="preconnect"\s+href="https:\/\/fonts\.gstatic\.com"\s+crossorigin\s*>/i,
    /<link\s+rel="preconnect"\s+href="https:\/\/cdn\.jsdelivr\.net"\s+crossorigin\s*>/i,
    new RegExp(`<link\\s+rel="preload"\\s+as="script"\\s+href="_js_dev/main-legacy\\.js\\?v=${escapeRegExp(sha)}"\\s*>`,'i'),
    new RegExp(`<link\\s+rel="preload"\\s+as="style"\\s+href="override/main\\.css\\?v=${escapeRegExp(sha)}"\\s*>`,'i'),
    new RegExp(`<link\\s+rel="preload"\\s+as="script"\\s+href="override/main\\.js\\?v=${escapeRegExp(sha)}"\\s*>`,'i'),
    /<link\s+rel="preload"\s+href="fuentes\/AcuminPro-Regular\.woff2"\s+as="font"\s+type="font\/woff2"\s+crossorigin\s*>/i,
    /<link\s+rel="preload"\s+href="fuentes\/AcuminPro-Semibold\.woff2"\s+as="font"\s+type="font\/woff2"\s+crossorigin\s*>/i
  ];
  for(const pattern of patterns){
    assert((html.match(new RegExp(pattern.source,'gi'))??[]).length===1,`Expected exactly one critical resource hint for pattern: ${pattern.source}`);
    html=html.replace(pattern,'');
  }
  const hints=[
    '<link rel="preconnect" href="https://fonts.googleapis.com">','<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>','<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>',
    `<link rel="preload" as="image" href="${bannerSrc}" fetchpriority="high">`,
    '<link rel="preload" href="fuentes/AcuminPro-Regular.woff2" as="font" type="font/woff2" crossorigin>',
    '<link rel="preload" href="fuentes/AcuminPro-Semibold.woff2" as="font" type="font/woff2" crossorigin>',
    `<link rel="preload" as="script" href="_js_dev/main-legacy.js?v=${sha}">`, `<link rel="preload" as="style" href="override/main.css?v=${sha}">`, `<link rel="preload" as="script" href="override/main.js?v=${sha}">`
  ].join('\n');
  let charsetCount=0;
  html=html.replace(/<meta\s+charset="utf-8"\s*>/i,(tag)=>{charsetCount++;return `${tag}\n${hints}`;});
  assert(charsetCount===1,'Could not place critical hints immediately after meta charset');
  assert(html.split(`<link rel="preload" as="image" href="${bannerSrc}" fetchpriority="high">`).length-1===1,'Banner preload must appear exactly once');
  assert(html.split('https://fonts.googleapis.com/css?family=Roboto:300,400,700&amp;display=swap').length-1===1,'Roboto stylesheet must use display=swap exactly once');
  const lower=html.toLowerCase(), headStart=lower.indexOf('<head>'),headEnd=lower.indexOf('</head>'),charsetPos=lower.indexOf('<meta charset="utf-8"',headStart),bannerPos=html.indexOf(`<link rel="preload" as="image" href="${bannerSrc}"`,headStart),googlePos=html.indexOf('https://fonts.googleapis.com/css?',headStart);
  assert(headStart>=0&&headEnd>headStart&&charsetPos>headStart&&bannerPos>charsetPos,'Critical hints are not positioned at the start of the document head');
  assert(googlePos<0||bannerPos<googlePos,'Critical resource hints must precede the Google Fonts stylesheet');
  write(file,html);
}
