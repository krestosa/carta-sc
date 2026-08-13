$(function() {
	PS_initSearch();
	makeToolTips();
	shopCopyMobileNav();
	moment.locale('es');
	shop_JSModales();
	shop_imgLiquids();
	shop_normalizeCols();
	dropdowntogglewOver();
	scrllAnim();
	JSgoMenu();
	JSgroupButtons();
	JSTopDropDown();
});

//___________________________________________________________
/*GENERICOS*/
//___________________________________________________________
function makeToolTips() {
	$('[data-toggle="tooltip"]').livequery(function() {
		$(this).tooltip({
			animation: false,
			delay: { show: 240, hide: 0 }
		});
	});
}

function shopCopyMobileNav() {
	$('.JSgoMenu').remove();
	$('.copyNav').html('');
	$('.copyNav').html(
		$('.topShop .wrapp-nav-tabsTopShop')
			.eq(0)
			.html()
	);
}

function JSTopDropDown() {
	$('.nav-tabsTopShop .anchorLink').on('mouseenter', function() {
		var that = this;
		var $topDown = $(that)
			.closest('.nav-top-li')
			.find('.topPullDown');
		$topDown.addClass('open');
		$('.topShopMenuMobile').addClass('_open');
	});
	$('.nav-top-li').on('mouseleave', function() {
		$('.topPullDown').removeClass('open');
		$('.topShopMenuMobile').removeClass('_open');
	});
	$('.nav-tabsTopShop a').on('click', function() {
		$('.topPullDown').removeClass('open');
		$('.topShopMenuMobile').removeClass('_open');
	});

	$('.scrollArrowR').on('click', function() {
		event.preventDefault();
		$('.topShopMenuMobileScroller').animate(
			{
				scrollLeft: '+=180px'
			},
			'fast'
		);
	});

	$('.scrollArrowL').on('click', function() {
		event.preventDefault();
		$('.topShopMenuMobileScroller').animate(
			{
				scrollLeft: '-=180px'
			},
			'fast'
		);
	});
}

function shop_JSModales() {
	//http://fancyapps.com/fancybox/
	// $('.fancyboxModalAddProd').fancybox({
	// 	maxWidth: 480,
	// 	maxHeight: 650,
	// 	width: '100%',
	// 	height: 600,
	// 	autoSize: false,
	// 	closeClick: false,
	// 	closeBtn: true,
	// 	openEffect: 'none',
	// 	wrapCSS: 'fancyShopModal closeAlt shopModalProd',
	// 	closeEffect: 'none',
	// 	padding: 0,
	// 	margin: 10,
	// 	helpers: {
	// 		overlay: {
	// 			locked: false
	// 		}
	// 	}
	// });

	$('.fancyboxModalAddProd').fancybox({
	    maxWidth: 480,
	    fitToView: false,
	    width: '100%',
	    height: 'auto',
	    autoSize: true,
	    closeClick: false,
	    closeBtn: true,
	    openEffect: 'none',
	    wrapCSS: 'fancyShopModal closeAlt shopModalProd',
	    closeEffect: 'none',
	    padding: 0,
	    margin: 10,
	    helpers: { overlay: { locked: false } }
	});

	

	$('.fancyboxModalViewCart').fancybox({
		maxHeight: 560,
		width: '100%',
		height: '100%',
		autoSize: true,
		closeClick: false,
		closeBtn: true,
		openEffect: 'none',
		wrapCSS: 'fancyShopModal closeAlt shopModalCart',
		closeEffect: 'none',
		padding: 15,
		margin: 10,
		helpers: {
			overlay: {
				locked: true
			}
		}
	});

	var fancyboxModalDecidirMaxH = 670;
	if ($('body').width() < 700) {
		fancyboxModalDecidirMaxH = 800;
	}

	$('.fancyboxModalDecidir').fancybox({
		maxWidth: 580,
		maxHeight: fancyboxModalDecidirMaxH,
		width: '100%',
		height: '100%',
		autoSize: false,
		closeClick: false,
		closeBtn: true,
		openEffect: 'none',
		wrapCSS: 'fancyShopModal closeAlt',
		closeEffect: 'none',
		padding: 0,
		margin: 10,
		helpers: {
			overlay: {
				locked: true
			}
		}
	});

	var fancyboxModalNaveMaxH = 670;
	if ($('body').width() < 700) {
	    fancyboxModalNaveMaxH = 800;
	}

	$('.fancyboxModalNave').fancybox({
	    maxWidth: '1000',
	    maxHeight: fancyboxModalNaveMaxH,
	    width: '1000',
	    height: '100%',
	    autoSize: false,
	    closeClick: false,
	    closeBtn: true,
	    openEffect: 'none',
	    wrapCSS: 'fancyShopModal closeAlt',
	    closeEffect: 'none',
	    padding: 0,
	    margin: 10,
	    helpers: {
	        overlay: {
	            locked: true
	        }
	    }
	});

	$('.fancyboxModalNormal').fancybox({
		maxWidth: 580,
		maxHeight: fancyboxModalDecidirMaxH,
		width: '100%',
		height: '100%',
		autoSize: false,
		closeClick: false,
		closeBtn: true,
		openEffect: 'none',
		wrapCSS: 'fancyShopModal closeAlt',
		closeEffect: 'none',
		padding: 0,
		margin: 10,
		helpers: {
			overlay: {
				locked: true
			}
		}
	});

	$('.fancyboxModalPromo').fancybox({
		maxWidth: 580,
		maxHeight: fancyboxModalDecidirMaxH,
		width: '100%',
		autoSize: true,
		closeClick: false,
		closeBtn: true,
		openEffect: 'none',
		wrapCSS: 'fancyShopModal closeAlt',
		closeEffect: 'none',
		padding: 0,
		margin: 10,
		helpers: {
			overlay: {
				locked: true
			}
		}
	});

	/*MODAL ARMALO COMO QUIERAS*/
	$('.fancyboxModalACQ').fancybox({
		autoSize: true,
		closeClick: false,
		closeBtn: true,
		openEffect: 'none',
		wrapCSS: 'closeAlt fancyShopModalACQ',
		closeEffect: 'none',
		padding: 0,
		margin: 0,
		helpers: {
			overlay: {
				locked: true
			}
		}
	});

	/*MODAL Postres*/
	$('.fancyboxModalPostres').fancybox({
		autoSize: true,
		closeClick: false,
		closeBtn: true,
		openEffect: 'none',
		wrapCSS: 'closeAlt fancyShopModalPostres',
		closeEffect: 'none',
		padding: 0,
		margin: 0,
		keys: {
			close: null
		},
		helpers: {
			overlay: {
				locked: true,
				closeClick: false
			}
		}
	});

	/*MODAL Sugeridos*/
	$('.fancyboxModalSugeridos').fancybox({
		autoSize: false,
		closeClick: false,
		height: 520,
		closeBtn: true,
		openEffect: 'none',
		wrapCSS: 'closeAlt fancyShopModalPostres',
		closeEffect: 'none',
		padding: 0,
		margin: 0,
		keys: {
			close: null
		},
		helpers: {
			overlay: {
				locked: true
			}
		}
	});
	
	$('.fancyboxModalGenerico').fancybox({
		width: 750,
		height: '100%',
		maxHeight: '80%',
		maxWidth: '90%',
		autoSize: true,
		closeClick: false,
		closeBtn: true,
		openEffect: 'none',
		wrapCSS: 'fancyShopModal closeAlt2',
		closeEffect: 'none',
		padding: 0,
		margin: 10,
		helpers: {
			overlay: {
				locked: true
			}
		}
	});

	$('.fancyboxModalNormalWpp').fancybox({
		maxWidth: 580,
		maxHeight: fancyboxModalDecidirMaxH,
		width: '100%',
		height: '100%',
		autoSize: false,
		closeClick: false,
		closeBtn: true,
		openEffect: 'none',
		wrapCSS: 'fancyShopModalPostres closeAlt',
		closeEffect: 'none',
		padding: 0,
		margin: 10,
		keys: {
			close: null
		},
		helpers: {
			overlay: {
				locked: true,
				closeClick: false
			}
		}
	});

}

