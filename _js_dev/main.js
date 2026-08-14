$(function(){

	parralaxSlider()
	normSlider()
	makBotoneraStore()
	botoneraFirstItem()

	//MODAL
	$('.modalNorm').nyroModal();

	$('.modalReservas').nyroModal({
		sizes: {
			// initW: 262,
			// initH: height,
			// minW: width,
			// minH: height,
			w: 262,
			h: 380
		}
	});

	//SLKICK
	$('#menuMobile').slicknav();

	//imgLiquid
	$('.imgLiquidNoFill').imgLiquid({fill:false});
	$('.imgLiquidResFit').imgLiquid({fill:false, responsive:true});
	$('.imgLiquidResFill').imgLiquid({fill:true, responsive:true});

	/**/
	sliderInternal()
	modalesConLink()
	accordions()
	emptyRows()

	//Remove last dashed
	$('.dashed').prev().css('border-bottom', 0)

	$('.YTvideo').fancybox({
		openEffect  : 'none',
		closeEffect : 'none',
		width: '90%',
		height: '90%',
		autoSize: false,
		closeClick: false,
		closeBtn: true,
		openEffect: 'none',
		wrapCSS: 'closeAlt',
		closeEffect: 'none',
		padding: 0,
		margin: 10,
		helpers : {
			media : {}
		}
	});


});
$(window).load(function() {
	modalesHome()
	noFoto()
});

function modalesHome(){
	if ($(".modalNormPOPHOME").length){
		setTimeout(function() {$('.modalNormPOPHOME').click() }, 500)
	}
};

function emptyRows(){
	$('.row').each(function(){
		var obj = $(this).html()
		var inobj = String(obj).split(" ", "")
		var inobjL = inobj.length
		if (inobjL === 0){
			$(this).addClass('empty')
		}
	})
}



var lastLinkPop = ''
var lastLinkPopTar = ''
function modalesConLink(){
	$('.modalNorm').on('click', function(){
		lastLinkPop = ''
		lastLinkPopTar  = ''
		if ($(this).attr('data-suburl')){
			lastLinkPop  = $(this).attr('data-suburl')
			lastLinkPopTar = $(this).attr('target')
		}
	})
	$('.nyroModalImage img').livequery(function() {
		if (lastLinkPop !== '' && lastLinkPop !== null && lastLinkPop.length > 5){
			$(this).css('cursor', 'pointer')
			$(this).on('click', function(){
				if (lastLinkPopTar.toLowerCase().indexOf('blank') === -1){
					window.location.href =  lastLinkPop
				}else{
					window.open(lastLinkPop);
				}
			})
		}
	});
}
/*AUX*/
function getURLParameter(name, link) {
	return decodeURI((RegExp(name + '=' + '(.+?)(&|$)').exec(link)||[,null])[1]);
}


function sliderInternal(){
	$('.sliderInternal').after('<div id="navslider">')
	.cycle({
		speed: 600,
		timeout: 3000,
		width: "100%",
		slides: "> .containerSlide",
		pager:  '#navslider'
	});

	$('.sliderInternalEsp').after('')
	.cycle({
		speed: 600,
		timeout: 3000,
		width: "100%",
		slides: "> .containerSlide",
	});
	$('.backgSlideLeft2').on('click', function(){
		$(this).closest('.sliderInternalEsp').cycle('prev');
	})
	$('.backgSlideRight2').on('click', function(){
		$(this).closest('.sliderInternalEsp').cycle('next');
	})

	/*Boton que abre galeria en Nuestros espacios*/
	$('.JSviewGal').on('click', function(){
		$(this).closest('.panel').find(".galAbs").removeClass("close")
		return false
	})
	$('.JSviewMap').on('click', function(){
		$(this).closest('.panel').find(".galAbs").addClass("close")
		return false
	})

	//Saca los controles si hay solo una image
	$('.sliderInternalEsp, .sliderInternalEsp').each(function(){
		if ($('.containerSlide', this).length < 20){
			$('.controls', this).hide()
		}
	})
}


/*PARALLAX*/
function parralaxSlider(){
	if (!$('.cycleslideshow').length) return;
	var timeOut = 4000;
	var Speed = 600;
	var cssTransforms = Boolean ($('.csstransforms').length)
	var minDevice = Boolean ($('body').width() < 480 )
	if (cssTransforms && !minDevice && $('#sceneParallax').length){
		var scene = document.getElementById('sceneParallax');
		var parallax = new Parallax(scene);
		$('.cycleslideshow').attr("data-cycle-auto-height","1600:600")
		$('.parallaxSlideDammy').remove()

		/*FIX BUG RARO*/
		$('#sceneParallax').css("-webkit-transform-style", "initial")
		timeOut = 0
	}else{
		$('.parallaxSlide').remove()
		if ($('body.home').length){
			timeOut = 0
		}
	}
	if (!cssTransforms){
		Speed = 10
	}
	if (minDevice){
		$('.imgSlider').addClass('imgSliderMob')
		var propStr = String("1600:" + 600*1.4)
		$('.cycleslideshow').attr("data-cycle-auto-height", propStr)
	}
	setTimeout(function() {
		$('.cycleslideshow').attr("data-cycle-pause-on-hover", "true")
		$('.cycleslideshow').addClass('loaded')
		$('.cycleslideshow').cycle({
			speed: Speed,
			timeout: timeOut,
			width: "100%",
			slides: "> li"
		});
	}, 1);
	$('.backgSlideLeft').on('click', function(){
		$('.cycleslideshow').cycle('prev');
	})
	$('.backgSlideRight').on('click', function(){
		$('.cycleslideshow').cycle('next');
	})
}



