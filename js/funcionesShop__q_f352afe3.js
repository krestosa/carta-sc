function agregarCarritoCallCenter(event,productoId){
	event.preventDefault();
	swal({
		  // timer: 400,
		  imageUrl: 'gfx/ajax-loader.gif',
		  imageSize: '80x80',
		  allowOutsideClick: false,
		  showConfirmButton: false,
		  allowEscapeKey: false,
		  allowOutsideClick: false
		},
			$.ajax({
		    	url: 'shop_agregarcarrito.php',
		    	type: 'POST',
		    	data: {
		    		'producto_id': productoId,
		    		'cantidad':1,
		    	},
		    })
		    .done(function() {
		    	actualizarCarritoBox();
   				closeAllModalProd();   				
		    })
		    .fail(function() {
		    	console.log("error");
		    })
		    .always(function() {
		    	console.log("complete");
		    })
    	)
}


function agregarCarrito(event, btnSumar, sugestivo) {
    event.preventDefault();

    var productoId = $(btnSumar).siblings('.productoId').val();

    var $cont = $(btnSumar).closest('.barraAgregar');
    var $scroll = $(btnSumar).siblings('.scroll-ingredientes');
    var $opts = $('.chk-sin-ingrediente_'+productoId);
    if ($opts.length > 0 && $opts.filter(':checked').length === 0) {
      swal({
        title: "Atención",
        text: "Debes seleccionar al menos una opción.",
        icon: "warning",
        button: "Entendido"
      });
      return;
    }

    
    var productoPrecio = parseInt($(btnSumar).siblings('.productoPrecio').val().replace(/,/g, '')) || 0;
		var sucursalNombre    = $(btnSumar).siblings('.sucursalNombre').val();
		var sucursalId    = $(btnSumar).siblings('.sucursalId').val();
    var productoNombre    = $(btnSumar).siblings('.productoNombre').val();
    var productoCategoria = $(btnSumar).siblings('.productoCategoria').val();
    var ps                = $(btnSumar).siblings('.ps').val() || 0;
    var cantidad          = $('.cantDrop_'+productoId).val();

    var sel = $scroll.find('input[name="sinIngrediente"]:checked').val() || null;
    var sinIngredientesSeleccionados = sel ? [ sel ] : [];


    dataLayer.push({ ecommerce: null });
    dataLayer.push({
      event: "add_to_cart",
		  sucursal : sucursalNombre,
		  sucursal_id : sucursalId,
      ecommerce: {
      	currency: "ARS",
      	value: productoPrecio,
        items: [{
          item_name:     productoNombre,
          item_id:       productoId,
          price:         productoPrecio,
          currency:      "ARS",
          item_brand:    "Sushiclub",
          item_category: productoCategoria,
          quantity:      cantidad
        }]
      }
    });

    swal({
      imageUrl:           'gfx/ajax-loader.gif',
      imageSize:          '80x80',
      allowOutsideClick:  false,
      showConfirmButton:  false,
      allowEscapeKey:     false
    },
      $.ajax({
        url:  'shop_agregarcarrito.php',
        type: 'POST',
        data: {
          producto_id:                  productoId,
          cantidad:                     cantidad,
          sugestivo:                    sugestivo,
          ps:                           ps,
          sinIngredientesSeleccionados: sinIngredientesSeleccionados
        }
      })
      .done(function() {
        if (sugestivo) {
        	window.location.reload();
        }
        actualizarCarritoBox();
        closeAllModalProd();
      })
      .fail(function() {
        console.log("error");
      })
      .always(function() {
        console.log("complete");
      })
    );
}

function actualizarCarritoBox(isPromoInteligente = false){
	if (window.location.href.indexOf("shop_listado.php") > -1 || window.location.href.indexOf("shop_listado_test.php") > -1) {
		$.ajax({
			url: 'product_add_.php',
			type: 'POST',
			data: {'s': "1",},
		})
		.done(function(response) {
			$('.hiddenBigThanTablL').html(response);
			$("#badgeCarrtio").html('<img src="gfx/bag.svg" alt="">'+'<div class="badge" id="badgeCarrtio">'+$("#cantidadAPasar").val()+'</div>');
			$(".carritoTableProAdd").html($(".carritoTable").html());
		    var cantProdBox = $(".carritoTable tbody tr").length;
		    if (cantProdBox >= 4) {
		        $("div.carritoFixed").removeClass("carritoFixed");
		    }

			if (!isPromoInteligente) {
				swal.close();
			}
		});
	}else if(window.location.href.indexOf("shop_checkout.php") > -1 || window.location.href.indexOf("shop_checkout2.php") > -1 || window.location.href.indexOf("shop_checkout_test.php") > -1 ){
		$.ajax({
			url: 'product_add_.php',
			type: 'POST',
			data: { 's': "2",},
		})
		.done(function(response) {
			window.location.reload();
			$('.carritoCheckOut').html(response);
			$("#badgeCarrtio").html('<img src="gfx/bag.svg" alt="">'+'<div class="badge" id="badgeCarrtio">'+$("#cantidadAPasar").val()+'</div>');

			if (!isPromoInteligente) {
				swal.close();
			}
		});

	}
}

function quitarCarrito(productoId,id,sugestivo){
	// event.preventDefault();
	$.ajax({
		url: 'shop_quitarcarrito.php',
		type: 'POST',
		data: {
			'producto_id': productoId,
			'id': id,
			'sugestivo': sugestivo,
		},
		beforeSend: function(){
			// setTimeout(function() {
            swal({
                // timer: 550,
                imageUrl: 'gfx/ajax-loader.gif',
                imageSize: '80x80',
                allowOutsideClick: false,
                showConfirmButton: false,
                allowEscapeKey: false,
                allowOutsideClick: false
            });

        },
	})
	.done(function(response) {
		if (sugestivo == true) {
			window.location.reload();
		}
		if (response == "0") {
			window.location.href = "shop_listado.php";
		}else{
		actualizarCarritoBox();
		setTimeout(swal({title:"",imageUrl: 'gfx/ajax-loader.gif',showConfirmButton: false ,timer:3000}), 10);
		}
		if (productoId == 954) {
			$('.bloqueMedioPago').load(' .bloqueMedioPago');
			$('.sushigiftEspecial').load(' .sushigiftEspecial');
		}
	})
	.fail(function() {
		console.log("error al quitar");
	})
	.always(function() {
		console.log("complete al quitar");
	});

}

function actualizarPrecioModal(selectCantidad,productoId,sugestivo) {
	var cantidad = $(selectCantidad).val();
	var ps = $("#ps").val();
	swal({
		  imageUrl: 'gfx/ajax-loader.gif',
		  imageSize: '80x80',
		  allowOutsideClick: false,
		  showConfirmButton: false,
		  allowEscapeKey: false,
		  allowOutsideClick: false
		},
			$.ajax({
		    	url: 'shop_actualizarCarrito.php',
		    	type: 'POST',
		    	data: {
		    		'accion': 'actualizarPrecioModal',
		    		'cantidad':cantidad,
		    		'producto_id':productoId,
		    		'sugestivo':sugestivo,
		    		'ps':ps,
		    	},
		    })
		    .done(function(response) {
   				swal({title:"",showConfirmButton: false ,timer:1});
   				$('.precioModalPro1').html("$" + response);
   				$('.precio-producto').html("$" + response);
   				$('.precioModalPro2').html("Agregar a mi pedido ($"+response+")");
		    })
    	)
}

function actualizarCantidadCarrito(selectCantidad,productoId,sugestivo) {
	var cantidad = $(selectCantidad).val();
	var odid = $(selectCantidad).data("odid") || 0;
	var ps = $(selectCantidad).data("ps") || 0;
	swal({
		  imageUrl: 'gfx/ajax-loader.gif',
		  imageSize: '80x80',
		  allowOutsideClick: false,
		  showConfirmButton: false,
		  allowEscapeKey: false,
		  allowOutsideClick: false
		},
			$.ajax({
		    	url: 'shop_actualizarCarrito.php',
		    	type: 'POST',
		    	data: {
		    		'accion': 'actualizarCantidadCarrito',
		    		'cantidad':cantidad,
		    		'producto_id':productoId,
		    		'sugestivo':sugestivo,
		    		'ps':ps,
		    		'odid':odid,
		    	},
		    })
		    .done(function(response) {
		    	verificarMinimoDelivery(event);
   				actualizarCarritoBox();
   				closeAllModalProd();
				setTimeout(swal({title:"",imageUrl: 'gfx/ajax-loader.gif',showConfirmButton: false ,timer:3000}), 10);


		    })
		    .fail(function() {
		    	console.log("error");
		    })
		    .always(function() {
		    	console.log("complete");
		    })
    	)
}

