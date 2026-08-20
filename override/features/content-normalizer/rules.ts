(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{},C=SC.contentNormalizer=SC.contentNormalizer||{};
if(SC.__contentNormalizerRulesBooted)return;SC.__contentNormalizerRulesBooted=true;

type EditorialState={sentenceStart:boolean;words:number};

/* Reglas editoriales para español de Argentina. */
var LOCALE:string=C.locale||'es-AR';C.locale=LOCALE;
var CONNECTORS=new Set<string>(['a','al','ante','bajo','con','contra','de','del','desde','durante','e','el','en','entre','hacia','hasta','la','las','los','mediante','ni','o','para','por','que','según','sin','sobre','su','sus','tras','tu','tus','u','un','una','unos','unas','y']);
var PROTECTED:Readonly<Record<string,string>>={'aqa':'AQA','sushiclub':'SushiClub'};

/* Quita puntos decorativos sin romper decimales. */
function titlePeriodClean(text:string):string{return text.replace(/\./g,function(dot:string,index:number,source:string):string{var before=source.charAt(index-1),after=source.charAt(index+1);return /\d/.test(before)&&/\d/.test(after)?dot:'';});}
function capitalize(lower:string):string{var protectedValue=PROTECTED[lower];if(protectedValue)return protectedValue;return lower.replace(/[a-záéíóúüñ]/i,function(letter:string):string{return letter.toLocaleUpperCase(LOCALE);});}

/* Aplica mayúsculas respetando conectores y marcas protegidas. */
function smartCase(text:string,state:EditorialState,removePeriods:boolean):string{
  if(removePeriods)text=titlePeriodClean(text);
  var rx=/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+(?:['’][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+)*/g,out='',last=0,match:RegExpExecArray|null;
  while((match=rx.exec(text))){
    var separator=text.slice(last,match.index);out+=separator;if(/[.!?¡¿:]/.test(separator))state.sentenceStart=true;
    var raw=match[0]||'',lower=raw.toLocaleLowerCase(LOCALE),numeric=/^\d/.test(raw),word:string;
    if(numeric)word=lower;else if(CONNECTORS.has(lower)&&!state.sentenceStart)word=lower;else word=capitalize(lower);
    out+=word;state.sentenceStart=false;state.words++;last=rx.lastIndex;
  }
  return out+text.slice(last);
}
C.rules={titlePeriodClean:titlePeriodClean,smartCase:smartCase};
})();
