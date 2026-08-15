(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,K=C&&C.classes,N=SC&&SC.categoryNav;if(!SC||!C||!N||SC.__categoryNavStickyStateBooted)return;SC.__categoryNavStickyStateBooted=true;
function setStuck(host,on){if(!host)return;var changed=host.classList.contains(K.stuck)!==on;host.classList.toggle(K.stuck,on);if(changed&&N.invalidateOffset)N.invalidateOffset();}
N.stickyState={set:setStuck};
})();