function ejecutarDecidir(event){
	closeAllshopsModales();
	event.preventDefault();
	var data = $('.formDecidir').serialize();
	// console.log(data);
	swal({
		  imageUrl: 'gfx/ajax-loader.gif',
		  imageSize: '80x80',
		  allowOutsideClick: false,
		  showConfirmButton: false,
		  allowEscapeKey: false,
		  allowOutsideClick: false
		},
			$.ajax({
				url: 'decidir_implementacion/execute_payment.php',
				type: 'POST',
				data: data,
			})
			.done(function(response) {
				// console.log(response);
				var jResponse = $.parseJSON(response);
				// console.log(jResponse);
				if (jResponse.respuesta_sushigift != undefined) {
					if (jResponse.respuesta_sushigift == "1") {
						swal({
						  text: jResponse.text,
						  confirmButtonText: jResponse.confirmbuttontext,
						  type: jResponse.type,
						  confirmButtonClass: jResponse.confirmbuttonclass,
						  allowEscapeKey: false,
						  allowOutsideClick: false
						});
						$('.btnOkAlert').click(function(event) {
							window.location.href = "shop_sushigift_compra.php";
						});
					}else if(jResponse.respuesta_sushigift == "0"){
						if(jResponse.urlUnica == "1" && jResponse.usoUnicaVezHashSushigift == "1"){
							swal({
							  html: "Transaccion no autorizada. <br> Los datos ingresados de su tarjeta no son válidos. <br> Por favor solicite un nuevo enlace de compra y utilice la tarjeta informada.",
							  confirmButtonText: jResponse.confirmbuttontext,
							  type: jResponse.type,
							  confirmButtonClass: jResponse.confirmbuttonclass,
							  allowEscapeKey: false,
							  allowOutsideClick: false
							});
							$('.btnErrorAlert').click(function(event) {
								window.location.href = "index.php";
							});
						}else{
							swal({
							  text: jResponse.text,
							  confirmButtonText: jResponse.confirmbuttontext,
							  type: jResponse.type,
							  confirmButtonClass: jResponse.confirmbuttonclass,
							  allowEscapeKey: false,
							  allowOutsideClick: false
							});
						}
					}
				}else{
					if (jResponse.galiciaShopError != undefined && jResponse.galiciaShopError == "1") {
						if (jResponse.esCallcenter != undefined) {
							swal({
							   	type: "error",
							    html:
							    	'Los datos ingresados son incorrectos' + 
							    	'<br><br>' + 
							        '<button type="button" role="button" tabindex="0" class="btn btn-primary btnGaliciaErrorDatos">' + 'Reintentar' + '</button>' + '&nbsp;&nbsp;' +
							        '<button type="button" role="button" tabindex="0" class="btn btn-primary btngaliciaShopErrorCallcenter">' + 'Elegir pago NO Eminent' + '</button>',
							    showCancelButton: false,
							    showConfirmButton: false
							});
						}else{

							swal({
							   	type: "error",
							    html:
							    	'Los datos ingresados son incorrectos' + 
							    	'<br><br>' + 
							        '<button type="button" role="button" tabindex="0" class="btn btn-primary btnGaliciaErrorDatos">' + 'Reintentar' + '</button>' + '&nbsp;&nbsp;' +
							        '<button type="button" role="button" tabindex="0" class="btn btn-primary btngaliciaShopError">' + 'Elegir pago NO Eminent' + '</button>',
							    showCancelButton: false,
							    showConfirmButton: false
							});
						}
					}else{
						if (jResponse.type == "error") {
							if (jResponse.reintentos == 2) {
								swal({
								  text: "Comuniquese con Sushiclub para realizar la compra telefonicamente",
								  confirmButtonText: "Ok",
								  type: jResponse.type,
								  confirmButtonClass: jResponse.confirmbuttonclass,
								  allowEscapeKey: false,
								  allowOutsideClick: false
								});
							}else{
								swal({
								  text: jResponse.text,
								  confirmButtonText: "Reintentar pago",
								  type: jResponse.type,
								  confirmButtonClass: "reitentarPagoBtn btn-warning",
								  allowEscapeKey: false,
								  allowOutsideClick: false
								});
							}
						}else{
							if (jResponse.type == "success") {
								// enviarEventoPurchase(jResponse.ordenId,jResponse.sucursalNombre,jResponse.sucursalId);
								if($('.formCheckout').length > 0){
									var formDatos = $('.formCheckout').serialize();
									window.location.href = "shop_final.php?f=1&" + formDatos;
								}else{
									window.location.href = "shop_final.php?f=2&" + formDatos;
								}
								return false;
							}
						}
					}
					$('.reitentarPagoBtn').click(function(event) {
						if(window.location.href.indexOf("shop_form_decidir_open_modal") > -1) {
					       $('.pagarVisaUserNew').attr('href', 'shop_form_decidir_modal.php?rt=1');
					    }
						$('.tarjetaMedioPago').attr('href','shop_form_decidir_modal.php?rt=1');
						$('.tarjetaMedioPago').addClass('fancyboxModalDecidir fancybox.ajax');
						$('.tarjetaMedioPago').trigger('click');
						
					});
					$('.btnOkAlert').click(function(event) {
						if(localStorage.getItem("userRegister") === "1"){
							window.dataLayer = window.dataLayer || [];
							window.dataLayer.push({
							'event' : 'REGISTRACION'
							});
						}
						swal({
							imageUrl: 'gfx/ajax-loader.gif',
							text: 'Procesando su pedido',
							imageSize: '80x80',
							allowOutsideClick: false,
							showConfirmButton: false,
							allowEscapeKey: false,
							allowOutsideClick: false
						});

						var formDatos = "";

						if($('.formCheckout').length > 0){
							var formDatos = $('.formCheckout').serialize();
							window.location.href = "shop_final.php?f=1&" + formDatos;
						}else{
							window.location.href = "shop_final.php?f=2&" + formDatos;
						}
					});

					$('.btnErrorAlert').click(function(event) {
						// swal({
						// 	imageUrl: 'gfx/ajax-loader.gif',
						// 	text: 'Procesando su pedido',
						// 	imageSize: '80x80',
						// 	allowOutsideClick: false,
						// 	showConfirmButton: false,
						// 	allowEscapeKey: false,
						// 	allowOutsideClick: false
						// });
						// window.location.href = "shop_final.php";
						window.location.href = "shop_init.php";
					});

					$('.btngaliciaShopError').click(function(event) {
						window.location.href = "shop_init.php";
					});

					$('.btngaliciaShopErrorCallcenter').click(function(event) {
						window.location.href = "shop_init_c.php";
					});

					$('.btnGaliciaErrorDatos').click(function(event) {
						swal.close();
						if(window.location.href.indexOf("shop_form_decidir_open_modal") > -1) {
					       $('.pagarVisaUserNew').attr('href', 'shop_form_decidir_modal.php?rt=1');
					    }
						$('.tarjetaMedioPago').attr('href','shop_form_decidir_modal.php?rt=1');
						$('.tarjetaMedioPago').addClass('fancyboxModalDecidir fancybox.ajax');
						$('.tarjetaMedioPago').trigger('click');
					});


					// LUEGO HACER QUE REDIRIGA AL INDEX Y QUE VACIE EL CARRITO..
				}
			})
			.fail(function() {
				console.log("error");
			})
			.always(function() {
				console.log("complete");
			})
    )
}

function ejecutarDecidirCesar(event){
	closeAllshopsModales();
	event.preventDefault();
	var data = $('.formDecidir').serialize();
	// console.log(data);
	swal({
		  imageUrl: 'gfx/ajax-loader.gif',
		  imageSize: '80x80',
		  allowOutsideClick: false,
		  showConfirmButton: false,
		  allowEscapeKey: false,
		  allowOutsideClick: false
		},
			$.ajax({
				url: 'decidir_implementacion/execute_payment_cesar.php',
				type: 'POST',
				data: data,
			})
			.done(function(response) {
				// console.log(response);
				var jResponse = $.parseJSON(response);
				// console.log(jResponse);
				if (jResponse.respuesta_sushigift != undefined) {
					if (jResponse.respuesta_sushigift == "1") {
						// activarSushigift();
						console.log("entre aca y tengo que activar la sushigift");
						$.ajax({
							url: 'shop_alta_sushigift.php',
							type: 'POST',
							data: {
								'accion': 'activar'
							},
						})
						.done(function() {
							swal({
							  text: jResponse.text,
							  confirmButtonText: jResponse.confirmbuttontext,
							  type: jResponse.type,
							  confirmButtonClass: jResponse.confirmbuttonclass,
							  allowEscapeKey: false,
							  allowOutsideClick: false
							});
							$('.btnOkAlert').click(function(event) {
								window.location.href = "shop_sushigift_compra.php";
							});
						})
						.fail(function() {
							console.log("error");
						})
						.always(function() {
							console.log("complete");
						});
						console.log("pago sushigift y la compra dio bien");
						// swal({
						//   text: jResponse.text,
						//   confirmButtonText: jResponse.confirmbuttontext,
						//   type: jResponse.type,
						//   confirmButtonClass: jResponse.confirmbuttonclass,
						//   allowEscapeKey: false,
						//   allowOutsideClick: false
						// });
					}else if(jResponse.respuesta_sushigift == "0"){
						console.log("pago sushigift y la compra dio mal");
						swal({
						  text: jResponse.text,
						  confirmButtonText: jResponse.confirmbuttontext,
						  type: jResponse.type,
						  confirmButtonClass: jResponse.confirmbuttonclass,
						  allowEscapeKey: false,
						  allowOutsideClick: false
						});
						// $('.btnErrorAlert').click(function(event) {
						// 	window.location.href = "shop_form_sushi_gift.php";
						// });
					}
				}else{
					console.log("NO!!!! pago sushigift y la compra dio bien/mal");
					if (jResponse.type == "error") {
						if (jResponse.reintentos == 2) {
							swal({
							  text: "Comuniquese con Sushiclub para realizar la compra telefonicamente",
							  confirmButtonText: "Ok",
							  type: jResponse.type,
							  confirmButtonClass: jResponse.confirmbuttonclass,
							  allowEscapeKey: false,
							  allowOutsideClick: false
							});
						}else{
							swal({
							  text: jResponse.text,
							  confirmButtonText: "Reintentar pago",
							  type: jResponse.type,
							  confirmButtonClass: "reitentarPagoBtn btn-warning",
							  allowEscapeKey: false,
							  allowOutsideClick: false
							});
						}
					}else{
						swal({
						  text: jResponse.text,
						  confirmButtonText: jResponse.confirmbuttontext,
						  type: jResponse.type,
						  confirmButtonClass: jResponse.confirmbuttonclass,
						  allowEscapeKey: false,
						  allowOutsideClick: false
						});
					}
					$('.reitentarPagoBtn').click(function(event) {
						if(window.location.href.indexOf("shop_form_decidir_open_modal") > -1) {
					       $('.pagarVisaUserNew').attr('href', 'shop_form_decidir_modal.php?rt=1');
					    }
						$('.tarjetaMedioPago').attr('href','shop_form_decidir_modal.php?rt=1');
						$('.tarjetaMedioPago').addClass('fancyboxModalDecidir fancybox.ajax');
						$('.tarjetaMedioPago').trigger('click');
						
					});
					$('.btnOkAlert').click(function(event) {
						swal({
							imageUrl: 'gfx/ajax-loader.gif',
							text: 'Procesando su pedido',
							imageSize: '80x80',
							allowOutsideClick: false,
							showConfirmButton: false,
							allowEscapeKey: false,
							allowOutsideClick: false
						});

						var formDatos = "";

						if($('.formCheckout').length > 0){
							var formDatos = $('.formCheckout').serialize();
							window.location.href = "shop_final.php?f=1&" + formDatos;
						}else{
							window.location.href = "shop_final.php?f=2&" + formDatos;
						}



					});

					$('.btnErrorAlert').click(function(event) {
						swal({
							imageUrl: 'gfx/ajax-loader.gif',
							text: 'Procesando su pedido',
							imageSize: '80x80',
							allowOutsideClick: false,
							showConfirmButton: false,
							allowEscapeKey: false,
							allowOutsideClick: false
						});
						window.location.href = "shop_final.php";
					});
					// LUEGO HACER QUE REDIRIGA AL INDEX Y QUE VACIE EL CARRITO..
				}
			})
			.fail(function() {
				console.log("error");
			})
			.always(function() {
				console.log("complete");
			})
    )
}


