(function(){
'use strict';
var SC=window.SCOverride,N=SC&&SC.categoryNav;if(!SC||!N||SC.__categoryNavStickyStateBooted)return;SC.__categoryNavStickyStateBooted=true;
function setStuck(host,on){if(!host)return;var changed=host.classList.contains('sc-is-stuck')!==on;host.classList.toggle('sc-is-stuck',on);if(changed&&N.invalidateOffset)N.invalidateOffset();}
N.stickyState={set:setStuck};
})();