// V012 - 10-01-14_05-18-11
// EJ:
// <script type="text/javascript" src="http://maps.googleapis.com/maps/api/js?key=AIzaSyA1KWKndWsAQZzEx5N8H5vN99GQo5apTk0&sensor=true"></script>

// Nuevo Mapa
// miMapa = new krc_mapear ('mapaDomId', {zoom:15 /* parametros maps*/})

// Nuevo Marker
// miMapa.addMarkerGeo('Baez 268, Buenos Aires, Argentina', {title: 'SushiClub' /* parametros markers*/}, true /*autoCenter*/)

// Simple:
// miMapa = new krc_mapear ('mapaDomId', {zoom:15}, 'Baez 268, Buenos Aires, Argentina', {title: 'SushiClub'});

// Fuerza re-center [Opcional/Solapas]
// miMapa.resize(true)

// TODO: Sacar acentos a las direcciones
// TODO: Más métodos


function krc_geoCode(direccion, $callback){
	geocodeKrcAux = function(options) {
		this.geocoder = new google.maps.Geocoder();
		var callback = options.callback;
		if (options.hasOwnProperty('lat') && options.hasOwnProperty('lng')) {
			options.latLng = new google.maps.LatLng(options.lat, options.lng);
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
				var latlng = results[0].geometry.location;
				$callback(latlng)
			}
		}
	});
}


var krcmaps = []
function krc_mapear (id, mapObj, dir, obj){
	mapObj = mapObj || {zoom: 15}

	var id = id
	var map = null
	var that = this
	var lastCenter = null
	this.map = null

	var initialize = function() {
		// var myLatlng = new google.maps.LatLng(0, 0)
		var mapOptions = mapObj

		if (Kdetectmob()){
			mapOptions.draggable = false;
			mapOptions.scrollwheel = false;
		}

		map = new google.maps.Map(document.getElementById(id), mapOptions);
		that.map = map
		krcmaps.push(map)
	}
	initialize()

	var krcAddMarker = function(obj, autoCenter){
		obj.map = map
		var marker = new google.maps.Marker(obj);
		if (autoCenter){
			map.setCenter (obj.position);
			lastCenter = obj.position
		}
	}
	this.krcAddMarker = krcAddMarker

	var addMarkerGeo = function(dir, obj, autoCenter, objComplete){
		obj = obj || {}
		if (objComplete && objComplete[2] && objComplete[3]){
			obj.position = new google.maps.LatLng (Number (objComplete[2]), Number(objComplete[3]))
			that.krcAddMarker(obj, autoCenter)
		}else{
			krc_geoCode(dir, function(myLatlng){
				obj.position = myLatlng
				that.krcAddMarker(obj, autoCenter)
			})
		}
	}
	this.addMarkerGeo = addMarkerGeo

	var resize = function(autoCenter){
		google.maps.event.trigger(map, 'resize');
		if (autoCenter && lastCenter){
			map.setCenter (lastCenter);
		}
	}
	this.resize = resize

	if (dir){
		addMarkerGeo (dir, obj, true)
	}


	return this
}