function submit_init_shop(modaliadDePago, horarioDePedido, diaDePedido){
	// console.log(modaliadDePago, horarioDePedido, diaDePedido);

	var diaDePedidoFormat = moment(diaDePedido).format('DD/MM/YYYY');

	// console.log('ESTA ES LA FECHA QUE LLEGA'+diaDePedidoFormat);
	// console.log('ESTA ES LA HORA QUE LLEGA'+horarioDePedido);

	// var diaDePedidoFormat = moment(diaDePedido, "DD-MM-YYYY");

	// console.log(diaDePedidoFormat, '<< hasta acá llega bien');
	var modalidadPedido = $('.btnModalidadPedido.btnActive').data('name');
	var turnoPedido = $('.btnTurnoPedido.btnActive').data('name');

	console.log(modalidadPedido,turnoPedido);
	asignarSessionForm(diaDePedidoFormat,modalidadPedido,turnoPedido);
	// asignarSessionForm(modalidadPedido,'ModoEnvio');
	// asignarSessionForm(turnoPedido,'turno');
	// window.location = 'shop_sel_user.php';
	// window.location = '_static_shop_sel_user.php';
}

function asignarSessionForm(fechaEntrega,modoEnvio, turnoPedido){
	swalLoading();
	$.ajax({
		url: 'shop_assignSession.php',
		type: 'POST',
		data: {
			'tipo': 'carga_inicial',
			'fechaEntrega': fechaEntrega,
			'modoEnvio': modoEnvio,
			'turnoPedido': turnoPedido
		},
	})
	.done(function(response) {
		window.location = 'shop_sel_user.php';
	})
	.fail(function() {
		console.log("error");
	})
	.always(function() {
		console.log("complete");
	});

}

function asignarSession(nombre,item){
	$.ajax({
		url: 'shop_assignSession.php',
		type: 'POST',
		data: {
			'nombre': nombre,
			'item': item
		},
	})
	.done(function(response) {
		console.log(response);
	})
	.fail(function() {
		console.log("error");
	})
	.always(function() {
		console.log("complete");
	});

}

function direccionUsuarioSession(){
	event.preventDefault();

	var dato = $('#formDir').serialize();
	var actionDir = $("#action_dir").val();
	console.log(dato);
	$.ajax({
		url: 'shop_assignSession.php',
		type: 'POST',
		data: dato+"&item=DireccionUsuario",
	})
	.done(function(response) {
		console.log(response);
		console.log(actionDir);
		if(actionDir == "modificacion"){
			window.location = "shop_confirmar_dir.php?action_dir=modificacion";
		}else{
			window.location = "shop_confirmar_dir.php";
		}

	})
	.fail(function() {
		console.log("error");
		swalLoading();
		return false;

	})
	.always(function() {
		console.log("complete");
	});

}

function localTakeAwaySession(){
	var dato = $('#formTakeAway').serialize();
	$.ajax({
		url: 'shop_assignSession.php',
		type: 'POST',
		data: dato+"&item=LocalTakeAway",
	})
	.done(function(response) {
		console.log(response);
		if (response == 1) {
			window.location = "shop_galicia.php"
		}else{
			window.location = "shop_listado.php"
		}
	})
	.fail(function() {
		console.log("error");
	})
	.always(function() {
		console.log("complete");
	});
}

// ESTA FUNCION SE VA A LLAMAR LUEGO CUANDO SE HAGAN LAS INTEGRACIONES CON LAS TARJETAS
// function seleccionDescuentoSession(){
// 	// event.preventDefault();
// 	var dato = $('.descuentoForm').serialize();
// 	console.log(dato);
// 	$.ajax({
// 		url: 'shop_assignSession.php',
// 		type: 'POST',
// 		data: dato+"&item=Promo",
// 	})
// 	.done(function(response) {
// 		console.log(response);
// 		window.location.href = "shop_listado.php";
// 		// window.location.replace("shop_listado.php");
// 	})
// 	.fail(function() {
// 		console.log("error");
// 	})
// 	.always(function() {
// 		console.log("complete");
// 	});
// }

/*SUBMIT DEL MAPA / CONFIRMACIÓN DE LAS DIRECCION*/
function submit_confirma_direccion_shop($location, $dirGeo){
	console.log($location, $dirGeo);
	buscarSucursal($location.lat,$location.lng);

	// window.location = '_static_shop_sel_descuento.php'
}

function extraerNumero(texto){
        texto = texto.split(" ").join("");
        texto = texto.replace(/\D/g,'');
        return texto;
}
function normalizePhoneNumberInput(texto){
        return extraerNumero(texto || "");
}
function normalizeAreaCodeInput(texto){
        var areaCode = normalizePhoneNumberInput(texto);

        areaCode = areaCode.replace(/^00+/, '');

        if (areaCode.indexOf('549') === 0) {
                areaCode = areaCode.substring(3);
        } else if (areaCode.indexOf('54') === 0) {
                areaCode = areaCode.substring(2);
        }

        if (areaCode.length > 2 && areaCode.indexOf('9') === 0) {
                areaCode = areaCode.substring(1);
        }

        areaCode = areaCode.replace(/^0+/, '');

        return areaCode;
}
function normalizeStructuredPhoneInput(texto, areaCode){
        var phone = normalizePhoneNumberInput(texto);
        areaCode = normalizeAreaCodeInput(areaCode);

        if (phone.indexOf('549') === 0) {
                phone = phone.substring(3);
        } else if (phone.indexOf('54') === 0) {
                phone = phone.substring(2);
                if (phone.indexOf('9') === 0) {
                        phone = phone.substring(1);
                }
        }

        phone = phone.replace(/^0+/, '');

        if (areaCode) {
                if (phone.indexOf('9' + areaCode) === 0) {
                        phone = phone.substring(areaCode.length + 1);
                } else if (phone.indexOf(areaCode) === 0) {
                        phone = phone.substring(areaCode.length);
                }
        }

        if (phone.indexOf('15') === 0) {
                phone = phone.substring(2);
        }

        return phone.replace(/^0+/, '');
}
function buildStructuredPhoneData(rawAreaCode, rawPhone){
        var areaCode = normalizeAreaCodeInput(rawAreaCode);
        var localPhone = normalizeStructuredPhoneInput(rawPhone, areaCode);
        var isValidAreaCode = /^[0-9]{2,4}$/.test(areaCode);
        var isValidLocalPhone = /^[0-9]{6,8}$/.test(localPhone);

        return {
                areaCode: areaCode,
                localPhone: localPhone,
                nationalPhone: isValidAreaCode && isValidLocalPhone ? areaCode + localPhone : '',
                isValid: isValidAreaCode && isValidLocalPhone
        };
}
function validarInputNumber(obj){
	el = $(obj);

	if (el.hasClass('phoneAreaCode')) {
		numberImput = normalizeAreaCodeInput(el.val());
	} else {
		numberImput = normalizePhoneNumberInput(el.val());
	}

	el.val(numberImput);
}