function dynamicShopInputRequieres() {
	//PARA LOS CAMPOS VISIBLES CON .JSReq agrega los required si no los saca
	$('.JSReq:visible').prop('required', true);
	$('.JSReq:not(:visible)').prop('required', false);
}

function closeAllModalProd() {
	setTimeout(function() {
		$('.shopModalProd .fancybox-close').click();
	}, 1);
}

function closeAllModalCart() {
	setTimeout(function() {
		$('.shopModalCart .fancybox-close').click();
	}, 1);
}

function closeAllshopsModales() {
	setTimeout(function() {
		$('.fancyShopModal .fancybox-close').click();
	}, 1);
}

function closeAllModalAcq() {
	setTimeout(function() {
		$('.fancyShopModalACQ .fancybox-close').click();
	}, 1);
}

function closeAllModalPostres() {
	setTimeout(function() {
		$('.fancyShopModalPostres .fancybox-close').click();
	}, 1);
}

function shop_imgLiquids() {
	$('.imgLiquidNoFillShop').livequery(function() {
		$(this).imgLiquid({
			fill: false
		});
	});
}

function shop_normalizeCols() {
	setTimeout(function() {
		Knormalize($('.normCols'));
	}, 1);
}

function dropdowntogglewOver() {
	if ($('body').width() > 768) {
		$('.dropdown-toggle.wOver').on('mouseenter', function() {
			$('.btn-group').removeClass('open');
			$(this)
				.parent()
				.addClass('open');
		});
		$('.dropdownClose').on('mouseenter', function() {
			$('.dropdown.open').removeClass('open');
		});
		$('.dropdown-menu.dropdown-menuTop').on('mouseleave', function() {
			$(this)
				.closest('.dropdown.open')
				.removeClass('open');
		});
	} else {
	}
}

function animScrollToHref(href) {
	var offset = 80 + 40;

	if ($('.conBannerPromoMob').length){
		if ($('body').width() < 700) {
			offset += 44;
		}
	}

	var time = 600;

	if (!href || !$(href).length) {
		return true;
	}

	var $top = $(href).offset().top;

	$('html, body').animate(
		{
			scrollTop: $top - offset
		},
		time
	);

	return false;
}

function scrllAnim() {
	$('a.anchorLink').click(function() {
		var href = $(this).attr('href');
		return animScrollToHref(href);
	});

	$('a.anchorLinkSub').click(function() {
		var offset = 90;
		var time = 600;
		$('html, body').animate(
			{
				scrollTop: $($(this).attr('href')).offset().top - offset
			},
			time
		);
		return false;
	});
}

function JSgoMenu() {
	var offset = 40;
	var time = 100;
	$('.JSgoMenu').on('change', function(el) {
		var value = $('.JSgoMenu').val();
		var el = $(value);
		if (!el.length) {
			console.log(value, el, el.length);
			return;
		}
		$('html, body').animate(
			{
				scrollTop: el.offset().top - offset
			},
			time
		);
	});
}

//CONTROLADOR DE GRUPOS DE BOTONES
function changeBtnGroup($el) {
	var el = null;
	if ($el.type) {
		el = $($el.target);
	}
	if ($el.jquery) {
		el = $el;
	}
	if (!el) return;
	el
		.closest('.JSgroup')
		.find('.btn')
		.removeClass('btnActive')
		.addClass('noActive');
	el.addClass('btnActive').removeClass('noActive');
	changeBtnGroupOnChangeCases_init(el);
	//Para el default
	// console.log(el);
	// console.log("turno default");
}
function JSgroupButtons() {
	$('.JSgroup .btn').on('click', changeBtnGroup);
}

//___________________________________________________________
/*shop_init.php*/
//___________________________________________________________

//Start shop_init.php
function shopfunc_start_init($day) {
	$(function() {
		var today;

		if ($day) {
			today = moment(new Date($day));
		} else {
			today = moment(new Date());
		}

		setPedidoDateInit(today.clone());
		setTimeout(function() {
			//Setea los valores default
			// changeBtnGroup($('#tipoDelivery'));
			// changeBtnGroup($('#turnoNoche'));
			//Fuerza hoy
			changePedidoDate(today.clone());
		}, 1);
	});
}

function showShifts(){
	$('#turnoMediodia').removeClass('btnDisabled');
	$('#turnoNoche').removeClass('btnDisabled');
}

//CAMBIA LA FECHA DE FECHA DE PEDIDO /*INIT*/
function changePedidoDate(date, dateEnd, label) {
	if (!date) return;

	//FFECHA A IMPRIMIR
	var $dateText = date.format('dddd D/M/YYYY');

	//PRENDE TEMPORARIAMENTE EL MEDIODIA
	$('#turnoMediodia').removeClass('btnDisabled');
	$('#turnoNoche').removeClass('btnDisabled');

	//SI LA FECHA ES HOY
	if (moment(date).isSame(new Date(), 'day')) {
		//CAMBIA LA FFECHA A IMPRIMIR
		$dateText = 'Hoy ' + date.format('D/M/YYYY');

		//SI LA HORA ES PASADA LAS 15Hs, DESHABILITA EL TURNO MEDIODIA
		console.log(moment(date).hours(),21111111);



		console.log(date,dateEnd,label);
		if (moment(date).hours() > 15) {
			$('#turnoMediodia').addClass('btnDisabled');
			changeBtnGroup($('#turnoNoche'));
			console.log('ASIGNO DEFAULT HORA');
			// $('#turnoNoche').trigger('click');
		}
	}

	if (date.format('D/M/YYYY') == "24/12/2025" || date.format('D/M/YYYY') == "31/12/2025" ){
		showShifts();
		$('#turnoNoche').addClass('btnDisabled');
		changeBtnGroup($('#turnoMediodia'));
		// $('#turnoNoche').text('12 a 16 hs.');
	}

	if (date.format('D/M/YYYY') == "25/12/2025" || date.format('D/M/YYYY') == "1/1/2026" ){
		showShifts();
		$('#turnoMediodia').addClass('btnDisabled');
		changeBtnGroup($('#turnoNoche'));
		// $('#turnoNoche').text('12 a 16 hs.');
	}

	//IMPRIME LA FECHA
	$('#dateInit ._jstext').text($dateText);
}

