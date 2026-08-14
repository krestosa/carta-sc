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
		$(this).closest('.panel').find('.galAbs').addClass('close')
		return false
	})

	/* Remove controls if there is only one image. */
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

/* Catalogue bootstrap: real content paints immediately; no skeleton state. */
(function () {
	if (window.__scCatalogOverrideRequested) return;
	window.__scCatalogOverrideRequested = true;

	var assetVersion = '20260814-1728-rail-parent-rule-v13';
	window.__scCatalogAssetVersion = assetVersion;
	function asset(path) { return path + '?v=' + assetVersion; }

	var root = document.documentElement;
	root.classList.add('sc-catalog-prepaint', 'sc-no-loading-state');
	['sc-catalog-skeleton','sc-catalog-content-loading','sc-catalog-skeleton-leaving','sc-skeleton-ready'].forEach(function(name){
		if(root.classList.contains(name))root.classList.remove(name);
	});

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

	addBlockingCss('sc-catalog-css', asset('overrides/catalog.css'));
	addBlockingCss('sc-category-nav-css', asset('overrides/category-nav.css'));
	addBlockingCss('sc-catalog-prepaint-css', asset('overrides/prepaint.css'));
	addBlockingCss('sc-no-loading-state-css', asset('overrides/no-loading-state.css'));
	addBlockingCss('sc-motion-css', asset('motion/motion.css'));
	addBlockingCss('sc-product-image-ratio-css', asset('overrides/product-image-ratio.css'));
	addBlockingCss('sc-card-hierarchy-css', asset('overrides/card-hierarchy.css'));
	addBlockingCss('sc-section-lines-css', asset('motion/section-lines.css'));
	addBlockingCss('sc-content-normalizer-css', asset('overrides/content-normalizer.css'));

	var script = document.createElement('script');
	script.src = asset('overrides/catalog.js');
	script.async = false;
	document.head.appendChild(script);

	var modalCtaScript = document.createElement('script');
	modalCtaScript.src = asset('overrides/modal-cta.js');
	modalCtaScript.async = false;
	document.head.appendChild(modalCtaScript);

	var metaScript = document.createElement('script');
	metaScript.src = asset('overrides/product-meta-layout.js');
	metaScript.async = false;
	document.head.appendChild(metaScript);

	var normalizerScript = document.createElement('script');
	normalizerScript.src = asset('overrides/content-normalizer.js');
	normalizerScript.async = false;
	document.head.appendChild(normalizerScript);
})();

/* Motion policy: freeze only the first viewport. Everything originally below
   it keeps the GSAP/ScrollTrigger entrance reveals. */
(function () {
	if (window.__scUxMotionRequested) return;
	window.__scUxMotionRequested = true;

	var version = window.__scCatalogAssetVersion || '20260814-1728-rail-parent-rule-v13';
	var desktop = window.matchMedia('(min-width: 993px)');
	var attempts = 0;

	function markInitialViewport(){
		var vh = window.innerHeight || document.documentElement.clientHeight;
		document.querySelectorAll('.listadoShop .productoShop').forEach(function(card){
			var r = card.getBoundingClientRect();
			if(r.top < vh && r.bottom > 0)card.classList.add('sc-static-initial-card');
		});
		document.querySelectorAll('.listadoShop .titleShopSeccion, .listadoShop .subTitleShopSeccion').forEach(function(section){
			var r = section.getBoundingClientRect();
			if(r.top < vh && r.bottom > 0){
				section.classList.add('sc-static-initial-section');
				var host = section.matches('.titleShopSeccion') ? section.querySelector(':scope > div') : section;
				if(host)host.classList.add('sc-static-initial-section');
			}
		});
	}

	function loadMotion(){
		markInitialViewport();
		var script = document.createElement('script');
		script.src = 'motion/motion.js?v=' + version;
		script.async = true;
		script.onload = function(){
			if (!document.getElementById('sc-sticky-rail-motion-js')) {
				var sticky = document.createElement('script');
				sticky.id = 'sc-sticky-rail-motion-js';
				sticky.src = 'motion/sticky-rail.js?v=' + version;
				sticky.async = true;
				document.head.appendChild(sticky);
			}

			if (!document.getElementById('sc-section-lines-motion-js')) {
				var sectionLines = document.createElement('script');
				sectionLines.id = 'sc-section-lines-motion-js';
				sectionLines.src = 'motion/section-lines.js?v=' + version;
				sectionLines.async = true;
				document.head.appendChild(sectionLines);
			}

			if (!document.getElementById('sc-modal-motion-js')) {
				var modalMotion = document.createElement('script');
				modalMotion.id = 'sc-modal-motion-js';
				modalMotion.src = 'motion/modal-motion.js?v=' + version;
				modalMotion.async = true;
				document.head.appendChild(modalMotion);
			}
		};
		document.head.appendChild(script);
	}

	function waitForStableLayout(){
		if(!document.body){
			requestAnimationFrame(waitForStableLayout);
			return;
		}
		if(desktop.matches && !document.body.classList.contains('sc-catalog-layout-ready') && attempts++ < 45){
			requestAnimationFrame(waitForStableLayout);
			return;
		}
		requestAnimationFrame(function(){requestAnimationFrame(loadMotion);});
	}

	if(document.readyState === 'loading'){
		document.addEventListener('DOMContentLoaded', waitForStableLayout, {once:true});
	}else{
		waitForStableLayout();
	}
})();
