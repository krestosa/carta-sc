/* Los títulos estáticos permanecen visibles; este adaptador conserva el contrato de lifecycle. */
(function(){
'use strict';
var SC=window.SCOverride;if(!SC||SC.__sectionHeadingBooted)return;SC.__sectionHeadingBooted=true;
var initialized=false;
function ensureGate(){if(SC.catalogRevealGate)return SC.catalogRevealGate;var root=document.documentElement,gate={headings:false,cards:false,released:false};gate.release=function(){if(gate.released)return;gate.released=true;if(root){root.setAttribute('data-sc-catalog-reveal-ready','true');root.classList.remove('sc-catalog-reveal-prepaint');}};gate.mark=function(part){if(part==='headings')gate.headings=true;if(part==='cards')gate.cards=true;if(gate.headings&&gate.cards)gate.release();};return SC.catalogRevealGate=gate;}
var gate=ensureGate();
function init(){if(initialized)return;initialized=true;gate.mark('headings');}
function destroy(){initialized=false;}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
SC.sectionHeading={init:init,destroy:destroy,cleanup:destroy};
})();