function verificarEmail(email) {
  var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  return regex.test(email);
}

// ===== Helpers para app shell (persistir datos de usuario en WebView) =====
function buildUserPayloadFromRegisterForm() {
  var nombreForm   = $(".form-registro input[name='nombre']").val()   || '';
  var apellidoForm = $(".form-registro input[name='apellido']").val() || '';
  var emailForm    = $(".form-registro input[name='email']").val()    || $('.emailAltaUser').val() || '';
  var firstNameReg = nombreForm.split(/\s+/)[0] || apellidoForm.split(/\s+/)[0] || '';
  return {
    nombre: nombreForm,
    apellido: apellidoForm,
    email: emailForm,
    firstName: firstNameReg
  };
}

function syncAppShellUserSession(userPayload, options) {
  options = options || {};
  if (window.isAppShell !== true) return;
  var payload = userPayload || {};
  var first = payload.firstName || payload.nombre || payload.apellido || '';
  payload.firstName = first ? first.split(/\s+/)[0] : '';

  window.usuarioLogueado = true;
  if (options.hasOrder !== undefined) {
    window.ordenEnCurso = !!options.hasOrder;
  }

  if (typeof persistAppUser === 'function') {
    persistAppUser(payload);
  }
  if (typeof updateTopUserArea === 'function') {
    updateTopUserArea(payload.firstName || '');
  }
  if (typeof window.updateDarkAppActions === 'function') {
    window.updateDarkAppActions();
  }
  if (typeof sendAppMessage === 'function') {
    sendAppMessage(options.eventType || 'SESSION_SYNC', {
      user: payload,
      hasOrder: !!window.ordenEnCurso,
      loggedIn: true
    });
  }
}

function loginAppShellAfterRegister(email, password, fallbackPayload) {
  var deferred = $.Deferred();

  if (window.isAppShell !== true) {
    deferred.resolve(fallbackPayload);
    return deferred.promise();
  }

  if (!email || !password) {
    syncAppShellUserSession(fallbackPayload, { eventType: 'REGISTER_SUCCESS', hasOrder: false });
    deferred.resolve(fallbackPayload);
    return deferred.promise();
  }

  $.ajax({
    url: 'functions.php',
    type: 'POST',
    dataType: 'json',
    data: {
      action: 'login',
      email: email,
      password: password
    }
  })
  .done(function(resp) {
    var payload = fallbackPayload || {};
    if (resp && resp.ok && resp.usuario) {
      payload = Object.assign({}, resp.usuario);
      var first = payload.firstName || payload.nombre || payload.apellido || '';
      payload.firstName = first ? first.split(/\s+/)[0] : '';
      payload.email = payload.email || email;
      syncAppShellUserSession(payload, {
        eventType: 'REGISTER_SUCCESS',
        hasOrder: !!resp.orden_id
      });
    } else {
      syncAppShellUserSession(payload, { eventType: 'REGISTER_SUCCESS', hasOrder: false });
    }
    deferred.resolve(payload);
  })
  .fail(function() {
    syncAppShellUserSession(fallbackPayload, { eventType: 'REGISTER_SUCCESS', hasOrder: false });
    deferred.resolve(fallbackPayload);
  });

  return deferred.promise();
}
// ========================================================================