//CRONTROLADOR DE FECHA DE PEDIDO /*INIT*/
function setPedidoDateInit(day) {
	if (!day) return;
	if (!$('#dateInit').length) return;

	//FECHA DESDE
	var minDate = day.clone();

	//FECHA HASTA - HOY MAS 90 días
	var maxDate = moment(new Date()).add(30, 'days');

	

	//http://www.daterangepicker.com/#options
	$('#dateInit').daterangepicker(
		{
			singleDatePicker: true,
			autoApply: true,
			showCustomRangeLabel: false,
			showDropdowns: false,
			locale: {
				firstDay: 0
			},
			startDate: day.clone(),
			minDate: minDate,
			//HASTA: DIAS HABILES DESDE HOY
			maxDate: maxDate,
			opens: 'center'
		},
		function(start, end, label) {
			changePedidoDate(start, end, label);
			var fechaElegida = start.format('D/M/YYYY');
			if (fechaElegida == "24/12/2019" || fechaElegida == "31/12/2019") {
				$('#turnoMediodia').addClass('btnDisabled');
				$('#turnoNoche').text('12 a 16 hs.');
			}else{
				$('#turnoNoche').text('Noche');
			}
		}
	);
}

//CONTROLADOR DE GRUPOS DE BOTONES CASOS /*INIT*/
function changeBtnGroupOnChangeCases_init($ActiveEl) {
	var idEl = $ActiveEl.attr('id');

	if (idEl == 'tipoDelivery') {
	} else if (idEl == 'tipoTakeAway') {
		//
	} else if (idEl == 'turnoMediodia') {
		//
	} else if (idEl == 'turnoNoche') {
	}
	if (false) console.log(idEl);
}

//BOTON DE SUBMIT EN shop_init.php
function shopfunc_submit_init() {
	//VALIDACIONES
	if (!$('#tipoTakeAway.btnActive, #tipoDelivery.btnActive').length) {
		//NO HAY MODALIDAD DE PAGO ELEGIDA
		swal({
			text: 'Por favor, elegí la modalidad de tu pedido.',
			type: 'warning',
			confirmButtonText: 'ok'
		});
		return;
	}
	if (!$('#turnoMediodia.btnActive, #turnoNoche.btnActive').length) {
		//NO HAY HORARIO
		swal({
			text: 'Por favor, elegí el horario del pedido.',
			type: 'warning',
			confirmButtonText: 'ok'
		});
		return;
	}

	// > VALIDO OK, SIGUE

	//OBTIENE DIA DEL PEDIDO
	var diaDePedido = new Date(moment($('#dateInit').data('daterangepicker').startDate));
	// console.log('DIA DE PEDIDO '+diaDePedido);

	//OBTIENE MODALIDAD DE PAGO
	var modaliadDePago = null;
	if ($('#tipoTakeAway.btnActive').length) {
		modaliadDePago = 'takeaway';
	}
	if ($('#tipoDelivery.btnActive').length) {
		modaliadDePago = 'delivery';
	}

	//OBTIENE HORARIO
	var horarioDePedido = null;
	if ($('#turnoMediodia.btnActive').length) {
		horarioDePedido = 'mediodia';
	}
	if ($('#turnoNoche.btnActive').length) {
		horarioDePedido = 'noche';
	}

	//SUMBIT > LLAMA A LA FUNCION DE AYRTON
	submit_init_shop(modaliadDePago, horarioDePedido, diaDePedido);
	// ejecutarDecidir();
}

//___________________________________________________________
/*shop_new_dir.php*/
//___________________________________________________________

function shop_new_dir_init() {
	$(function() {
		/*CUANDO CAMBIA EL TIPO DE DOMICILIO*/
		$('#tipoDeDomicilio').change(change_tipo_de_domocilio);

		/*CUANDO CAMBIA LA PROVINCIA*/
		$('#provinciaDir').change(change_provincia_new_dir);

		/*FUERZA EL CAMBIO PARA ACTIVAR VALIDACIONES*/
		$('#tipoDeDomicilio').trigger('change');

		if ($('#provinciaDir').val() !== 'null') {
			change_provincia_new_dir();
		}
	});
}

function change_provincia_new_dir() {
	/*RESETEA LA LOCALIDAD*/
	$('#localidadDir').prop('readonly', false);
	if ($('#localidadDir').val() == 'Ciudad Autónoma de Buenos Aires' || $('#localidadDir').val() == 'CABA') {
		$('#localidadDir').val('');
	}

	var that = this;
	if (that === window) {
		that = $('#provinciaDir')[0];
	}

	if (!that) {
		return;
	}

	if (!that.value || that.value === 'null') {
		return;
	} else if (that.value === 'CABA') {
		/*SI ES CABA FUERZA LA LOCALIDAD*/
		$('#localidadDir').val('Ciudad Autónoma de Buenos Aires');
		$('#localidadDir').prop('readonly', true);
	}
}

function change_tipo_de_domocilio() {
	/*RESETEAL LOS INVALIDOS*/
	$('#formDir').removeClass('showValids');

	/*PRENDE O APAGA GENERICOS*/
	if (!this.value || this.value === 'null') {
		$('.JSIfHaveType').hide();
		return;
	} else if (this.value === 'barrio_cerrado' || this.value === 'casa' || this.value === 'departamento') {
		/*SI YA ELIGIO UNO SACA EL NULL*/
		$('#tipo_option_null').remove();
		//PRENDE GENERICOS
		$('.JSIfHaveType').show();
	}

	//PRENDE O APAGA CAMPOS ESPECIFICOS DE BARRIO CERRADO
	if (this.value === 'barrio_cerrado') {
		$('.JSonlyBarrioCerrado').show();

		//RESETEA PROVINCIA SI ERA CABA
		if ($('#provinciaDir').val() == 'CABA') {
			$('#provinciaDir')
				.val('null')
				.trigger('change');
		}

		$(".groupProvincia").css('display', 'none');
		$(".groupLocalidad").css('display', 'none');
	} else {
		$('.JSonlyBarrioCerrado').hide();
	}

	//PRENDE O APAGA CAMPOS ESPECIFICOS DE DTO
	if (this.value === 'departamento') {
		$('.JSonlyDto').show();
	} else {
		$('.JSonlyDto').hide();
	}

	//PARA LOS CAMPOS VISIBLES CON .JSReq agrega los required si no los saca
	dynamicShopInputRequieres();
}

