(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{},CFG=SC.config||{},LOCALE=CFG.catalog&&CFG.catalog.locale||'es-AR',C=SC.contentNormalizer=SC.contentNormalizer||{};
if(SC.__contentNormalizerRulesBooted)return;SC.__contentNormalizerRulesBooted=true;
var CONNECTORS=new Set(['a','al','ante','bajo','con','contra','de','del','desde','durante','e','el','en','entre','hacia','hasta','la','las','los','mediante','ni','o','para','por','que','según','sin','sobre','su','sus','tras','tu','tus','u','un','una','unos','unas','y']);
var PROTECTED={'aqa':'AQA','sushiclub':'SushiClub'};
function titlePeriodClean(text){return text.replace(/\./g,function(dot,index,source){var before=source.charAt(index-1),after=source.charAt(index+1);return /\d/.test(before)&&/\d/.test(after)?dot:'';});}
function capitalize(lower){if(PROTECTED[lower])return PROTECTED[lower];return lower.replace(/[a-záéíóúüñ]/i,function(letter){return letter.toLocaleUpperCase(LOCALE);});}
function smartCase(text,state,removePeriods){
  if(removePeriods)text=titlePeriodClean(text);
  var rx=/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+(?:['’][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+)*/g,out='',last=0,match;
  while((match=rx.exec(text))){
    var separator=text.slice(last,match.index);out+=separator;if(/[.!?¡¿:]/.test(separator))state.sentenceStart=true;
    var raw=match[0],lower=raw.toLocaleLowerCase(LOCALE),numeric=/^\d/.test(raw),word;
    if(numeric)word=lower;else if(CONNECTORS.has(lower)&&!state.sentenceStart)word=lower;else word=capitalize(lower);
    out+=word;state.sentenceStart=false;state.words++;last=rx.lastIndex;
  }
  return out+text.slice(last);
}
C.rules={titlePeriodClean:titlePeriodClean,smartCase:smartCase};
})();