/*PARALLAX*/
function normSlider(){

	$('.newSlideSlickHome').slick({
		infinite: true,
		arrows: true,
		dots: false,
		autoplay: true,
		autoplaySpeed: 6000,
		pauseOnHover: false,
		// useCSS: true,
		useTransform: true,
		// easy: "easeOutBack",
		// cssEase: "cubic-bezier(0,0,0.2,1)",
		speed: 1200,
	});

	if (!$('.cycleslideshowIn').length) return;
	var timeOut = 4000
	var Speed = 600
	var cssTransforms = Boolean ($('.csstransforms').length)
	var minDevice = Boolean ($('body').width() < 480 )
	if (cssTransforms && !minDevice && $('#sceneParallax').length){
		timeOut = 0
	}
	if (!cssTransforms){
		Speed = 100
	}
	if (minDevice){
		$('.imgSlider').addClass('imgSliderMob')
		var propStr = String("1600:" + 600*1.4)
		$('.cycleslideshowIn').attr("data-cycle-auto-height", propStr)
	}
	setTimeout(function() {
		$('.cycleslideshowIn').attr("data-cycle-pause-on-hover", "true")
		$('.cycleslideshowIn').addClass('loaded')
		$('.cycleslideshowIn').cycle({
			speed: Speed,
			timeout: timeOut,
			width: "100%",
			slides: "> li"
		});
	}, 1);
	$('.backgSlideLeft').on('click', function(){
		$('.cycleslideshowIn').cycle('prev');
	})
	$('.backgSlideRight').on('click', function(){
		$('.cycleslideshowIn').cycle('next');
	})

}


function makBotoneraStore(){
	$('.botoneraSC > li > a').click(abrebotonera);
	function abrebotonera(){
		if ($(this).attr('href') == '#') {
			var miLi = $(this).closest('li')
			if (miLi.hasClass('open')){
				//SI ESTA ABIERTO, CIERRA
				$('.botoneraSC > li').removeClass('open');
			}else{
				$('.botoneraSC > li').removeClass('open');
				miLi.addClass('open');
			}
			return false;
		}
	}
}


function accordions(){
	//Si hay solo un accordion (salvo en delivery que tiene el suyo propio)
	if ($('body.delivery').length ===0){
		if ($('.accordion-toggle').length === 1 && $('.accordion-toggle').closest('.panel').find('.collapse').length === 1){
			$('.accordion-toggle').eq(0).click()
		}
	}
	$('a.accordion-toggle').closest('.panel-heading').on('click', function(e){
		if ($(e.target).hasClass('panel-heading')){
			e.stopPropagation();
			$(this).find('a.accordion-toggle').trigger('click');
			return false
		}
	})
}

function botoneraFirstItem(){
	$("ul.nav > li:not(.onlyMobile)").eq(0).addClass ('firstBot')
}

function noFoto(){
	$(".sliderInternalEsp").each(function(){
		if(! $(this).find('img').length){
			$(this).closest('.panel-body').find('.JSviewMap').click()
		}
	})
	$('.panel-body p:empty:not([class])').remove()
}

/* Catalogue + motion bootstrap. CSS is parser-blocking so legacy catalogue
   surfaces can never reach first paint. Behaviour remains isolated in overrides/. */
(function () {
	if (window.__scCatalogOverrideRequested) return;
	window.__scCatalogOverrideRequested = true;

	document.documentElement.classList.add(
		'sc-catalog-prepaint',
		'sc-catalog-skeleton',
		'sc-catalog-content-loading'
	);

	function addBlockingCss(id, href) {
		if (document.getElementById(id)) return;
		if (document.readyState === 'loading') {
			document.write('<link id="' + id + '" rel="stylesheet" href="' + href + '">');
			return;
		}
		var link = document.createElement('link');
		link.id = id;
		link.rel = 'stylesheet';
		link.href = href;
		document.head.appendChild(link);
	}

	addBlockingCss('sc-catalog-css', 'overrides/catalog.css?v=20260814-1258-ratio');
	addBlockingCss('sc-category-nav-css', 'overrides/category-nav.css?v=20260814-1258-ratio');
	addBlockingCss('sc-loading-skeleton-css', 'overrides/loading-skeleton.css?v=20260814-1258-ratio');
	addBlockingCss('sc-catalog-prepaint-css', 'overrides/prepaint.css?v=20260814-1258-ratio');
	addBlockingCss('sc-motion-css', 'motion/motion.css?v=20260814-1258-ratio');
	addBlockingCss('sc-catalog-type-grid-css', 'overrides/catalog-type-grid.css?v=20260814-1258-ratio');
	addBlockingCss('sc-product-image-ratio-css', 'overrides/product-image-ratio.css?v=20260814-1258-ratio');

	var script = document.createElement('script');
	script.src = 'overrides/catalog.js?v=20260814-1258-ratio';
	script.async = false;
	document.head.appendChild(script);
})();

/* Dedicated motion bootstrap. Do not add animation logic here. */
(function () {
	if (window.__scUxMotionRequested) return;
	window.__scUxMotionRequested = true;

	var script = document.createElement('script');
	script.src = 'motion/motion.js?v=20260814-1258-ratio';
	script.async = true;
	document.head.appendChild(script);
})();