function shopfunc_submit_newdir() {
	//INIT

	console.log('Try sumbit newDir form');

	var miForm = $('#formDir')[0];
	if (!miForm) {
		console.error('form not found');
		return;
	}

	/*SACA LOS INVALIDOS ANTERIORES*/
	$(miForm).removeClass('showValids');

	//CHECK VALIDITY
	var validate = miForm.checkValidity();

	if (!validate) {
		//NO VALIDA
		if (miForm.reportValidity) {
			miForm.reportValidity();
			/*MUESTRA LOS CAMPOS INVALIDOS*/
			$(miForm).addClass('showValids');
			console.log('Not valid');
		}
	} else {
		/*FORM OK!*/
		// console.log(miForm, 11111111111);
		miForm.submit();
		// asignarSession($('#formDir').serialize(),'DireccionUsuario');
	}
}

/*FUNCIONES CHECKOUT*/
function checkout_aux_form() {
	$(document).ready(function() {
		$('input[type=radio][name=select_pago]').change(checkOut_changeModoPago);
		$('input[type=radio][name=select_time]').change(checkOut_changeFecha);
		checkOut_changeModoPago();
		checkOut_changeFecha();
	});
}
function checkOut_changeModoPago() {
	if ($('input[type=radio][name=medio_pago]:checked').val() == '2') {
		$('.hideOnEfectivo').show();
	} else {
		$('.hideOnEfectivo').hide();
		$('.hideOnEfectivo').attr('disabled', 'disabled');
	}
}
function checkOut_changeFecha() {
	if ($('input[type=radio][name=select_time]:checked').val() == 'ahora') {
		$('.hiddeOnDespues').hide();
	} else {
		$('.hiddeOnDespues').show();
	}
}

/*ACQ*/
function JS_ACQ() {
	var obj = {};
	var init = false;
	var objListId = '#JS_acq_prods';
	var addClass = '.productoShopACQ';
	var objElInfo = '#JS_acq_info';

	var options = { max: 45 };
	var max = 45;
	var celClassPrefix = 'cel45';
	var groupID = 0;

	var model = {
		lastHtmlItems: '',
		prods: []
	};

	function getItemdrawCeldBarco(value, index) {
		if (!init) {
			console.warn('ACQ: no init');
			return;
		}
		if (!value) {
			console.warn('ACQ: invalid celd');
			return;
		}
		var str =
			'<span data-toggle="tooltip" data-html="true" title="Quitar" onclick="{{onClick}}" style="background-image: url({{img}})" class="{{classTypeCeld}} {{classNameCeld}} {{classAnimAdd}}" data-group="{{data_group}}"></span>\n';
		str = str
			.replace('{{img}}', value.image)
			.replace('{{classTypeCeld}}', 'bCeld ' + celClassPrefix)
			.replace('{{classNameCeld}}', celClassPrefix + '_' + (Number(index) + 1))
			.replace('{{classAnimAdd}}', value._isAdd && value._recentAdd ? 'animAdd' : '')
			.replace('{{data_group}}', value.group)
			.replace('{{onClick}}', 'window && js_acq && js_acq.getInit() && js_acq.removeGroupByEl && js_acq.removeGroupByEl(this)');

		return str;
	}

	function postRedraw(obj) {
		if (!init) {
			console.warn('ACQ: no init');
			return;
		}

		if (!model || !model.prods) {
			console.warn('ACQ: no model', model);
			return;
		}

		for (var i = 0; i < model.prods.length; i++) {
			model.prods[i]._recentAdd = false;
			model.prods[i]._deleted = false;
		}
	}

	function redraw(obj) {
		if (!init) {
			console.warn('ACQ: no init');
			return;
		}

		if (!model || !model.prods) {
			console.warn('ACQ: no model', model);
			return;
		}

		//ITEMS
		var resultHtml = '';

		$.each(model.prods, function(index, value) {
			value._isAdd = !!obj.isAdd;
			resultHtml += getItemdrawCeldBarco(value, index);
		});

		model.lastHtmlItems = resultHtml;
		$(objListId).html(resultHtml);

		//INFO
		var infoHTML = String('Agregados {{cant}} ({{cantRest}} restantes)')
			.replace('{{cant}}', model.prods.length)
			.replace('{{cantRest}}', max - model.prods.length);

		if (model.prods.length) {
			infoHTML += String('<span class="vaciarBarq" onclick="{{onClick}}"><i class="fa fa-times-circle" aria-hidden="true"></i>Vaciar</span>').replace(
				'{{onClick}}',
				'window && js_acq && js_acq.getInit() && js_acq.reset && js_acq.reset(this)'
			);
		}

		$(objElInfo).html(infoHTML);

		postRedraw();
	}

	function validModel() {
		if (!init) {
			console.warn('ACQ: no init');
			return false;
		}

		if (!model || !model.prods) {
			console.warn('ACQ: no model', model);
			return false;
		}

		if (model.prods.length == max) return true;
		return false;
	}

	function addProd(obj) {
		if (!init) {
			console.warn('ACQ: no init');
			return;
		}

		if (!obj || !obj.id) {
			console.warn('ACQ: invalid obj');
			return;
		}

		var cant = Number(obj.mincant || 1);

		//LIMIT
		if (model.prods.length + cant > max) return;

		groupID++;

		var _prods = model.prods;

		for (var i = 0; i < _prods.length; i++) {
			_prods[i]._recentAdd = false;
		}

		for (var i = 0; i < cant; i++) {
			obj.id = String(obj.id);
			obj.group = 'group_' + groupID;
			obj._recentAdd = true;
			_prods.push(obj);
		}

		model.prods = _prods.slice(0, max);

		redraw({ isAdd: true });
	}

	function resetModel() {
		if (!init) {
			console.warn('ACQ: no init');
			return;
		}

		model.prods = [];
		redraw({ isAdd: false });
	}

	function touchProd(event) {
		/* Act on the event */
		if (!init) {
			console.warn('ACQ: no init');
			return;
		}

		var _that = this;
		if (!this) return;

		var _data = _that.getAttribute('data-acqprod');
		if (!_data || _data.length < 1) return;

		try {
			_data = JSON.parse(String(_data));
		} catch (e) {
			console.warn('ACQ: invalid data', e);
			return;
		}

		addProd(_data);
	}

	obj.init = function($options) {
		if (init) {
			console.warn('ACQ: already init');
			return;
		}

		options = $.extend({}, options, $options);
		var parsedMax = parseInt(options.max, 10);
		if (!isNaN(parsedMax) && parsedMax > 0) {
			max = parsedMax;
		}
		if (max != 90 && max != 60 && max != 45 && max != 30 && max != 15 && max != 5 && max > 45) {
			max = 45;
		}
		celClassPrefix = 'cel45';

		if (String(max) == String(90)) {
			max = 90;
			celClassPrefix = 'cel90';
		}

		if (String(max) == String(60)) {
			max = 60;
			celClassPrefix = 'cel60';
		}

		if (String(max) == String(45)) {
			max = 45;
			celClassPrefix = 'cel45';
		}

		if (String(max) == String(30)) {
			max = 30;
			celClassPrefix = 'cel30';
		}

		if (String(max) == String(15)) {
			max = 15;
			celClassPrefix = 'cel15';
		}

		if (String(max) == String(5)) {
			max = 5;
			celClassPrefix = 'cel5';
		}

		init = true;

		console.warn('ACQ: init ok:', options, max);

		$(document).ready(function() {
			$(addClass).on('click', touchProd);
		});
	};

	obj.removeGroup = function(group) {
		if (!init) {
			console.warn('ACQ: no init');
			return;
		}
		if (!group) {
			console.warn('ACQ: no group');
			return;
		}

		var _prods = obj.getModel().prods || [];
		var _newProds = [];

		for (var i = 0; i < _prods.length; i++) {
			var prod = _prods[i];
			if (prod && prod.id && prod.group !== group) {
				prod._recentAdd = false;
				_newProds.push(prod);
			}
			if (prod && prod.id && prod.group == group) {
				prod._deleted = true;
			}
		}

		model.prods = _newProds;
		redraw({ isAdd: false });
	};

	obj.reset = function() {
		if (!init) {
			console.warn('ACQ: no init');
			return;
		}
		resetModel();
	};

	obj.isValid = function() {
		if (!init) {
			console.warn('ACQ: no init');
			return false;
		}
		return validModel();
	};

	obj.getModel = function() {
		if (!init) {
			console.warn('ACQ: no init');
			return false;
		}
		return $.extend({}, model);
	};

	obj.getProds = function() {
		if (!init) {
			console.warn('ACQ: no init');
			return null;
		}
		return obj.getModel().prods;
	};

	obj.getProdsIdCants = function() {
		if (!init) {
			console.warn('ACQ: no init');
			return [null];
		}
		var _prods = obj.getModel().prods || [];
		var _prodsArr = [];

		function checkHist(id) {
			var result = false;
			for (var i = 0; i < _prodsArr.length; i++) {
				var item = _prodsArr[i];
				if (item && id && String(item.id) == String(id)) {
					result = i;
				}
			}
			return result;
		}

		for (var i = 0; i < _prods.length; i++) {
			var prod = _prods[i];
			if (prod && prod.id) {
				var id = prod.id;
				var index = checkHist(id);
				if (index !== false && _prodsArr[index]) {
					_prodsArr[index].cant++;
				} else {
					_prodsArr.push({ id: String(id), cant: 1 });
				}
			}
		}

		return _prodsArr;
	};

	obj.getlastHtmlItems = function() {
		if (!init) {
			console.warn('ACQ: no init');
			return null;
		}
		return obj.getModel().lastHtmlItems;
	};

	obj.getInit = function() {
		return init;
	};

	obj.removeGroupByEl = function(el) {
		if (!init) {
			console.warn('ACQ: no init');
			return null;
		}

		if (!el) {
			console.warn('ACQ: no element');
			return null;
		}

		var group = el.getAttribute('data-group');
		if (!group || group.length < 1) return;

		obj.removeGroup(group);
	};

	return obj;
}

