function shop_krc_geoCode(direccion, $callback) {
	geocodeKrcAux = function(options) {
		this.geocoder = new google.maps.Geocoder();
		var callback = options.callback;

		if (options.address.hasOwnProperty('lat') && options.address.hasOwnProperty('lng')) {
			options.latLng = new google.maps.LatLng(options.address.lat, options.address.lng);
			delete options.address;
		}

		delete options.lat;
		delete options.lng;
		delete options.callback;
		options.language = 'es';

		this.geocoder.geocode(options, function(results, status) {
			callback(results, status);
		});
	};

	geocodeKrcAux({
		address: direccion,
		callback: function(results, status) {
			if (status == 'OK') {
				$callback(results);
			} else {
				$callback(null);
			}
		}
	});
}

var shop_krcmaps = [];

function shop_init_mapear(dir, opciones, title, id) {
	$(document).ready(function() {
		new shop_krc_mapear(
			id || 'mapaCliente',
			opciones || {
				zoom: 14,
				draggable: false,
				scrollwheel: false,
				disableDefaultUI: true
			},
			dir,
			title || { title: 'mi domicilio' }
		);
	});
}

function shop_krc_mapear(id, mapObj, dir, obj) {
	if (!dir) {
		console.log('SIN DIRECCION');
		return;
		that.finshLoad();
	}

	mapObj = mapObj || { zoom: 15 };

	var id = id;
	var that = this;
	var lastCenter = null;

	var initialize = function() {
		var myLatlng = new google.maps.LatLng(0, 0);
		var mapOptions = mapObj;

		if (Kdetectmob && Kdetectmob()) {
			mapOptions.draggable = false;
			mapOptions.scrollwheel = false;
		}

		shop_krcmaps.push(new google.maps.Map(document.getElementById(id + '_0'), mapOptions));
		shop_krcmaps.push(new google.maps.Map(document.getElementById(id + '_1'), mapOptions));
		shop_krcmaps.push(new google.maps.Map(document.getElementById(id + '_2'), mapOptions));
		shop_krcmaps.push(new google.maps.Map(document.getElementById(id + '_3'), mapOptions));

		if (typeof dir === 'string' || dir instanceof String) {
			that.addMarkerGeo(dir, obj, true, null, shop_krcmaps);
			return;
		}

		if (dir.constructor.name == 'Array' && dir.length === 2) {
			var lat = Number(String(dir[0]).replace(',', '.'));
			var lon = Number(String(dir[1]).replace(',', '.'));
			if (lat && lon) {
				dir = {};
				dir.lat = lat;
				dir.lng = lon;
				that.addMarkerGeo(dir, obj, true, null, shop_krcmaps);
				return;
			}
		}

		console.log('SIN DIRECCION');
		that.finshLoad();
	};

	this.krcAddMarker = function($obj, autoCenter, $shop_krcmaps_, index) {
		$obj.map = $shop_krcmaps_;

		var el = document.getElementById(id + '_' + index);

		if (!el){
			console.error('no element map', id + '_' + index, 'el:', el);
			return
		}

		$(el)
			.closest('.mapParent')
			.removeClass('hidemap');

		var dirLabel = '';
		var objResult = null;

		if ($shop_krcmaps_ && $shop_krcmaps_._result) {
			if ($shop_krcmaps_._result.formatted_address) {
				dirLabel = $shop_krcmaps_._result.formatted_address;
			}
			objResult = JSON.parse(JSON.stringify($shop_krcmaps_._result));
		} else {
			console.log('SIN DIRECCION');
			that.finshLoad();
		}

		if (false) {
			console.log(objResult);
		}

		/*COMPLETA DIRECCION*/
		$(el)
			.closest('.mapParent')
			.find('.direccion')
			.html(dirLabel);

		/*COMPLETA DATA_OBJ CON geocode results*/
		if (objResult) {
			$(el)
				.closest('.mapParent')
				.attr('data-result', JSON.stringify(objResult));
		}

		var marker = new google.maps.Marker($obj);
		$shop_krcmaps_.setCenter($obj.position);
		lastCenter = $obj.position;
	};

	this.addMarkerGeo = function(dir, obj, autoCenter, objComplete, $shop_krcmaps) {
		obj = obj || {};

		shop_krc_geoCode(dir, function(results) {
			if (results && results.length) {
				for (var i = 0; i < results.length; i++) {
					if (i <= 2) {
						var _obj = $.extend({}, obj);
						var myLatlng = results[i].geometry.location;
						_obj.position = myLatlng;
						if (results.length > 1) {
							$shop_krcmaps[i + 1]._result = results[i];
							that.krcAddMarker(_obj, autoCenter, $shop_krcmaps[i + 1], i + 1);
						} else {
							$shop_krcmaps[0]._result = results[i];
							that.krcAddMarker(_obj, autoCenter, $shop_krcmaps[0], 0);
						}
					}
				}
			}
			that.finshLoad();
		});
	};

	this.finshLoad = function() {
		if (!$('.mapParent:not(.hidemap) .radioDir').length > 0) {
			//SIN MAPA
			shop_mapear_noMap();
			return;
		}

		if ($('.mapParent:not(.hidemap) .radioDir').length == 1) {
			//UN SOLO MAPA
			// console.log('solo un mapa');
			$('.multiple').remove();
		}

		if ($('.mapParent:not(.hidemap) .radioDir').length > 1) {
			//VARIOS MAPAS
			// console.log('mÃ¡s de un mapa');
			$('.single').remove();
		}

		$('#JSbuttonsRow').removeClass('hidden');
		$('.mapParent.hidemap').remove();
		$('.radioDir')
			.eq(0)
			.prop('checked', true);
	};

	this.resize = function() {};
	initialize();
	return this;
}

function shop_mapear_noMap() {
	console.warn('No hay mapa');
	$('.botonBoxConfirmar').hide();
	$('.multiple').remove();
	$('.single').remove();
	$('#JSbuttonsRow').remove();
	$('#JStitleBar').remove();
	$('#JSnoDir').removeClass('hidden');
}

function shop_mapear_submit() {
	var $sel = $('input.radioDir:checked').closest('.mapParent');
	var $obj = null;
	var $dirGeo = null;
	var $location = null;

	if ($sel && $sel.length) {
		try {
			$obj = JSON.parse($sel.attr('data-result'));
			$dirGeo = $obj.formatted_address;
			$location = $obj.geometry.location;
		} catch (e) {
			console.error(e);
			shop_mapear_noMap();
			return;
		}
	} else {
		shop_mapear_noMap();
		return;
	}

	//Si no está en el pserver y es static saltea el submit para que lo puedan probar
	if (window.location.href.indexOf('_static_shop_confirmar_dir.php') !== -1) {
		if (window.location.href.indexOf('pserver') == -1) {
			window.location = '_static_shop_sel_descuento.php';
			return;
		}
	}

	//Avoid submit by hash
	if (window.location.href.indexOf('avoidSubmit') !== -1) {
		window.location = '_static_shop_sel_descuento.php';
		return;
	}

	//SUMBIT > LLAMA A LA FUNCION DE AYRTON
	if (submit_confirma_direccion_shop) submit_confirma_direccion_shop($location, $dirGeo);
}