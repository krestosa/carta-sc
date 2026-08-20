(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,S=CFG&&CFG.selectors,C=SC&&SC.contentNormalizer,R=C&&C.rules,LOCALE:string=C&&C.locale||'es-AR';
if(!SC||!C||!R||SC.__contentNormalizerDomBooted)return;SC.__contentNormalizerDomBooted=true;

type EditorialOptions={skip?:string;removePeriods?:boolean};
type EditorialState={sentenceStart:boolean;words:number};

/* Hosts que admiten normalización editorial. */
var HOST_SELECTOR=S.sectionTitle+','+S.sectionSubtitle+','+S.productCard+' '+S.productTitle+','+S.productCard+' '+S.productDescription;

/* Recorre solo nodos de texto útiles. */
function textNodes(root:Element,skipSelector?:string):Text[]{
  var nodes:Text[]=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(node:Node):number{var parent=node.parentElement;if(!parent||parent.closest('script,style')||(skipSelector&&parent.closest(skipSelector)))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT;}}),node:Node|null;
  while((node=walker.nextNode()))if(node instanceof Text)nodes.push(node);return nodes;
}

/* Títulos de sección en mayúsculas y texto editorial en sentence case. */
function normalizeUpper(root:Element):void{textNodes(root).forEach(function(node:Text):void{var current=node.nodeValue||'',next=R.titlePeriodClean(current).toLocaleUpperCase(LOCALE);if(next!==node.nodeValue)node.nodeValue=next;});}
function normalizeEditorial(root:Element,options?:EditorialOptions):void{var state:EditorialState={sentenceStart:true,words:0};textNodes(root,options&&options.skip).forEach(function(node:Text):void{var current=node.nodeValue||'',next=R.smartCase(current,state,!!(options&&options.removePeriods));if(next!==node.nodeValue)node.nodeValue=next;});}

/* Elimina formato inline que rompe la tipografía de descripciones. */
function unwrapTypography(description:Element):void{
  description.querySelectorAll<HTMLElement>('b,strong').forEach(function(node:HTMLElement):void{var parent=node.parentNode;if(!parent)return;while(node.firstChild)parent.insertBefore(node.firstChild,node);parent.removeChild(node);});
  description.querySelectorAll<HTMLElement>('[style]').forEach(function(node:HTMLElement):void{['font-family','font-size','font-weight','font-style','text-transform','letter-spacing','line-height'].forEach(function(prop:string):void{node.style.removeProperty(prop);});var style=node.getAttribute('style');if(!style||!style.trim())node.removeAttribute('style');});
}

/* Aplica la regla correspondiente según el tipo de host. */
function normalizeHost(host:Element|null|undefined):void{
  if(!host||host.nodeType!==1||!document.documentElement.contains(host))return;
  if(host.matches(S.sectionTitle+','+S.sectionSubtitle)){normalizeUpper(host);return;}
  if(host.matches(S.productCard+' '+S.productTitle)){normalizeEditorial(host,{skip:S.productTraits,removePeriods:true});return;}
  if(host.matches(S.productCard+' '+S.productDescription)){unwrapTypography(host);normalizeEditorial(host,{removePeriods:false});}
}
function normalizeCatalogue():void{document.querySelectorAll<Element>(HOST_SELECTOR).forEach(normalizeHost);}

/* Reúne hosts afectados por una mutación puntual. */
function collect(node:Node|null|undefined,target:Set<Element>):void{var el=node&&node.nodeType===1?node as Element:node&&node.parentElement;if(!el)return;var host=el.closest&&el.closest(HOST_SELECTOR);if(host)target.add(host);if(el.querySelectorAll)el.querySelectorAll<Element>(HOST_SELECTOR).forEach(function(item:Element):void{target.add(item);});}
C.dom={selector:HOST_SELECTOR,normalizeHost:normalizeHost,normalizeCatalogue:normalizeCatalogue,collect:collect};
})();