/*ATV*/
function JS_ATV() {
	var obj = {};
	var init = false;
	var objListId = '#JS_acq_prods';
	var addClass = '.productoShopACQ';
	var objElInfo = '#JS_acq_info';
	var cantVal = '#cantValAtv';

	var options = { max: 45 };
	var max = 45;
	var celClassPrefix = 'cel45';
	var groupID = 0;

	var model = {
		lastHtmlItems: '',
		prods: []
	};

	function getItemdrawCeldBarco(value, index) {
		if (!init) {
			console.warn('ACQ: no init');
			return;
		}
		if (!value) {
			console.warn('ACQ: invalid celd');
			return;
		}
		var str =
			'<span data-toggle="tooltip" data-html="true" title="Quitar" onclick="{{onClick}}" style="background-image: url({{img}})" class="{{classTypeCeld}} {{classNameCeld}} {{classAnimAdd}}" data-group="{{data_group}}"></span>\n';
		str = str
			.replace('{{img}}', value.image)
			.replace('{{classTypeCeld}}', 'bCeld ' + celClassPrefix)
			.replace('{{classNameCeld}}', celClassPrefix + '_' + (Number(index) + 1))
			.replace('{{classAnimAdd}}', value._isAdd && value._recentAdd ? 'animAdd' : '')
			.replace('{{data_group}}', value.group)
			.replace('{{onClick}}', 'window && js_acq && js_acq.getInit() && js_acq.removeGroupByEl && js_acq.removeGroupByEl(this)');
		return str;
	}

	function postRedraw(obj) {
		if (!init) {
			console.warn('ACQ: no init');
			return;
		}

		if (!model || !model.prods) {
			console.warn('ACQ: no model', model);
			return;
		}

		for (var i = 0; i < model.prods.length; i++) {
			model.prods[i]._recentAdd = false;
			model.prods[i]._deleted = false;
		}
	}

	function redraw(obj) {
		if (!init) {
			console.warn('ACQ: no init');
			return;
		}

		if (!model || !model.prods) {
			console.warn('ACQ: no model', model);
			return;
		}

		//ITEMS
		var resultHtml = '';

		$.each(model.prods, function(index, value) {
			value._isAdd = !!obj.isAdd;
			resultHtml += getItemdrawCeldBarco(value, index);
		});

		model.lastHtmlItems = resultHtml;
		$(objListId).html(resultHtml);

		//INFO
		var infoHTML = String('Agregados {{cant}} ({{cantRest}} restantes)')
			.replace('{{cant}}', model.prods.length)
			.replace('{{cantRest}}', max - model.prods.length);

		$(cantVal).val(model.prods.length);

		if (model.prods.length) {
			infoHTML += String('<span class="vaciarBarq" onclick="{{onClick}}"><i class="fa fa-times-circle" aria-hidden="true"></i>Vaciar</span>').replace(
				'{{onClick}}',
				'window && js_acq && js_acq.getInit() && js_acq.reset && js_acq.reset(this)'
			);
		}

		if ($(addClass).children('JS_acq_prod').hasClass('imgTipo')) {
			$('.imgTipo').hide();
			
		}

		$(objElInfo).html(infoHTML);

		postRedraw();
	}

	function validModel() {
		if (!init) {
			console.warn('ACQ: no init');
			return false;
		}

		if (!model || !model.prods) {
			console.warn('ACQ: no model', model);
			return false;
		}

		if (model.prods.length == max) return true;
		return false;
	}

	function addProd(obj) {
		if (!init) {
			console.warn('ACQ: no init');
			return;
		}

		if (!obj || !obj.id) {
			console.warn('ACQ: invalid obj');
			return;
		}

		var cant = Number(obj.mincant || 1);

		//LIMIT
		if (model.prods.length + cant > max) return;

		groupID++;

		var _prods = model.prods;

		for (var i = 0; i < _prods.length; i++) {
			_prods[i]._recentAdd = false;
		}

		for (var i = 0; i < cant; i++) {
			obj.id = String(obj.id);
			obj.group = 'group_' + groupID;
			obj._recentAdd = true;
			_prods.push(obj);
		}

		model.prods = _prods.slice(0, max);

		redraw({ isAdd: true });
	}

	function resetModel() {
		if (!init) {
			console.warn('ACQ: no init');
			return;
		}

		model.prods = [];
		redraw({ isAdd: false });
	}

	function touchProd(event) {
		/* Act on the event */
		if (!init) {
			console.warn('ACQ: no init');
			return;
		}

		var _that = this;
		if (!this) return;

		var _data = _that.getAttribute('data-acqprod');
		if (!_data || _data.length < 1) return;

		try {
			_data = JSON.parse(String(_data));
		} catch (e) {
			console.warn('ACQ: invalid data', e);
			return;
		}

		addProd(_data);
	}

	obj.init = function($options) {
		if (init) {
			console.warn('ACQ: already init');
			return;
		}

		options = $.extend({}, options, $options);
		var parsedMax = parseInt(options.max, 10);
		if (!isNaN(parsedMax) && parsedMax > 0) {
			max = parsedMax;
		}
		if (max != 90 && max != 60 && max != 45 && max != 30 && max != 15 && max != 5 && max > 45) {
			max = 45;
		}
		celClassPrefix = 'cel45';

		if (String(max) == String(90)) {
			max = 90;
			celClassPrefix = 'cel90';
		}

		if (String(max) == String(60)) {
			max = 60;
			celClassPrefix = 'cel60';
		}

		if (String(max) == String(45)) {
			max = 45;
			celClassPrefix = 'cel45';
		}

		if (String(max) == String(30)) {
			max = 30;
			celClassPrefix = 'cel30';
		}

		if (String(max) == String(15)) {
			max = 15;
			celClassPrefix = 'cel15';
		}

		if (String(max) == String(5)) {
			max = 5;
			celClassPrefix = 'cel5';
		}

		init = true;

		console.warn('ACQ: init ok:', options, max);

		$(document).ready(function() {
			$(addClass).on('click', touchProd);
		});
	};

	obj.removeGroup = function(group) {
		if (!init) {
			console.warn('ACQ: no init');
			return;
		}
		if (!group) {
			console.warn('ACQ: no group');
			return;
		}

		var _prods = obj.getModel().prods || [];
		var _newProds = [];

		for (var i = 0; i < _prods.length; i++) {
			var prod = _prods[i];
			if (prod && prod.id && prod.group !== group) {
				prod._recentAdd = false;
				_newProds.push(prod);
			}
			if (prod && prod.id && prod.group == group) {
				prod._deleted = true;
			}
		}

		model.prods = _newProds;
		redraw({ isAdd: false });
	};

	obj.reset = function() {
		if (!init) {
			console.warn('ACQ: no init');
			return;
		}
		resetModel();
	};

	obj.isValid = function() {
		if (!init) {
			console.warn('ACQ: no init');
			return false;
		}
		return validModel();
	};

	obj.getModel = function() {
		if (!init) {
			console.warn('ACQ: no init');
			return false;
		}
		return $.extend({}, model);
	};

	obj.getProds = function() {
		if (!init) {
			console.warn('ACQ: no init');
			return null;
		}
		return obj.getModel().prods;
	};

	obj.getProdsIdCants = function() {
		if (!init) {
			console.warn('ACQ: no init');
			return [null];
		}
		var _prods = obj.getModel().prods || [];
		var _prodsArr = [];

		function checkHist(id) {
			var result = false;
			for (var i = 0; i < _prodsArr.length; i++) {
				var item = _prodsArr[i];
				if (item && id && String(item.id) == String(id)) {
					result = i;
				}
			}
			return result;
		}

		for (var i = 0; i < _prods.length; i++) {
			var prod = _prods[i];
			if (prod && prod.id) {
				var id = prod.id;
				var index = checkHist(id);
				if (index !== false && _prodsArr[index]) {
					_prodsArr[index].cant++;
				} else {
					_prodsArr.push({ id: String(id), cant: 1 });
				}
			}
		}

		return _prodsArr;
	};

	obj.getlastHtmlItems = function() {
		if (!init) {
			console.warn('ACQ: no init');
			return null;
		}
		return obj.getModel().lastHtmlItems;
	};

	obj.getInit = function() {
		return init;
	};

	obj.removeGroupByEl = function(el) {
		if (!init) {
			console.warn('ACQ: no init');
			return null;
		}

		if (!el) {
			console.warn('ACQ: no element');
			return null;
		}

		var group = el.getAttribute('data-group');
		if (!group || group.length < 1) return;

		obj.removeGroup(group);
	};

	return obj;
}

