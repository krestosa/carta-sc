/* Aplica el estado sticky del riel y vuelve a medir offsets solo cuando realmente cambia.
   Esto evita recalcular navegación en cada frame de scroll sin necesidad. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,K=C&&C.classes,N=SC&&SC.categoryNav;if(!SC||!C||!N||SC.__categoryNavStickyStateBooted)return;SC.__categoryNavStickyStateBooted=true;
function setStuck(host,on){if(!host)return;var changed=host.classList.contains("sc-is-stuck")!==on;host.classList.toggle("sc-is-stuck",on);if(changed){if(N.invalidateOffset)N.invalidateOffset();if(N.refreshMetrics)N.refreshMetrics();}}
N.stickyState={set:setStuck};
})();
