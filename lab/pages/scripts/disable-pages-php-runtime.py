#!/usr/bin/env python3
import os
import re
from pathlib import Path

SITE = Path('.pages-site')
INDEX = SITE / 'index.html'
GUARD = SITE / '_pages/php-guard.js'
SHA = os.environ.get('GITHUB_SHA', '')

if not re.fullmatch(r'[0-9a-f]{40}', SHA):
    raise SystemExit('GITHUB_SHA is missing or invalid')
if not INDEX.is_file():
    raise SystemExit('Prepared Pages index is missing')

OLD_RUNTIME = (
    "A=['js/jquery-2.1.0.min.js','_pages/legacy.js?v='+S,"
    "'_js_dev/main-legacy.js?v='+S,'override/main.js?v='+S,'_pages/shop.js?v='+S]"
)
NEW_RUNTIME = (
    "A=['js/jquery-2.1.0.min.js','_pages/php-guard.js?v='+S,'_pages/legacy.js?v='+S,"
    "'_js_dev/main-legacy.js?v='+S,'override/main.js?v='+S,'_pages/shop.js?v='+S]"
)

PHP_GUARD = r"""(function(w){
'use strict';
if(w.__scPagesPhpGuardBooted)return;w.__scPagesPhpGuardBooted=true;
function urlOf(input){
  if(typeof input==='string')return input;
  if(input&&typeof input.url==='string')return input.url;
  return input==null?'':String(input);
}
function isPhp(input){
  var value=urlOf(input);if(!value)return false;
  try{return /\.php$/i.test(new URL(value,w.location.href).pathname);}
  catch(_){return /\.php(?:[?#]|$)/i.test(value);}
}
var $=w.jQuery;
if($&&$.Deferred&&typeof $.ajax==='function'){
  var nativeAjax=$.ajax;
  $.ajax=function(url,options){
    var settings=url&&typeof url==='object'?url:(options||{}),target=typeof url==='string'?url:settings.url;
    if(!isPhp(target))return nativeAjax.apply(this,arguments);
    var deferred=$.Deferred();
    return deferred.promise({
      readyState:0,status:0,statusText:'static-pages',responseText:'',
      abort:function(){return this;},
      getAllResponseHeaders:function(){return '';},
      getResponseHeader:function(){return null;},
      setRequestHeader:function(){return this;},
      overrideMimeType:function(){return this;},
      statusCode:function(){return this;}
    });
  };
  if($.fn&&typeof $.fn.load==='function'){
    var nativeLoad=$.fn.load;
    $.fn.load=function(url){
      if(typeof url==='string'&&isPhp(url.split(/\s+/)[0]))return this;
      return nativeLoad.apply(this,arguments);
    };
  }
}
if(typeof w.fetch==='function'){
  var nativeFetch=w.fetch;
  w.fetch=function(input,init){
    if(isPhp(input)){
      if(typeof w.Response==='function')return Promise.resolve(new w.Response('',{status:200,statusText:'OK'}));
      return Promise.resolve({ok:true,status:200,statusText:'OK',text:function(){return Promise.resolve('');},json:function(){return Promise.resolve({});}});
    }
    return nativeFetch.apply(this,arguments);
  };
}
if(w.navigator&&typeof w.navigator.sendBeacon==='function'){
  var nativeBeacon=w.navigator.sendBeacon.bind(w.navigator);
  w.navigator.sendBeacon=function(url,data){return isPhp(url)?true:nativeBeacon(url,data);};
}
w.__scPagesIsPhpRequest=isPhp;
})(window);
"""


def remove_session_keepalive(html):
    pattern = re.compile(
        r"\s*var\s+keepSessionAlive\s*=\s*function\s*\(\s*\)\s*\{[\s\S]*?"
        r"(?=\s*if\s*\(\s*\$\.fn\s*&&\s*\$\.fn\.fancybox\s*\)\s*\{)",
        re.IGNORECASE,
    )
    html, count = pattern.subn('\n', html, count=1)
    if count != 1:
        raise SystemExit(f'Expected one captured PHP keepalive block, found {count}')
    return html


def install_runtime_guard(html):
    count = html.count(OLD_RUNTIME)
    if count != 1:
        raise SystemExit(f'Expected one optimized runtime manifest before PHP guard, found {count}')
    html = html.replace(OLD_RUNTIME, NEW_RUNTIME, 1)
    GUARD.parent.mkdir(parents=True, exist_ok=True)
    GUARD.write_text(PHP_GUARD, encoding='utf-8')
    return html


def validate_no_automatic_php_resources(html):
    # Los valores href/action de navegación pueden apuntar intencionalmente al sitio activo
    # de SushiClub. En el artefacto estático de Pages sólo se prohíben los recursos que el
    # navegador carga automáticamente.
    active = re.sub(r'<!--[\s\S]*?-->', '', html)
    resource = re.compile(
        r'<(?:script|img|iframe|source|video|audio|embed|object|link)\b[^>]*\b(?:src|data|href)\s*=\s*["\'][^"\']*\.php(?:[?#][^"\']*)?["\'][^>]*>',
        re.IGNORECASE,
    )
    match = resource.search(active)
    if match:
        raise SystemExit('Automatic PHP resource remains in Pages artifact: ' + match.group(0)[:240])


def verify(html):
    if 'keepSessionAlive' in html or 'keepalive: 1' in html:
        raise SystemExit('Captured PHP session keepalive remains in final Pages HTML')
    if html.count(NEW_RUNTIME) != 1:
        raise SystemExit('PHP-safe runtime manifest must appear exactly once')
    if html.count("'_pages/php-guard.js?v='+S") != 1:
        raise SystemExit('PHP guard runtime entry must appear exactly once')
    if not GUARD.is_file() or GUARD.stat().st_size < 500:
        raise SystemExit('Generated PHP guard is missing or unexpectedly small')
    jquery = NEW_RUNTIME.find("'js/jquery-2.1.0.min.js'")
    guard = NEW_RUNTIME.find("'_pages/php-guard.js?v='+S")
    legacy = NEW_RUNTIME.find("'_pages/legacy.js?v='+S")
    if not (jquery < guard < legacy):
        raise SystemExit('PHP guard must load after jQuery and before legacy runtime')
    validate_no_automatic_php_resources(html)


def main():
    html = INDEX.read_text(encoding='utf-8')
    html = remove_session_keepalive(html)
    html = install_runtime_guard(html)
    verify(html)
    INDEX.write_text(html, encoding='utf-8')
    print('Disabled captured PHP keepalive and inserted the static Pages PHP transport guard.')


if __name__ == '__main__':
    main()