//___________________________________________________________
/*SEARCH*/
//___________________________________________________________

var PS_busquedaJSBox = '#busquedaJSBox';
var PS_titleSubSelector = '.title-shop1';
var PS_descSubSelector = '.descrip';
var PS_itemProdSelector = '.productoShop';
var PS_markedSearchItemClass = '__prdSearchItem';
var PS_anchorBusqueda = '#busquedaAnchor';
var PS_boxResult = '#busquedaJSBoxResults';
var PS_timeFadeIn = 200;
var PS_maxItems = 30;
var PS_searchBox = '.infoBox.searchBox';
var PS_notFoundClass = 'PS_notFoundClass';
var PS_htmlNotFund = '<p class="{{class}}">No se han encontrado resultados para tu búsqueda: <b>{{busq}}</b></p>';
var PS_wSearchLenght = '.containerShop.withSearch';

function PS_initSearch() {
	if ($(PS_wSearchLenght).length < 1) {
		$(PS_searchBox).remove();
		$(PS_busquedaJSBox).remove();
		console.info('No search:', PS_wSearchLenght);
		return;
	}

	if ($(PS_busquedaJSBox).length < 1) {
		console.info('No search:', PS_busquedaJSBox);
		return;
	}

	$(window).load(function() {
		PS_hideBusquedaReults();
	});
}

function PS_goToTop() {
	animScrollToHref('#anchorENTRADAS');
}

