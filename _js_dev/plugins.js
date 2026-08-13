$krc_dev = false

/*Avoid `console` errors in browsers that lack a console.________________________*/
if (!(window.console && console.log)) {
    (function() {
        var noop = function() {};
        var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'markTimeline', 'table', 'time', 'timeEnd', 'timeStamp', 'trace', 'warn'];
        var length = methods.length;
        var console = window.console = {};
        while (length--) {
            console[methods[length]] = noop;
        }
    }());
}

/*RemoteDEV ________________________________________________________________________*/
(function() {
    var forceRemote = false;
    var remoteJSsrc = 'http://jsconsole.com/remote.js?F7E86F97-3D18-4C3C-95A0-4E7FA304B60E';
    try {
        if ($krc_dev) {
            console.log('DevMode');
            if ((JSON && Kdetectmob()) || forceRemote) {
                console.log('injRemoteConsole');
                var head = document.getElementsByTagName('head')[0];
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = remoteJSsrc;
                head.appendChild(script);

                setTimeout(function() {
                    console.log('Hi remote3!', 'width: ' + $('body').width());
                    console.log(JSON.stringify(navigator.userAgent));
                }, 1000);
            }
        }
    } catch (error) {}
}());


/*Knormalize________________________________________________________________________*/
function Knormalize(obj) {
    if (!obj) return;
    var max = 0;
    var chldNormalize = obj;
    chldNormalize.each(function() {
        $(this).css('min-height', 0)
        mimax = $(this).height();
        if (mimax > max) max = mimax;
    });
    chldNormalize.each(function() {
        $(this).css('min-height', max)
    });
}


/*Krescale 2.0______________________________________________________________________*/
var kRescale = kRescale || {};
kRescale.objRescales = [];
kRescale.globalSize = {
    width: 0,
    height: 0
};
kRescale.minwidth = 320;
kRescale.getSize = function() {
    var w = window,
        d = document,
        e = d.documentElement,
        g = d.getElementsByTagName('body')[0],
        x = w.innerWidth || e.clientWidth || g.clientWidth,
        y = w.innerHeight || e.clientHeight || g.clientHeight;
    var $size = {
        width: x,
        height: y
    }
    if ($ && $(window) && $(window).width()) {
        $size = {
            width: $(window).width(),
            height: $(window).height()
        };
    }
    if ($size.width < kRescale.minwidth) $size.width = kRescale.minwidth;
    kRescale.globalSize = $size;
}
kRescale.update = function() {
    kRescale.getSize()
    for (var i = kRescale.objRescales.length - 1; i >= 0; i--) {
        var obj = kRescale.objRescales[i];
        if (Math.abs(obj.oldSize.width - kRescale.globalSize.width) === 0) continue;
        obj.oldSize = kRescale.globalSize;
        obj.callBack(kRescale.globalSize);
    }
}
kRescale.push = function(callBack) {
    if (!callBack) return;
    var obj = {}
    obj.callBack = callBack;
    obj.oldSize = {
        width: -1,
        height: -1
    };
    kRescale.objRescales.push(obj)
    if (kRescale.globalSize.width) obj.callBack(kRescale.globalSize);
}
kRescale.getSize()
$(window).on("debouncedresize", kRescale.update);


/*is mobile?______________________________________________________________________*/
function Kdetectmob() {
    if (navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i) || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/Windows Phone/i)) {
        return true;
    } else {
        return false;
    }
}


/*krange______________________________________________________________________*/
// var tm2 = function krange(tm, 0, 1, -10, 10)
function krange(
    $value, //VALOR ACTUAL
    $oldMin, //RANGO MINIMO ANTERIOR
    $oldMax, //RANGO ACTUAL ANTERIOR
    $newMin, //NUEVO MINIMO
    $newMax, //NUEVO MAXIMO
    $outPutLimit //LIMITE DEL OUPUT
) {

    var oldMin = $oldMin || 0;
    var oldMax = $oldMax || 1;
    var newMin = $newMin || 0;
    var newMax = $newMax || 1;
    var outPutLimit = $outPutLimit || false;

    var range1 = ($value - oldMin) / (oldMax - oldMin);
    var range2 = ((newMax - newMin) * range1) + newMin;

    if (outPutLimit) {
        if (range2 < newMin) range2 = newMin;
        if (range2 > newMax) range2 = newMax;
    }
    return range2;
}



/*_____________________________________________________________________________________*/
/* CLASE SLIDER */
/* EJ: var homeSlider = new kskSlider($(".HomeSliderContent"), {optsCycle:{fx: 'slide'}} )  */
/*_____________________________________________________________________________________*/
var counter = 0
var kskSlider = function(slctSlide, $argsObj, $argsImgLiquidObj) {

    $.event.special.debouncedresize.threshold = 300;
    //Argument ObJ

    var argsObj = $argsObj || {};

    var sizeBox = {};
    var box = slctSlide;
    var header = argsObj.header || $("header");
    var limitw = argsObj.limitw || 0.30;
    var limith = argsObj.limith || 0.65;
    var id = counter
    var childs
    var childsImg
    var defaults


    counter++

    //SelectChilds
    if (argsObj.childs) {
        childs = box.find(argsObj.childs);
    } else {
        childs = box.find(".sliderChild");
    }

    //ImagesOnly (para imgLiquid)
    if (argsObj.childsImg) {
        childsImg = box.find(argsObj.childsImg);
    } else {
        childsImg = box.find(".sliderIMG");
    }

    //CycleOptions______________
    defaults = {
        fx: 'fade',
        cleartypeNoBg: true,
        speed: 1800,
        easing: 'easeOutExpo',
        next: $('#nextSlideBtn'),
        prev: $('#prevSlideBtn'),
        timeout: 4000
    };
    var optsCycle = $.extend({}, defaults, argsObj.optsCycle);
    if ($('.lt-ie9').length) {
        optsCycle.speed = 0;
    }


    $('#nextSlideBtn, #prevSlideBtn').click(function() {
        if (box.cycle) box.cycle('pause');
    });


    var getBoxSize = function($size) {
        //ANCHO
        sizeBox.width = box.width();

        //ALTO
        sizeBox.height = $size.height;
        if (header) {
            sizeBox.height = $size.height - header.height();
        }

        //LIMITES
        if (sizeBox.height < sizeBox.width * limitw) sizeBox.height = sizeBox.width * limitw;
        if (sizeBox.height > sizeBox.width * limith) sizeBox.height = sizeBox.width * limith;
        sizeBox.height = Math.round(sizeBox.height);
        sizeBox.width = Math.round(sizeBox.width);
    }


    var setSize = function() {
        console.log(id, box.width());
        box.height(sizeBox.height);
        childs.width(sizeBox.width);
        console.log(childs);
        childs.height(sizeBox.height);
    }

    /*EXECUTES*/

    var imgLiquidOptions = {
        fill: true,
        verticalAlign: 'center'
    }
    imgLiquidOptions = $.extend({}, imgLiquidOptions, $argsImgLiquidObj);


    this.execute = function($size) {

        if (!box.length) return;
        setTimeout(function() {
            box.parent().addClass('visiBle');
        }, 100);
        if (box.cycle) box.cycle('destroy');
        if ($('.nav-collapse.in').length) {
            $('.btn.btn-navbar').click();
        }

        getBoxSize($size);
        setSize();
        box.cycle(optsCycle);
        childsImg.imgLiquid(imgLiquidOptions);
    }


    return this.execute;
};