function sendRegistro(event){
	event.preventDefault();
	var sucursal_confirmada = sessionStorage.getItem('sucursal');
	var email = $('.emailAltaUser').val();

	if(!verificarEmail(email)){
		swal({
			text: 'Ingrese un email valido, ej: example@example.com',
			confirmButtonText: "Ok",
			allowOutsideClick: false,
			showConfirmButton: true,
			allowEscapeKey: false,
			allowOutsideClick: false,
			type: 'error'
		});
		$('.emailAltaUser').val("");
		return false;
	}

	var numberTelefono = normalizePhoneNumberInput($(".phoneNumber").val());
	$(".phoneNumber").val(numberTelefono);

	var numberDocument = normalizePhoneNumberInput($(".documentNumber").val());
	$(".documentNumber").val(numberDocument);

	var hasAreaCodeField = $(".phoneAreaCode").length > 0;
	if (hasAreaCodeField) {
		var phoneData = buildStructuredPhoneData($(".phoneAreaCode").val(), $(".phoneNumber").val());
		$(".phoneAreaCode").val(phoneData.areaCode);
		$(".phoneNumber").val(phoneData.localPhone);

		if (phoneData.areaCode === "" || phoneData.localPhone === "") {
			swal({
				text: 'Completá el código de área y el número de teléfono',
				confirmButtonText: "Ok",
				allowOutsideClick: false,
				showConfirmButton: true,
				allowEscapeKey: false,
				type: 'error'
			});
			return false;
		}

		if (!phoneData.isValid) {
			swal({
				text: 'Revisá el código de área y el número de teléfono',
				confirmButtonText: "Ok",
				allowOutsideClick: false,
				showConfirmButton: true,
				allowEscapeKey: false,
				type: 'error'
			});
			return false;
		}
	}

	if(numberTelefono == "" || numberDocument == ""){
		swal({
			text: 'Ingrese datos validos',
			confirmButtonText: "Ok",
			allowOutsideClick: false,
			showConfirmButton: false,
			allowEscapeKey: false,
			allowOutsideClick: false,
			type: 'success'
		});
		return false;
	}

	var dato = $('.form-registro').serialize();
	 swal({
		  imageUrl: 'gfx/ajax-loader.gif',
		  imageSize: '80x80',
		  allowOutsideClick: false,
		  showConfirmButton: false,
		  allowEscapeKey: false,
		  allowOutsideClick: false
		},
			$.ajax({
				url: 'registro_ajax.php',
				type: 'POST',
				data: dato,
			})
			.done(function(response) {
				var jResponse = $.parseJSON(response);
				swal({
				  text: jResponse.text,
				  confirmButtonText: jResponse.confirmbuttontext,
				  type: jResponse.type,
				  confirmButtonClass: jResponse.confirmbuttonclass,
				  allowEscapeKey: false,
				  allowOutsideClick: false

				})
				var isSuccess = jResponse && jResponse.type === "success";
				var isAppShell = window.isAppShell === true;
				var isNativeWebView = !!(window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function');
				if (isAppShell && isSuccess && isNativeWebView) {
					var payloadReg = buildUserPayloadFromRegisterForm();
					var passReg = $(".form-registro input[name='password1']").val() || '';

					swal({
						imageUrl: 'gfx/ajax-loader.gif',
						text: 'Iniciando sesion...',
						imageSize: '80x80',
						allowOutsideClick: false,
						showConfirmButton: false,
						allowEscapeKey: false,
						allowOutsideClick: false
					});

					loginAppShellAfterRegister(payloadReg.email, passReg, payloadReg)
						.always(function () {
							if (typeof closeModal === 'function') closeModal('modalRegistro');
							if (typeof openModal === 'function') openModal('modalInit');
						});
					return;
				}
				if (jResponse.lcd == 1) {
					$('.btnOkAlert').click(function() {
						swal({
							imageUrl: 'gfx/ajax-loader.gif',
							imageSize: '80x80',
							allowOutsideClick: false,
							showConfirmButton: false,
							allowEscapeKey: false,
							allowOutsideClick: false
						});
						window.location.href = "lcd.php?action=c";
					});
				}else if (jResponse.checkout == 1 && jResponse.decidir == 1 && (jResponse.tieneDecidir == 1 || jResponse.nave == 1)) {
						localStorage.setItem("userRegister","1");
						$('.btnOkAlert').addClass("fancyboxModalDecidir fancybox.ajax");
						$('.btnOkAlert').attr('href','shop_form_decidir_modal.php');
						$('.btnOkAlert').click(function(event) {
							swal({
								imageUrl: 'gfx/ajax-loader.gif',
								text: 'Procesando su pedido',
								imageSize: '80x80',
								allowOutsideClick: false,
								showConfirmButton: false,
								allowEscapeKey: false,
								allowOutsideClick: false
							});

							if(jResponse.nave == 1){
								$.ajax({
                   url: 'shop_form_nave_modal.php',
                   method: 'GET',
                   data: $('.formCheckout').serialize(),
                   success: function(response) {
                       $('#modal-body-nave').html(response);
                       $('#modalNave').show();
                       swal.close();
                   },
                   error: function() {
                       alert("Hubo un problema al cargar el contenido.");
                   }
               });
                $('.close').on('click', function() {
                    $('#modalNave').hide();
                });
							}else{
								window.location.href = "shop_form_decidir_open_modal.php";
							}
						});
				}else if (jResponse.checkout == 1){
					window.dataLayer = window.dataLayer || [];
					window.dataLayer.push({
					'event' : 'REGISTRACION'
					});
					$('.btnOkAlert').click(function() {
						swal({
							imageUrl: 'gfx/ajax-loader.gif',
							text: 'Procesando su pedido',
							imageSize: '80x80',
							allowOutsideClick: false,
							showConfirmButton: false,
							allowEscapeKey: false,
							allowOutsideClick: false
						});
						window.location.href = "shop_final.php?f=2";
					});
				}else{

					$('.btnOkAlert').click(function() {
						swal({
							imageUrl: 'gfx/ajax-loader.gif',
							text: 'Procesando su pedido',
							imageSize: '80x80',
							allowOutsideClick: false,
							showConfirmButton: false,
							allowEscapeKey: false,
							allowOutsideClick: false
						});
						window.location.href = "shop_listado.php";
					});

					// Modificar usuario logica para refrescar

					$('.btnOkModificarAlert').click(function() {
						swal({
							imageUrl: 'gfx/ajax-loader.gif',
							text: 'cargando...',
							imageSize: '80x80',
							allowOutsideClick: false,
							showConfirmButton: false,
							allowEscapeKey: false,
							allowOutsideClick: false
						});

						window.location.href = jResponse.returnUrl;
					});
				}
			})
			.fail(function() {
			  window.location.replace("error.php");
			})
		)

}

function sendRegistroCallcenter(event){

	event.preventDefault();
	var sucursal_confirmada = sessionStorage.getItem('sucursal');
	var email = $('.email').val();

	if(!verificarEmail(email)){
		swal({
			text: 'Ingrese un email valido, ej: example@example.com',
			confirmButtonText: "Ok",
			allowOutsideClick: false,
			showConfirmButton: true,
			allowEscapeKey: false,
			allowOutsideClick: false,
			type: 'error'
		});
		$('.email').val("");
		return false;
	}



	var numberTelefono = normalizePhoneNumberInput($(".phoneNumber").val());
	$(".phoneNumber").val(numberTelefono);

	var numberDocument = normalizePhoneNumberInput($(".documentNumber").val());
	$(".documentNumber").val(numberDocument);

	if(numberTelefono == ""){
		swal({
			text: 'Ingrese datos validos',
			confirmButtonText: "Ok",
			allowOutsideClick: false,
			showConfirmButton: false,
			allowEscapeKey: false,
			allowOutsideClick: false,
			type: 'success'
		});
		return false;
	}

	var dato = $('.form-registro').serialize();
	console.log(dato);
	 swal({
		  imageUrl: 'gfx/ajax-loader.gif',
		  imageSize: '80x80',
		  allowOutsideClick: false,
		  showConfirmButton: false,
		  allowEscapeKey: false,
		  allowOutsideClick: false
		},
			$.ajax({
				url: 'registro_ajax_callcenter.php',
				type: 'POST',
				data: dato,
			})
			.done(function(response) {
				console.log(response);
				var jResponse = $.parseJSON(response);
				swal({
				  text: jResponse.text,
				  confirmButtonText: jResponse.confirmbuttontext,
				  type: jResponse.type,
				  confirmButtonClass: jResponse.confirmbuttonclass,
				  allowEscapeKey: false,
				  allowOutsideClick: false

				})
				// $('.btnOkAlert').click(function() {
				// 	swal({
				// 		imageUrl: 'gfx/ajax-loader.gif',
				// 		text: 'Procesando su pedido',
				// 		imageSize: '80x80',
				// 		allowOutsideClick: false,
				// 		showConfirmButton: false,
				// 		allowEscapeKey: false,
				// 		allowOutsideClick: false
				// 	});
				// 	window.location.href = "shop_final.php?f=2";
				// });
				// return false;
				window.dataLayer = window.dataLayer || [];
				window.dataLayer.push({
				'event' : 'REGISTRACION'
				});
				if (jResponse.checkout == 1 && jResponse.decidir == 1 && jResponse.tieneDecidir == 1) {
						$('.btnOkAlert').addClass("fancyboxModalDecidir fancybox.ajax");
						$('.btnOkAlert').attr('href','shop_form_decidir_modal.php');
						// $('.btnOkAlert').trigger('click');
						$('.btnOkAlert').click(function(event) {
							swal({
								imageUrl: 'gfx/ajax-loader.gif',
								text: 'Procesando su pedido',
								imageSize: '80x80',
								allowOutsideClick: false,
								showConfirmButton: false,
								allowEscapeKey: false,
								allowOutsideClick: false
							});

							window.location.href = "shop_final.php?f=2";
						});
				}else if (jResponse.checkout == 1){
					$('.btnOkAlert').click(function() {
						swal({
							imageUrl: 'gfx/ajax-loader.gif',
							text: 'Procesando su pedido',
							imageSize: '80x80',
							allowOutsideClick: false,
							showConfirmButton: false,
							allowEscapeKey: false,
							allowOutsideClick: false
						});
						window.location.href = "shop_final.php?f=2";
					});
				}
				// else{

				// 	$('.btnOkAlert').click(function() {
				// 		swal({
				// 			imageUrl: 'gfx/ajax-loader.gif',
				// 			text: 'Procesando su pedido',
				// 			imageSize: '80x80',
				// 			allowOutsideClick: false,
				// 			showConfirmButton: false,
				// 			allowEscapeKey: false,
				// 			allowOutsideClick: false
				// 		});
				// 		window.location.href = "shop_listado.php";
				// 	});
				// 	$('.btnOkModificarAlert').click(function() {
				// 		swal({
				// 			imageUrl: 'gfx/ajax-loader.gif',
				// 			text: 'cargando...',
				// 			imageSize: '80x80',
				// 			allowOutsideClick: false,
				// 			showConfirmButton: false,
				// 			allowEscapeKey: false,
				// 			allowOutsideClick: false
				// 		});

				// 		window.location.href = jResponse.returnUrl;
				// 	});
				// }
			})
			.fail(function() {
			  window.location.replace("error.php");
			})
		)

}

function sendLogin(){
	event.preventDefault();
	var dato = $('.form-login').serialize();
	swal({
		  imageUrl: 'gfx/ajax-loader.gif',
		  imageSize: '80x80',
		  allowOutsideClick: false,
		  showConfirmButton: false,
		  allowEscapeKey: false,
		  allowOutsideClick: false
		},
			$.ajax({
				url: 'login_ajax.php',
				type: 'POST',
				data: dato,
			})
			.done(function(response) {
				// console.log(response);
				var jResponse = $.parseJSON(response);
				swal({
				  text: jResponse.text,
				  confirmButtonText: jResponse.confirmbuttontext,
				  type: jResponse.type,
				  confirmButtonClass: jResponse.confirmbuttonclass
				})
				$('.btnOkAlert').click(function() {
					window.location.href = "shop_listado.php"
				});
				$('.btnWarningAlert').click(function() {
					window.location.href = "shop_modificar_user.php?return_page=ok"
				});
				// $('.btnOkAlertCheck').click(function() {
				// 	window.location.href = "checkout.php"
				// });
				// compruebo = true;
			})
			.fail(function() {
			  window.location.replace("error.php");
			})
		)
}

function sendRecuperarClave(event){
	event.preventDefault();
	var dato = $('.recuperarEmailForm').serialize();
	 swal({
	  // timer: 550,
	  imageUrl: 'gfx/ajax-loader.gif',
	  imageSize: '80x80',
	  allowOutsideClick: false,
	  showConfirmButton: false,
	  allowEscapeKey: false,
	  allowOutsideClick: false
	},

	  $.ajax({
	  	url: 'recuperar_clave_ajax.php',
		type: 'POST',
		data: dato+"&item=Email",
	  })
	  .done(function(response) {
		var jResponse = $.parseJSON(response);
		swal({
		  text: jResponse.text,
		  confirmButtonText: jResponse.confirmbuttontext,
		  type: jResponse.type,
		  confirmButtonClass: jResponse.confirmbuttonclass
		})
		$('.btnOkAlert').click(function(event) {
			window.location.href = "shop_init.php";
		});
	})
	  .fail(function() {
	  	console.log("error");
	  })
	  .always(function() {
	  	console.log("complete");
	  })

	)
}

function sendPasswords(event){
	event.preventDefault();
	var dato = $('.passwords').serialize();
	console.log(dato);
	 swal({
	  // timer: 550,
	  imageUrl: 'gfx/ajax-loader.gif',
	  imageSize: '80x80',
	  allowOutsideClick: false,
	  showConfirmButton: false,
	  allowEscapeKey: false,
	  allowOutsideClick: false
	},

	  $.ajax({
	  	url: 'recuperar_clave_ajax.php',
		type: 'POST',
		data: dato+"&item=Pass",
	  })
	  .done(function(response) {
		var jResponse = $.parseJSON(response);
		swal({
		  text: jResponse.text,
		  confirmButtonText: jResponse.confirmbuttontext,
		  type: jResponse.type,
		  confirmButtonClass: jResponse.confirmbuttonclass,
		  allowEscapeKey: false,
		  allowOutsideClick: false
		})
		$('.btnOkAlert').click(function(event) {
			window.location.href = "shop_init.php";
		});
	})
	  .fail(function() {
	  	console.log("error");
	  })
	  .always(function() {
	  	console.log("complete");
	  })

	)
}

function cambiarModoEnvioCheckout(modoEnvio){
	var formaEnvio = $(modoEnvio).data('name');
	console.log(formaEnvio);
	swal({
		  imageUrl: 'gfx/ajax-loader.gif',
		  imageSize: '80x80',
		  allowOutsideClick: false,
		  showConfirmButton: false,
		  allowEscapeKey: false,
		  allowOutsideClick: false
		},
			$.ajax({
				url: 'envio_checkout_ajax.php',
				type: 'POST',
				data: {
					'envio': formaEnvio
				},
			})
			.done(function() {
				$('.carritoBoxCheckout').load(' .carritoBoxCheckout');
				// $('.checkoutContent').load(' .checkoutContent');
   				swal({title:"",showConfirmButton: false ,timer:1});
   				console.log(111);

			})
			.fail(function() {
				console.log("error");
			})
			.always(function() {
				console.log("complete");
			})
		)
}

function openDecidir(){
	window.location.href = "shop_form_decidir_modal.php";
}

function agregarCarritoAcq(idProducto, acqProductos){
	console.warn(idProducto);
	console.warn(acqProductos);
	var data = [];

	$.each(acqProductos, function(index, val) {
		 console.log(val)
		 data.push(val);
	});

	var dataJson = JSON.stringify(data);
	swal({
		  // timer: 400,
		imageUrl: 'gfx/ajax-loader.gif',
		imageSize: '80x80',
		allowOutsideClick: false,
		showConfirmButton: false,
		allowEscapeKey: false,
		allowOutsideClick: false
	});

	$.ajax({
		url: 'shop_agregarcarrito.php',
		type: 'POST',
		data: {
			"producto_id": idProducto,
			"dataAcq" : dataJson,
			"acq" : 1
		},
	})
	.done(function(response) {
		closeAllModalAcq();
		console.log(response)
		console.log("success");
		swal.close();
		actualizarCarritoBox();
		setTimeout(swal({title:"",imageUrl: 'gfx/ajax-loader.gif',showConfirmButton: false ,timer:3000}), 10);
	})
	.fail(function() {
		console.log("error");
	})
	.always(function() {
		console.log("complete");
	});
}

function swalLoading(){
	swal({
	  // timer: 400,
		imageUrl: 'gfx/ajax-loader.gif',
		imageSize: '80x80',
		allowOutsideClick: false,
		showConfirmButton: false,
		allowEscapeKey: false,
		allowOutsideClick: false
	})
}

function eliminarDireccion(id){
	swalLoading()
	console.log(id)
	$.ajax({
		url: 'ajax_eliminar_direccion.php',
		type: 'POST',
		data: {"dir_id": id},
	})
	.done(function(response) {
		console.log("success");
		divDirDelete = $(".rowDir" +id);
		divDirDelete.remove();
		swal.close();
		swal({
			text: "Direccion eliminada",
			confirmButtonText: "Ok",
			type: "success",
			allowEscapeKey: false,
			allowOutsideClick: false
		})

	})
	.fail(function() {
		console.log("error");
	})
	.always(function() {
		console.log("complete");
	});

}

function comprarSushigift(event){
	event.preventDefault();
	var data = $('#sushigiftAltaForm').serialize();
	swalLoading();
	$.ajax({
		url: 'shop_alta_sushigift.php',
		type: 'POST',
		data: data
	})
	.done(function(response) {
		var jResponse = $.parseJSON(response);
		if (jResponse.respuesta == "1")
		{
			swal.close();
			$('.modalDecidir').attr('href','shop_form_decidir_modal.php');
			$('.modalDecidir').addClass('fancyboxModalDecidir fancybox.ajax');
			$('.modalDecidir').trigger('click');
		}else if(jResponse.respuesta == "0")
		{
			swal.close();
			swal({
			  text: jResponse.text,
			  confirmButtonText: jResponse.confirmbuttontext,
			  type: jResponse.type,
			  confirmButtonClass: jResponse.confirmbuttonclass,
			  allowEscapeKey: false,
			  allowOutsideClick: false
			});
		}
	})
	.fail(function() {
		console.log("error");
	})
	.always(function() {
		console.log("complete");
	});

}

function procesarPin(event,form){
	event.preventDefault();
	var data = $(form).serialize();
	// console.log(data);
	// return false;
	swalLoading();
	$.ajax({
		url: 'shop_procesar_pin_ajax.php',
		type: 'POST',
		data: data
	})
	.done(function(response) {
		var jResponse = $.parseJSON(response);
		swal.close();
		swal({
		  text: jResponse.text,
		  confirmButtonText: jResponse.confirmbuttontext,
		  type: jResponse.type,
		  confirmButtonClass: jResponse.confirmbuttonclass,
		  allowEscapeKey: false,
		  allowOutsideClick: false
		});
		$('.btnOkPin').click(function(event) {
			window.location.href = "index.php";
		});
		$('.btnErrorPin').click(function(event) {
			window.location.href = "shop_recuperar_pin.php";
		});
	})
	.fail(function() {
		console.log("error");
	})
	.always(function() {
		console.log("complete");
	});
}

function verificarSushigift(btn){
	event.preventDefault();
	swalLoading();
	console.log(btn);
	var codigo = $(btn).parents(".div-content-sg").find(".codigo").val();
	var pin = $(btn).parents(".div-content-sg").find(".pin").val();
	console.log(codigo+"-"+pin);
	$.ajax({
		url: 'procesar_sushigift_ajax.php',
		type: 'POST',
		data: {
			'codigo': codigo,
			'pin': pin,
		},
	})
	.done(function(response) {
		var jResponse = $.parseJSON(response);
		console.log(sushigiftCards);
		console.log(jResponse);
		swal.close();
		swal({
		  text: jResponse.text,
		  confirmButtonText: jResponse.confirmbuttontext,
		  type: jResponse.type,
		  confirmButtonClass: jResponse.confirmbuttonclass,
		  allowEscapeKey: false,
		  allowOutsideClick: false
		});

		if (jResponse.confirmbuttonclass == "btnOkSushigift") {
			console.log(btn);
			$(btn).parents(".div-content-sg").find(".codigo").attr('readonly', true);
			$(btn).parents(".div-content-sg").find('.pin').attr('readonly', true);
			$(btn).parents(".div-content-sg").find('.saldoDisponible').attr('readonly', true);
			$(btn).parents(".div-content-sg").find('.codigo').prop('readonly', true);
			$(btn).parents(".div-content-sg").find('.pin').prop('readonly', true);
			$(btn).parents(".div-content-sg").find('.saldoDisponible').prop('readonly', true);
			$(btn).parents(".div-content-sg").find('.compraSushigift').prop('readonly', false);
			$(btn).parents(".div-content-sg").find('.saldoDisponible').val(jResponse.saldo);
			$(btn).parents(".div-content-sg").find('.aplicarSushigift').show();

			sushigiftCards.push(jResponse.sushigift);

			console.log("agrege al array la sushigift",sushigiftCards);
		}else if(jResponse.confirmbuttonclass == "btnErrorSushigift"){
			$(btn).parents(".div-content-sg").find(".codigo").val("");
			$(btn).parents(".div-content-sg").find(".pin").val("");
			$(btn).parents(".div-content-sg").find(".saldoDisponible").val("");
			$(btn).parents(".div-content-sg").find('.aplicarSushigift').hide();
		}

	})
	.fail(function() {
		console.log("error");
	})
	.always(function() {
		console.log("complete");
	});
}


function actualizarPrecioModalEvento(selectCantidad,productoId) {
	var cantidad = $(selectCantidad).val();
	console.log(cantidad);
	swal({
		  imageUrl: 'gfx/ajax-loader.gif',
		  imageSize: '80x80',
		  allowOutsideClick: false,
		  showConfirmButton: false,
		  allowEscapeKey: false,
		  allowOutsideClick: false
		},
			$.ajax({
		    	url: 'shop_actualizarCarrito_evento.php',
		    	type: 'POST',
		    	data: {
		    		'accion': 'actualizarPrecioModal',
		    		'cantidad':cantidad,
		    		'producto_id':productoId,
		    	},
		    })
		    .done(function(response) {
   				swal({title:"",showConfirmButton: false ,timer:1});
   				$('.precioModalPro1').html("$" + response);
   				$('.precio-producto').html("$" + response);
   				$('.precioModalPro2').html("Agregar a mi pedido ($"+response+")");
		    })
		    .fail(function() {
		    	console.log("error");
		    })
		    .always(function() {
		    	console.log("complete");
		    })
    	)
}


function agregarProductoPromoInteligente(event, promoId, cantidad, esBanner = false) {
	event.preventDefault();

	let evento = null;

	function enviarAjaxAgregarProducto() {
		swal({
			imageUrl: 'gfx/ajax-loader.gif',
			imageSize: '80x80',
			allowOutsideClick: false,
			showConfirmButton: false,
			allowEscapeKey: false
		},
		$.ajax({
			url: 'pi_shop_agregar_producto.php',
			type: 'POST',
			data: {
				'pi_promocion_id': promoId,
				'cantidad': cantidad
			},
		})
		.done(function(response) {
			var jResponse = $.parseJSON(response);
			if (jResponse.type === "error") {
				swal({
					text: jResponse.text,
					confirmButtonText: jResponse.confirmbuttontext,
					type: jResponse.type,
					confirmButtonClass: jResponse.confirmbuttonclass
				});
			} else {
				if (evento) {
					dataLayer.push({ ecommerce: null });
					// console.log("PUSH al dataLayer:", JSON.stringify(evento, null, 2));
					dataLayer.push(evento);
				}
				setTimeout(function() {
					window.location.reload();
				}, 200);
			}
		}));
	}

	if (esBanner) {
		$.ajax({
			url: "getDataPromoBanner.php",
			data: { pi_promocion_id: promoId },
			dataType: "json"
		}).done(function(data) {
			evento = data;
			enviarAjaxAgregarProducto();
		});
	} else {
		var productoId        = $(`.productoId_${promoId}`).val();
		var sucursalNombre    = $(`.sucursalNombre_${promoId}`).val();
		var sucursalId        = $(`.sucursalId_${promoId}`).val();
		var rawPrecio         = $(`.productoPrecio_${promoId}`).val();
		var productoPrecio    = parseInt(rawPrecio.replace(/,/g, ''), 10);
		var productoNombre    = $(`.productoNombre_${promoId}`).val();

		evento = {
			event:       "add_to_cart",
			sucursal:    sucursalNombre,
			sucursal_id: sucursalId,
			ecommerce: {
				currency: "ARS",
				value: productoPrecio * parseInt(cantidad, 10),
				items: [{
					item_name:     productoNombre,
					item_id:       productoId,
					price:         productoPrecio,
					currency:      "ARS",
					item_brand:    "Sushiclub",
					item_category: "PROMOCIONES ESPECIALES",
					quantity:      cantidad
				}]
			}
		};

		enviarAjaxAgregarProducto();
	}
}


function cobrarEvento(event,eventoId,form){
	event.preventDefault();
	var dato = $('.eventForm').serialize();

	swal({
		  imageUrl: 'gfx/ajax-loader.gif',
		  imageSize: '80x80',
		  allowOutsideClick: false,
		  showConfirmButton: false,
		  allowEscapeKey: false,
		  allowOutsideClick: false
		},
			$.ajax({
				url: 'evento_sushiclub_grabar_form.php',
				type: 'POST',
				data: dato+"&idevento="+eventoId,
			})
			.done(function(response) {
				var jResponse = $.parseJSON(response);
				console.log(jResponse);
				if (jResponse.decidir == 1) {
					swal.close();
					$('.modalDecidir').attr('href','pago_decidir_evento.php');
					$('.modalDecidir').addClass('fancyboxModalDecidir fancybox.ajax');
					$('.modalDecidir').trigger('click');

				}else if(jResponse.decidir == 2){
					window.location.href = "evento_final.php?t="+jResponse.t+"&f="+jResponse.f;
				}else{
					window.location.href = "eventos_sushiclub.php?s=1&id="+jResponse.hash;
				}
			})
			.fail(function() {
				console.log("error");
			})
			.always(function() {
				console.log("complete");
			})
    	);
}

function sendEventToDecidir(event){
	event.preventDefault();
	var dato = $('.formDecidirEvento').serialize();

	swal({
		  imageUrl: 'gfx/ajax-loader.gif',
		  imageSize: '80x80',
		  allowOutsideClick: false,
		  showConfirmButton: false,
		  allowEscapeKey: false,
		  allowOutsideClick: false
		},
			$.ajax({
				url: 'ejecutar_pago_evento.php',
				type: 'POST',
				data: dato
			})
			.done(function(response) {
				var jResponse = $.parseJSON(response);
				console.log(jResponse);
				if (jResponse.maxideli == 1) {
					swal.close();
					swal({
					  text: jResponse.text,
					  confirmButtonText: jResponse.confirmbuttontext,
					  type: jResponse.type,
					  confirmButtonClass: jResponse.confirmbuttonclass,
					  allowEscapeKey: false,
					  allowOutsideClick: false
					});
					$('.btnOkAlertEvent').click(function(event) {
						// swalLoading();
						swal({
							imageUrl: 'gfx/ajax-loader.gif',
							text: 'Procesando su pedido',
							imageSize: '80x80',
							allowOutsideClick: false,
							showConfirmButton: false,
							allowEscapeKey: false,
							allowOutsideClick: false
						});
						window.location.href = "evento_final.php?t="+jResponse.t+"&f="+jResponse.f;
					});
				}else{
					swal.close();
					swal({
					  text: jResponse.text,
					  confirmButtonText: jResponse.confirmbuttontext,
					  type: jResponse.type,
					  confirmButtonClass: jResponse.confirmbuttonclass,
					  allowEscapeKey: false,
					  allowOutsideClick: false
					});
					// $('.btnErrorAlertEvent').click(function(event) {
					// 	window.location.href = "evento_final.php?t="+jResponse.t+"&f="+jResponse.f;
					// }
				}
			})
			.fail(function() {
				console.log("error");
			})
			.always(function() {
				console.log("complete");
			})
    	);
}

function completarDatosUsuario(esTemporal,fechaNacimiento,sexo){
	if (esTemporal == 0) {
		if (fechaNacimiento == "0000-00-00" || sexo == "") {
		// console.log("tengo que abrir el modal");
			$('.modalDatosUsuario').addClass('fancyboxModalNormal fancybox.ajax');
			$('.modalDatosUsuario').attr('href', 'modal_datos_usuario.php?c=1234');
			$('.modalDatosUsuario').trigger('click');
		}
	}
}

function mandarDatosUsuario(event){
	event.preventDefault();
	swalLoading();
	var dato = $('.datosFaltantesUserForm').serialize();
	$.ajax({
		url: 'completar_datos_usuario.php',
		type: 'POST',
		data: dato,
	})
	.always(function() {
		swal.close();
		closeAllshopsModales();
	});

}

function inIframe () {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

$(document).ready(function() {
	if (inIframe ()){
		$('body').addClass('inIframe')
	}
});

function getGaClientIdFromCookie() {
	var cookies = document.cookie ? document.cookie.split(';') : [];
	for (var i = 0; i < cookies.length; i++) {
		var cookie = cookies[i].trim();
		if (cookie.indexOf('_ga=') === 0) {
			var value = cookie.substring(4);
			var parts = value.split('.');
			if (parts.length >= 4) {
				return parts[2] + '.' + parts[3];
			}
		}
	}
	return null;
}

function enviarGaClientIdCheckout() {
	if (window.gaClientIdSent) {
		return;
	}
	if ($('.formCheckout').length === 0 && window.location.pathname.indexOf('checkout') === -1) {
		return;
	}
	var clientId = getGaClientIdFromCookie();
	if (!clientId) {
		return;
	}
	window.gaClientIdSent = true;
	$.ajax({
		url: 'save_ga_client_id.php',
		method: 'POST',
		data: { client_id: clientId },
	}).fail(function() {
		window.gaClientIdSent = false;
	});
}

$(document).ready(function() {
	enviarGaClientIdCheckout();
});
// Intento adicional por si el DOM ready ocurre antes de que la cookie esté disponible
setTimeout(function() {
	enviarGaClientIdCheckout();
}, 1500);

function verificarMinimoDelivery(event){
	event.preventDefault();
	$.ajax({
		url: 'verificaciones_ajax.php',
		type: 'POST',
		data: {'accion': 'verificarMinimoDelivery'},
	})
	.done(function(response) {
		if (response == "1") {
			$('.btnPuy').attr('disabled',false);
			$('.mensajeValidacionDelivery').hide();
		}else if(response == "0"){
			$('.btnPuy').attr('disabled',true);
			$('.mensajeValidacionDelivery').show();
		}
	})
	.fail(function() {
		console.log("error");
	})
	.always(function() {
		console.log("complete");
	});
	
}

function sendFormGalicia(){ 
	event.preventDefault();
	var dato = $('.formGaliciaShop').serialize();
	$.ajax({
		url: 'shop_assignSession.php',
		type: 'POST',
		data: dato
	})
	.done(function(response) {
		if (response == "1") {
			window.location.href = "shop_listado.php";
		}else if(response == "2"){
			window.location.href = "shop_sel_descuento.php";
		}
	})
	.fail(function() {
		console.log("error");
	})
	.always(function() {
		console.log("complete");
	});	
}

function sendFormCheckout(){
	var dato = $('.formCheckout').serialize();
	$.ajax({
		url: 'checkout_session.php',
		type: 'POST',
		data: dato
	})
	.done(function(response) {
		console.log("success");
	});
}

function validateCupon(){
	swalLoading();
	var codigo = $(".codigoCuponModal").val();
	var pin = $(".pinCuponModal").val();
	var monto = $(".montoCuponModal").val();
	$.ajax({
		url: 'validar_cupon.php',
		type: 'POST',
		data: {
			"codigo": codigo,
			"pin": pin,
			"monto": monto,
			"tipo": 'sushigift'
		},
	})
	.done(function(response) {
		swal.close();
		var jResponse = $.parseJSON(response);
		if (jResponse.type != "refresh"){
			swal({
			  text: jResponse.text,
			  confirmButtonText: jResponse.confirmbuttontext,
			  type: jResponse.type,
			  confirmButtonClass: jResponse.confirmbuttonclass,
			  allowEscapeKey: false,
			  allowOutsideClick: false
			});
		}else{
			location.reload();
		}
	});	
}

function ejecutarDecidirLanding(event){
	closeAllshopsModales();
	event.preventDefault();
	var data = $('.formDecidir').serialize()+"&email="+$('#email').val()+"&importe="+$('#importe').val();
	swal({
		  imageUrl: 'gfx/ajax-loader.gif',
		  imageSize: '80x80',
		  allowOutsideClick: false,
		  showConfirmButton: false,
		  allowEscapeKey: false,
		  allowOutsideClick: false
		},
			$.ajax({
				url: 'decidir_implementacion/execute_payment_landing.php',
				type: 'POST',
				data: data,
			})
			.done(function(response) {
				var jResponse = $.parseJSON(response);
				swal({
				  text: jResponse.text,
				  confirmButtonText: jResponse.confirmbuttontext,
				  type: jResponse.type,
				  confirmButtonClass: jResponse.confirmbuttonclass,
				  allowEscapeKey: false,
				  allowOutsideClick: false
				});

				$(".btnErrorAlert").click(function(event) {
					if(jResponse.errorForm == 1){
						closeAllshopsModales();
					}
				});
			})
    )
}

// Funciones eventos
$(function() {
	$(".btnDeleteCupon").click(function(event){
		swalLoading();
		var cuponId = $(this).data("cuponid");
		console.log(cuponId);
		$.ajax({
			url: 'sushigift_ajax.php',
			type: 'POST',
			data: {
				"cuponId": cuponId,
				"action": "remove",
			},
		})
		.done(function(response) {
			swal.close();
			var jResponse = $.parseJSON(response);
			if (jResponse.type != "refresh"){
				swal({
				  text: jResponse.text,
				  confirmButtonText: jResponse.confirmbuttontext,
				  type: jResponse.type,
				  confirmButtonClass: jResponse.confirmbuttonclass,
				  allowEscapeKey: false,
				  allowOutsideClick: false
				});
			}else{
				location.reload();
			}
		});		
	});
});

function logClick(btn, table) {
	var id = $(btn).data('id');
	var log = $(btn).data('link');
	$.ajax({
		type: "POST",
		url: "encuesta_click.php",
		data: {
			id: id,
			log: log,
			tabla: table
		}
	});
}


function enviarEventoPurchase(ordenId, sucursalNombre, sucursalId) {
	$.ajax({
		url: 'getDataOrder.php',
		type: 'GET',
		data: {
			event: 'purchase',
			ordenId: ordenId
		},
		dataType: 'json'
	})
	.done(function(response) {
		if (response && response.status) {
			if (response.status === "already_sent") {
				return;
			}
			if (response.status === "purchase_blocked_missing_id_high_value") {
				console.warn("Se bloqueo el evento de compra por falta de ID y alto valor.");
			}
			return;
		}
		dataLayer.push({ ecommerce: null });

		dataLayer.push({
			event: "purchase",
			sucursal: sucursalNombre,
			sucursal_id: sucursalId,
			ecommerce: response
		});
	});
}

function sendRegistroNew(event) {
	event.preventDefault();
	var sucursal_confirmada = sessionStorage.getItem('sucursal');
	var email = $('.emailAltaUser').val();

	if (!verificarEmail(email)) {
		swal({
			text: 'Ingrese un email valido, ej: example@example.com',
			confirmButtonText: "Ok",
			allowOutsideClick: false,
			showConfirmButton: true,
			allowEscapeKey: false,
			allowOutsideClick: false,
			type: 'error'
		});
		$('.emailAltaUser').val("");
		return false;
	}

	var numberTelefono = normalizePhoneNumberInput($(".phoneNumber").val());
	$(".phoneNumber").val(numberTelefono);

	var numberDocument = normalizePhoneNumberInput($(".documentNumber").val());
	$(".documentNumber").val(numberDocument);

	if (numberTelefono == "" || numberDocument == "") {
		swal({
			text: 'Ingrese datos validos',
			confirmButtonText: "Ok",
			allowOutsideClick: false,
			showConfirmButton: false,
			allowEscapeKey: false,
			allowOutsideClick: false,
			type: 'error'
		});
		return false;
	}

	if (!$('.form-registro input[name="terminos_condiciones"]').is(':checked')) {
		swal({
			text: 'Debes aceptar los términos y condiciones para continuar.',
			confirmButtonText: "Ok",
			allowOutsideClick: false,
			showConfirmButton: true,
			allowEscapeKey: false,
			allowOutsideClick: false,
			type: 'error'
		});
		return false;
	}

	var dato = $('.form-registro').serialize();

	swal({
		imageUrl: 'gfx/ajax-loader.gif',
		imageSize: '80x80',
		allowOutsideClick: false,
		showConfirmButton: false,
		allowEscapeKey: false,
		allowOutsideClick: false
	},
		$.ajax({
			url: 'registro_ajax.php',
			type: 'POST',
			data: dato,
		})
			.done(function (response) {
				var jResponse = $.parseJSON(response);

				swal({
					text: jResponse.text,
					confirmButtonText: jResponse.confirmbuttontext,
					type: jResponse.type,
					confirmButtonClass: jResponse.confirmbuttonclass,
					allowEscapeKey: false,
					allowOutsideClick: false
				});

				// ¿Estamos en el flujo de CHECKOUT con modalRegistro?
				// (formCheckout presente + hidden "checkout" en form de registro)
				var fromCheckoutFront = (
					$('.formCheckout').length > 0 &&
					$('.form-registro').find('input[name="checkout"]').val() === '1'
				);

				var isSuccess = jResponse && jResponse.type === "success";
				var isAppShell = window.isAppShell === true;
				var isNativeWebView = !!(window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function');
				if (isAppShell && isSuccess && isNativeWebView) {
					var payloadReg = buildUserPayloadFromRegisterForm();
					var passReg = $(".form-registro input[name='password1']").val() || '';

					swal({
						imageUrl: 'gfx/ajax-loader.gif',
						text: 'Iniciando sesion...',
						imageSize: '80x80',
						allowOutsideClick: false,
						showConfirmButton: false,
						allowEscapeKey: false,
						allowOutsideClick: false
					});

					loginAppShellAfterRegister(payloadReg.email, passReg, payloadReg)
						.always(function () {
							if (typeof closeModal === 'function') closeModal('modalRegistro');
							if (typeof openModal === 'function') openModal('modalInit');
						});

					return;
				}
				if (jResponse.lcd == 1) {

					$('.btnOkAlert').off('click').on('click', function () {
						swal({
							imageUrl: 'gfx/ajax-loader.gif',
							imageSize: '80x80',
							allowOutsideClick: false,
							showConfirmButton: false,
							allowEscapeKey: false,
							allowOutsideClick: false
						});
						window.location.href = "lcd.php?action=c";
					});

					// --- NUEVO FLUJO PARA CHECKOUT (black) ---
				} else if (jResponse.checkout == 1 && fromCheckoutFront) {

					// Evento de registración para analytics
					window.dataLayer = window.dataLayer || [];
					window.dataLayer.push({
						'event': 'REGISTRACION'
					});

					$('.btnOkAlert').off('click').on('click', function () {
						// Loader mientras re-ejecutamos el checkout
						swal({
							imageUrl: 'gfx/ajax-loader.gif',
							text: 'Procesando su pedido',
							imageSize: '80x80',
							allowOutsideClick: false,
							showConfirmButton: false,
							allowEscapeKey: false,
							allowOutsideClick: false
						});

						// Marcamos al usuario como NO temporal en el front
						$('#usuario_temporal').val('0');

						// Cerramos el modal de registro
						if (typeof closeModal === 'function') {
							closeModal('modalRegistro');
						} else {
							$('#modalRegistro').hide();
						}

						// Volvemos a correr la lógica completa del checkout
						// (palitos, efectivo, Decidir/Nave, etc.)
						enviarCheckout();
					});

					// --- FLUJOS "VIEJOS" DE CHECKOUT (otros checkout / legacy) ---
				} else if (jResponse.checkout == 1 && jResponse.decidir == 1 && (jResponse.tieneDecidir == 1 || jResponse.nave == 1)) {

					localStorage.setItem("userRegister", "1");

					$('.btnOkAlert').off('click').addClass("fancyboxModalDecidir fancybox.ajax");
					$('.btnOkAlert').attr('href', 'shop_form_decidir_modal.php');
					$('.btnOkAlert').on('click', function (event) {
						swal({
							imageUrl: 'gfx/ajax-loader.gif',
							text: 'Procesando su pedido',
							imageSize: '80x80',
							allowOutsideClick: false,
							showConfirmButton: false,
							allowEscapeKey: false,
							allowOutsideClick: false
						});

						if (jResponse.nave == 1) {
							$.ajax({
								url: 'shop_form_nave_modal.php',
								method: 'GET',
								data: $('.formCheckout').serialize(),
								success: function (response) {
									$('#modal-body-nave').html(response);
									$('#modalNave').show();
									swal.close();
								},
								error: function () {
									alert("Hubo un problema al cargar el contenido.");
								}
							});
							$('.close').on('click', function () {
								$('#modalNave').hide();
							});
						} else {
							window.location.href = "shop_form_decidir_open_modal.php";
						}
					});

				} else if (jResponse.checkout == 1) {

					window.dataLayer = window.dataLayer || [];
					window.dataLayer.push({
						'event': 'REGISTRACION'
					});

					$('.btnOkAlert').off('click').on('click', function () {
						swal({
							imageUrl: 'gfx/ajax-loader.gif',
							text: 'Procesando su pedido',
							imageSize: '80x80',
							allowOutsideClick: false,
							showConfirmButton: false,
							allowEscapeKey: false,
							allowOutsideClick: false
						});
						window.location.href = "shop_concluido.php?f=2";
					});

				} else {

					$('.btnOkAlert').off('click').on('click', function () {
						swal({
							imageUrl: 'gfx/ajax-loader.gif',
							text: 'Procesando su pedido',
							imageSize: '80x80',
							allowOutsideClick: false,
							showConfirmButton: false,
							allowEscapeKey: false,
							allowOutsideClick: false
						});
						window.location.href = "shop_listado.php";
					});

					// Modificar usuario logica para refrescar
					$('.btnOkModificarAlert').off('click').on('click', function () {
						swal({
							imageUrl: 'gfx/ajax-loader.gif',
							text: 'cargando...',
							imageSize: '80x80',
							allowOutsideClick: false,
							showConfirmButton: false,
							allowEscapeKey: false,
							allowOutsideClick: false
						});

						window.location.href = jResponse.returnUrl;
					});
				}
			})
	);
}