function PS_showBusquedaReults() {
	$(PS_busquedaJSBox).show();
}

function PS_hideBusquedaReults() {
	PS_cleanElementsInSearch();
	$(PS_busquedaJSBox).hide();
}

function PS_closeAndhideBusquedaReults() {
	if ($(PS_busquedaJSBox).length < 1) {
		return;
	}

	if ($(PS_boxResult).html().length) {
		PS_goToTop();
	}

	PS_hideBusquedaReults();
}

function PS_showAndGoBusquedaReults() {
	if ($(PS_busquedaJSBox).length < 1) {
		return;
	}
	PS_showBusquedaReults();
	animScrollToHref(PS_anchorBusqueda);
}

function PS_compareMatchText(searchTxt, objText) {
	if (!searchTxt || !objText || !searchTxt.length || !objText.length) return false;

	var $searchTxt = removeDiacritics(searchTxt.toLowerCase());
	var $objText = removeDiacritics(objText.toLowerCase());

	/*REMOVE S*/
	if ($searchTxt.length > 4 && $searchTxt.slice(-1) === 's') {
		$searchTxt = $searchTxt.slice(0, -1);
	}

	if ($objText.length > 1 && $objText.indexOf($searchTxt) !== -1) {
		return true;
	}

	return false;
}

function PS_getProdElementsByTxt(txt) {
	var result = [];

	if ($(PS_busquedaJSBox).length < 1) {
		return result;
	}

	$(PS_itemProdSelector).each(function(index, el) {
		if ($(el).length && $(el).find(PS_titleSubSelector)) {
			var title =
				$(el)
					.find(PS_titleSubSelector)
					.text() || '';

			/*DESC*/
			var descLarge = [];
			var desc = '';

			if (PS_descSubSelector && PS_descSubSelector.length && $(el).find(PS_descSubSelector)) {
				desc =
					$(el)
						.find(PS_descSubSelector)
						.text() || '';

				if (desc && desc.length > 1 && txt.length > 3) {
					desc = desc
						.replace(/(\r\n|\n|\r)/gm, ' ')
						.replace(/\./g, ' ')
						.replace(/\t/g, ' ')
						.replace(/ +(?= )/g, '')
						.split(' ');

					$.each(desc, function(i, value) {
						if (value && value.length > 4) {
							descLarge.push(value);
						}
					});

					if (descLarge && descLarge.length > 0) {
						title += ' ' + descLarge.join(' ');
					}
				}
			}

			var matchea = PS_compareMatchText(txt, title);

			if (matchea) {
				var $el = $(el).clone();
				if (!$el.hasClass(PS_markedSearchItemClass)) {
					$el.addClass(PS_markedSearchItemClass);
					result.push($el);
				}
			}
		}
	});

	return result;
}

function PS_cleanElementsInSearch() {
	$(PS_boxResult)
		.html('')
		.hide();
}

function PS_putProdElementsInSearch(arrSearh, txtSearch) {
	if ($(PS_busquedaJSBox).length < 1) {
		return;
	}

	var newHTML = [];

	$.each(arrSearh, function(index, value) {
		if (value && value[0] && value[0].outerHTML) {
			newHTML.push(value[0].outerHTML);
		}
	});

	newHTML = newHTML.splice(0, PS_maxItems).join('');

	if ($(PS_boxResult).html() == newHTML) return;

	PS_cleanElementsInSearch();
	$(PS_boxResult)
		.html(newHTML)
		.show()
		.fadeOut(0)
		.fadeIn(PS_timeFadeIn);
}

function PS_putNotFound(arrSearh, txtSearch) {
	if ($(PS_busquedaJSBox).length < 1) {
		return;
	}

	var newHTML = PS_htmlNotFund + '';

	newHTML = newHTML.replace('{{busq}}', txtSearch);
	newHTML = newHTML.replace('{{class}}', PS_notFoundClass);

	$(PS_boxResult)
		.html(newHTML)
		.show()
		.fadeOut(0)
		.fadeIn(PS_timeFadeIn);
}

function PS_prdSearch(txt) {
	console.info('SEARCH:', txt);

	if ($(PS_busquedaJSBox).length < 1) {
		console.info('SEARCH:', 'no ', PS_busquedaJSBox);
		return;
	}

	if (!txt || txt.length < 1) {
		console.info('SEARCH:', 'no search');
		PS_closeAndhideBusquedaReults();
		return;
	}

	var arrSearh = PS_getProdElementsByTxt(txt);
	console.info('SEARCH FOUND:', arrSearh.length);

	if (arrSearh.length) {
		PS_putProdElementsInSearch(arrSearh, txt);
	} else {
		PS_putNotFound(arrSearh, txt);
	}

	PS_showAndGoBusquedaReults();
}

