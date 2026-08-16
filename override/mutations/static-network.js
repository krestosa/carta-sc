(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{};
if(SC.__staticNetworkBooted)return;SC.__staticNetworkBooted=true;
var $=window.jQuery;if(!$||typeof $.ajax!=='function')return;
var ajax=$.ajax;
function urlOf(first,second){
  if(typeof first==='string')return first;
  if(first&&typeof first.url==='string')return first.url;
  return second&&typeof second.url==='string'?second.url:'';
}
function isKeepalive(url){
  if(!url)return false;
  try{
    var target=new URL(url,location.href);
    return target.origin===location.origin&&/\/carta_delivery\.php$/i.test(target.pathname)&&target.searchParams.get('keepalive')==='1';
  }catch(_){return false;}
}
$.ajax=function(first,second){
  if(!isKeepalive(urlOf(first,second)))return ajax.apply(this,arguments);
  return $.Deferred().resolve('', 'nocontent', null).promise();
};
})();