//___________________________________________________________
/*removeDiacritics*/
//___________________________________________________________
var replacementListDIAC = [
	{
		base: ' ',
		chars: '\u00A0'
	},
	{
		base: '0',
		chars: '\u07C0'
	},
	{
		base: 'A',
		chars:
			'\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F'
	},
	{
		base: 'AA',
		chars: '\uA732'
	},
	{
		base: 'AE',
		chars: '\u00C6\u01FC\u01E2'
	},
	{
		base: 'AO',
		chars: '\uA734'
	},
	{
		base: 'AU',
		chars: '\uA736'
	},
	{
		base: 'AV',
		chars: '\uA738\uA73A'
	},
	{
		base: 'AY',
		chars: '\uA73C'
	},
	{
		base: 'B',
		chars: '\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0181'
	},
	{
		base: 'C',
		chars: '\u24b8\uff23\uA73E\u1E08\u0106\u0043\u0108\u010A\u010C\u00C7\u0187\u023B'
	},
	{
		base: 'D',
		chars: '\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018A\u0189\u1D05\uA779'
	},
	{
		base: 'Dh',
		chars: '\u00D0'
	},
	{
		base: 'DZ',
		chars: '\u01F1\u01C4'
	},
	{
		base: 'Dz',
		chars: '\u01F2\u01C5'
	},
	{
		base: 'E',
		chars:
			'\u025B\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E\u1D07'
	},
	{
		base: 'F',
		chars: '\uA77C\u24BB\uFF26\u1E1E\u0191\uA77B'
	},
	{
		base: 'G',
		chars: '\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E\u0262'
	},
	{
		base: 'H',
		chars: '\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D'
	},
	{
		base: 'I',
		chars: '\u24BE\uFF29\xCC\xCD\xCE\u0128\u012A\u012C\u0130\xCF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197'
	},
	{
		base: 'J',
		chars: '\u24BF\uFF2A\u0134\u0248\u0237'
	},
	{
		base: 'K',
		chars: '\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2'
	},
	{
		base: 'L',
		chars: '\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780'
	},
	{
		base: 'LJ',
		chars: '\u01C7'
	},
	{
		base: 'Lj',
		chars: '\u01C8'
	},
	{
		base: 'M',
		chars: '\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C\u03FB'
	},
	{
		base: 'N',
		chars: '\uA7A4\u0220\u24C3\uFF2E\u01F8\u0143\xD1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u019D\uA790\u1D0E'
	},
	{
		base: 'NJ',
		chars: '\u01CA'
	},
	{
		base: 'Nj',
		chars: '\u01CB'
	},
	{
		base: 'O',
		chars:
			'\u24C4\uFF2F\xD2\xD3\xD4\u1ED2\u1ED0\u1ED6\u1ED4\xD5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\xD6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\xD8\u01FE\u0186\u019F\uA74A\uA74C'
	},
	{
		base: 'OE',
		chars: '\u0152'
	},
	{
		base: 'OI',
		chars: '\u01A2'
	},
	{
		base: 'OO',
		chars: '\uA74E'
	},
	{
		base: 'OU',
		chars: '\u0222'
	},
	{
		base: 'P',
		chars: '\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754'
	},
	{
		base: 'Q',
		chars: '\u24C6\uFF31\uA756\uA758\u024A'
	},
	{
		base: 'R',
		chars: '\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782'
	},
	{
		base: 'S',
		chars: '\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784'
	},
	{
		base: 'T',
		chars: '\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786'
	},
	{
		base: 'Th',
		chars: '\u00DE'
	},
	{
		base: 'TZ',
		chars: '\uA728'
	},
	{
		base: 'U',
		chars:
			'\u24CA\uFF35\xD9\xDA\xDB\u0168\u1E78\u016A\u1E7A\u016C\xDC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244'
	},
	{
		base: 'V',
		chars: '\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245'
	},
	{
		base: 'VY',
		chars: '\uA760'
	},
	{
		base: 'W',
		chars: '\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72'
	},
	{
		base: 'X',
		chars: '\u24CD\uFF38\u1E8A\u1E8C'
	},
	{
		base: 'Y',
		chars: '\u24CE\uFF39\u1EF2\xDD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE'
	},
	{
		base: 'Z',
		chars: '\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762'
	},
	{
		base: 'a',
		chars:
			'\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250\u0251'
	},
	{
		base: 'aa',
		chars: '\uA733'
	},
	{
		base: 'ae',
		chars: '\u00E6\u01FD\u01E3'
	},
	{
		base: 'ao',
		chars: '\uA735'
	},
	{
		base: 'au',
		chars: '\uA737'
	},
	{
		base: 'av',
		chars: '\uA739\uA73B'
	},
	{
		base: 'ay',
		chars: '\uA73D'
	},
	{
		base: 'b',
		chars: '\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253\u0182'
	},
	{
		base: 'c',
		chars: '\uFF43\u24D2\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184'
	},
	{
		base: 'd',
		chars: '\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\u018B\u13E7\u0501\uA7AA'
	},
	{
		base: 'dh',
		chars: '\u00F0'
	},
	{
		base: 'dz',
		chars: '\u01F3\u01C6'
	},
	{
		base: 'e',
		chars:
			'\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u01DD'
	},
	{
		base: 'f',
		chars: '\u24D5\uFF46\u1E1F\u0192'
	},
	{
		base: 'ff',
		chars: '\uFB00'
	},
	{
		base: 'fi',
		chars: '\uFB01'
	},
	{
		base: 'fl',
		chars: '\uFB02'
	},
	{
		base: 'ffi',
		chars: '\uFB03'
	},
	{
		base: 'ffl',
		chars: '\uFB04'
	},
	{
		base: 'g',
		chars: '\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\uA77F\u1D79'
	},
	{
		base: 'h',
		chars: '\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265'
	},
	{
		base: 'hv',
		chars: '\u0195'
	},
	{
		base: 'i',
		chars: '\u24D8\uFF49\xEC\xED\xEE\u0129\u012B\u012D\xEF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131'
	},
	{
		base: 'j',
		chars: '\u24D9\uFF4A\u0135\u01F0\u0249'
	},
	{
		base: 'k',
		chars: '\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3'
	},
	{
		base: 'l',
		chars: '\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747\u026D'
	},
	{
		base: 'lj',
		chars: '\u01C9'
	},
	{
		base: 'm',
		chars: '\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F'
	},
	{
		base: 'n',
		chars: '\u24DD\uFF4E\u01F9\u0144\xF1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5\u043B\u0509'
	},
	{
		base: 'nj',
		chars: '\u01CC'
	},
	{
		base: 'o',
		chars:
			'\u24DE\uFF4F\xF2\xF3\xF4\u1ED3\u1ED1\u1ED7\u1ED5\xF5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\xF6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\xF8\u01FF\uA74B\uA74D\u0275\u0254\u1D11'
	},
	{
		base: 'oe',
		chars: '\u0153'
	},
	{
		base: 'oi',
		chars: '\u01A3'
	},
	{
		base: 'oo',
		chars: '\uA74F'
	},
	{
		base: 'ou',
		chars: '\u0223'
	},
	{
		base: 'p',
		chars: '\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755\u03C1'
	},
	{
		base: 'q',
		chars: '\u24E0\uFF51\u024B\uA757\uA759'
	},
	{
		base: 'r',
		chars: '\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783'
	},
	{
		base: 's',
		chars: '\u24E2\uFF53\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B\u0282'
	},
	{
		base: 'ss',
		chars: '\xDF'
	},
	{
		base: 't',
		chars: '\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787'
	},
	{
		base: 'th',
		chars: '\u00FE'
	},
	{
		base: 'tz',
		chars: '\uA729'
	},
	{
		base: 'u',
		chars:
			'\u24E4\uFF55\xF9\xFA\xFB\u0169\u1E79\u016B\u1E7B\u016D\xFC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289'
	},
	{
		base: 'v',
		chars: '\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C'
	},
	{
		base: 'vy',
		chars: '\uA761'
	},
	{
		base: 'w',
		chars: '\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73'
	},
	{
		base: 'x',
		chars: '\u24E7\uFF58\u1E8B\u1E8D'
	},
	{
		base: 'y',
		chars: '\u24E8\uFF59\u1EF3\xFD\u0177\u1EF9\u0233\u1E8F\xFF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF'
	},
	{
		base: 'z',
		chars: '\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763'
	}
];

var diacriticsMapDIAC = {};
for (var i = 0; i < replacementListDIAC.length; i += 1) {
	var chars = replacementListDIAC[i].chars;
	for (var j = 0; j < chars.length; j += 1) {
		diacriticsMapDIAC[chars[j]] = replacementListDIAC[i].base;
	}
}

function removeDiacritics(str) {
	return str.replace(/[^\u0000-\u007e]/g, function(c) {
		return diacriticsMapDIAC[c] || c;
	});
}
