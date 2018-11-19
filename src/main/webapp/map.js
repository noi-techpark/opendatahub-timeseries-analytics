"use strict";


async function map_start_promise()
{
	let autorefresh_functions = []
	
	startAutoRefresh();
	
	let error_console = document.getElementById('error-console')
	
	var layers_container = document.getElementById('layers-container')
	var layer_template = document.getElementById('layer_template_id');
	layer_template.removeAttribute('id')
	layers_container.removeChild(layer_template)
	
	
	let map = new ol.Map({
			target : 'map',
			layers : [ new ol.layer.Tile({
				source : new ol.source.OSM()
			})

			],
			view : new ol.View({

				enableRotation : false, // altrimenti sballano i tile calcolati da me
				center : ol.proj.fromLonLat([ 11.34, 46.48 ]),
				// zoom iniziale mappa
				zoom : 12

			})
		});
	
	window.bzanalytics_map = map;
	

	let json = await fetchJson_promise('layers-config.json')
	// console.log(json)
	
	for (var layer_info of json)
	{
		setupLayer_promise(layer_info)
	}
	
	setupFeatureClickPopup()
	
	setupLoginForm()
	
	//////////////////////////////////////////////////////
	// Functions
	//////////////////////////////////////////////////////
	
	async function setupLayer_promise(layer_info)
	{
		// console.log(layer_info)
		let layer_display = layer_template.cloneNode(true)
		layer_display.querySelector('.label').textContent = layer_info.id
		layers_container.appendChild(layer_display)
		
		let format = layer_info.format
		
		switch (format)
		{
			case 'integreen':
				layer_display.querySelector('.icon').src = 'icons/01_Icons_navi/' + layer_info.icons[0]
				break;
			default:
				layer_display.querySelector('.icon').src = 'icons/01_Icons_navi/' + layer_info.icon
				break;
		}
				
		
		let layer_selected = false;
		let layer_loading = false;
		
		var layer = null;
		
		let spinner = layer_display.querySelector('.spinner')
		
		let refresh_function = async function()
		{
			// refresh_function dovrebbe essere chiamata solo nello stato layer_selected e no layer_loading
			if (!layer_selected || layer_loading)
			{
				console.log('caso che non dovrebbe succedere 1!');
				return;
			}
			await toggle_layer_function()
			
			if (layer_selected)
			{
				console.log('caso che non dovrebbe succedere 2!');
				return;
			}
			
			await toggle_layer_function()
		}
		
		let toggle_layer_function = async function()
		{
			// se il layer sta caricando ignora il click
			if (layer_loading)
				return;
			
			if (layer_selected)
			{
				// spegni layer
				layer_selected = false;
				layer_display.classList.remove('selected')
				map.removeLayer(layer);
				
				// rimuovi il timer di aggiornamento automatico
				autorefresh_functions.splice(autorefresh_functions.indexOf(refresh_function),1)
			}
			else
			{
				// crea layer
				// mostrare progress di caricamento
				layer_loading = true;
				spinner.classList.add('loading')
				layer_selected = true;
				layer_display.classList.add('selected')
				
				try
				{
					switch (format)
					{
						case 'integreen':
							layer = await loadIntegreenLayer(layer_info, layer_display.querySelector('.progressbar_line'))
							break;
						case 'wms':
							layer = await loadWMSLayer(layer_info)
							break;
						default:
							// meglio sarebbe lanciare un eccezione per bloccare l'esecuzione successiva!
							alert('Unknow format: ' + format)
							break;
					}
				}
				catch (e)
				{
					console.log(e)
					// Raven.captureException(e)
					error_console.textContent = format_time() + ': ' + e;
				}
				finally
				{
					// spegnere progress di caricamento
					
					layer_loading = false;
					spinner.classList.remove('loading')
					
					// aggiungi al timer di aggiornamento automatico!
					autorefresh_functions.push(refresh_function)
				}
				
			}
	}
		
		layer_display.addEventListener('click', toggle_layer_function)
		spinner.addEventListener('click', refresh_function)
			
	}
	
	
	function startAutoRefresh()
	{
		let now_millis = new Date().getTime()
		let next_time = 600000 - now_millis % 600000 
		setTimeout(async function()
		{
			let refresh_local_copy = autorefresh_functions.slice();
			console.log('refresh automatico1 ' + autorefresh_functions.length)
			for (let i = 0; i < refresh_local_copy.length; i++)
			{
				console.log(i)
				refresh_local_copy[i]()
			}
			console.log('refresh automatico2')
			startAutoRefresh()
		}, next_time)
	}
	
	function setupFeatureClickPopup()
	{
		var popup_element = document.getElementById('map-popup');
		var popup_close = document.getElementById('map-popup-close');
		var popup_content = document.getElementById('map-popup-content');
		var popup_title = document.getElementById('map-popup-title');
		
		var details_close = document.getElementById('details-close');
		var details_content = document.getElementById('details-content');
		var details_title = document.getElementById('details-title');
		var details_container = document.getElementById('details-container');
		details_container.style.display = "none";

		popup_close.addEventListener('click', function()
		{
			popup_overlay.setPosition() // nascondi il popup passando una posizione undefined
		})
		
		details_close.addEventListener('click', function()
		{
			details_content.textContent  = '';
			details_title.textContent = '';
			details_container.style.display = "none";
			map.updateSize();
		})

		var popup_overlay = new ol.Overlay({
			element : popup_element,
			positioning : 'bottom-center',
			offset : [ 0, -30 ]
		})
		map.addOverlay(popup_overlay);
		
		// attiva la visualizzazione del popup nascosto durante il caricamento
		// a questo punto openlayer lo ha già nascosto
		popup_element.style.display = 'block'
			
		map.on('click', async function(e)
		{
			var features = map.getFeaturesAtPixel(e.pixel);
			console.log(features)
			if (features)
			{

				details_container.style.display = 'block';
				map.updateSize();
				var coords = features[0].getGeometry().getCoordinates();
				// var hdms = coordinate.toStringHDMS(proj.toLonLat(coords));
				var integreen_data = features[0].get("features")[0].getProperties()['integreen_data'];
				let layer_info = features[0].get("features")[0].getProperties()['layer_info'];
				//popup_title.textContent	= integreen_data['name'];
				//popup_content.textContent = '' 
				
				details_title.textContent = integreen_data['name'];
				details_content.textContent = ''
					
				for (var name in integreen_data) 
				{
					
					if (integreen_data.hasOwnProperty(name) && ['_t', 'data_types'].indexOf(name) < 0) 
					{
						var row = document.createElement('div')
						row.style = "display:flex;"
						var nameDiv = document.createElement('div')
						nameDiv.textContent = name
						nameDiv.className = "details-name"
						row.appendChild(nameDiv);
						var valueDiv = document.createElement('div')
						valueDiv.textContent = integreen_data[name]
						valueDiv.className = "details-value"
						row.appendChild(valueDiv);
						
						//popup_content.appendChild(row)
						
						details_content.appendChild(row)
					}
				}
				var row = document.createElement('div')
				row.textContent = '---'
				//popup_content.appendChild(row)
				
				details_content.appendChild(row)
			
				
				/*
				var data_types = integreen_data['data_types']
				for (var dt = 0; dt < data_types.length; dt++)
				{
					var row = document.createElement('div')
					var value_struct = data_types[dt]['newest_record']
					var data_type_struct = data_types[dt]['data_type']
					row.textContent = value_struct['value'] + ' ' + data_type_struct[0] + ' [' + data_type_struct[3] + ']' + ' (' + new Date(value_struct['timestamp']).toLocaleString() + ')'
					popup_content.appendChild(row)
				}
				*/
				
				let valuesDiv = document.createElement('div')
				valuesDiv.textContent = 'loading ...'
				//popup_content.appendChild(valuesDiv)
				
				details_content.appendChild(valuesDiv)
				
				//popup_overlay.setPosition(coords);
				
				let json_datatypes = await fetchJson_promise(layer_info.base_url + 'get-data-types?station=' + integreen_data['id'])
				
				for (var dt = 0; dt < json_datatypes.length; dt++)
				{
					console.log(json_datatypes[dt])
					let value_struct = await fetchJson_promise(layer_info.base_url + 'get-newest-record?station=' + integreen_data['id']
																									+ '&type=' + json_datatypes[dt][0]
																									+ '&period=' + json_datatypes[dt][3])
					console.log(value_struct)
					if (dt == 0)
						valuesDiv.textContent = ''
					let row = document.createElement('div')
					row.textContent = value_struct['value'] + ' ' + json_datatypes[dt][0] + ' [' + json_datatypes[dt][3] + ']' + ' (' + new Date(value_struct['timestamp']).toLocaleString() + ')'
					valuesDiv.appendChild(row)
				}
				
			}
			else
			{
				popup_overlay.setPosition() // nascondi il popup passando una posizione undefined
			}
		});
				
	}
	
	async function loadIntegreenLayer(layer_info, progressbar_line)
	{
		return new Promise(async function(ok,fail)
		{
			try
			{
				
				
				var iconStyle = new ol.style.Style({
					image: new ol.style.Icon({
					anchor: [0.5, 1.0],
					anchorXUnits: 'fraction',
					anchorYUnits: 'fraction',
					opacity: 1,
					src:  'icons/02_Icons_map/' + layer_info.icons[0],
					scale: 0.8
				    //size: [32,32]
					})
				});
				
				var shadowStyle = new ol.style.Style({
					image: new ol.style.Icon({
						anchor: [0.3, 1.0],
						anchorXUnits: 'fraction',
						anchorYUnits: 'fraction',
						opacity: 1,
						src: 'layers-icons/' + 'marker-shadow.png',
						scale: 1
					})
				});
				
				var sourcevector = new ol.source.Vector({});
				
				
				
				let layer = new ol.layer.Vector({
					title : 'meteoLayer',
					visible : true,
					source : sourcevector,
					style : [shadowStyle, iconStyle]
				})
				
				map.addLayer(layer)
				
				let json_stations = await fetchJson_promise(layer_info.base_url + 'get-station-details')
				
				for (var i = 0; i < json_stations.length; i++)
				{
					// RIMUOVERE DOPO I TEST!!!
					// if (i >= 10)
					//	break;
					
					
					progressbar_line.style.width = '' + ((i+1)*100/json_stations.length) + '%'
					
					var thing = new ol.geom.Point(ol.proj.transform([json_stations[i].longitude, json_stations[i].latitude], layer_info.projection, 'EPSG:3857'));
					
					var featurething = new ol.Feature({
						// name: "Thing",
						geometry : thing,
						integreen_data: json_stations[i],
						'layer_info': layer_info
					});
					
					/*
					// Carica i data types e gli ultimi valori
					let json_datatypes = await fetchJson_promise(layer_info.base_url + 'get-data-types?station=' + json_stations[i].id)
					
					// Arricchisci il json della stazione con i dati dei datatype ricevuti con la seconda chiamata
					json_stations[i]['data_types'] = json_datatypes
					
					for (var dt = 0; dt < json_datatypes.length; dt++)
					{
						let json_value = await fetchJson_promise(layer_info.base_url + 'get-newest-record?station=' + json_stations[i].id 
																										+ '&type=' + json_datatypes[dt][0]
																										+ '&period=' + json_datatypes[dt][3])
						let struct = {}
						struct['data_type'] = json_datatypes[dt]
						struct['newest_record'] = json_value
						json_datatypes[dt] = struct
						
						// eventualmente personalizza l'icona in base ai valori
						for (var ic = 1; ic < layer_info.icons.length; ic++)
						{
							var cond = layer_info.icons[ic]
							if (cond[1] == struct['data_type'][0] // tipo di misura esempio: "Bluetooth Count record"
								&& cond[2] == struct['data_type'][3] // intervallo di misura: 21600
								&& cond[3] <= struct['newest_record']['value'] // minimo
								&& cond[4] >  struct['newest_record']['value'] // massimo escluso
							)
							{
								var iconStyle = new ol.style.Style({
									image: new ol.style.Icon({
										anchor: [0.5, 1.0],
										anchorXUnits: 'fraction',
										anchorYUnits: 'fraction',
										opacity: 1,
										src: 'layers-icons/' + cond[0],
										scale: 0.5
									})
								});
								featurething.setStyle([shadowStyle, iconStyle])
							}
						}
						
					}
					*/

					var icona = layer_info.icons[0];

					for (var ic = 1; ic < layer_info.icons.length; ic++)
					{
						try
						{
							var cond = layer_info.icons[ic]
							let json_value = await fetchJson_promise(layer_info.base_url + 'get-newest-record?station=' + json_stations[i].id
																	+ '&type=' + cond[1]
																	+ '&period=' + cond[2]);
							console.log(json_value)
							var valore_attuale = json_value.value;
							if (cond[3] <= valore_attuale && valore_attuale < cond[4])
							{
								icona = cond[0]
								break;
							}
						}
						catch (e)
						{
							// TODO: visualizzare icona di errore!
							console.log(e)
						}
					}
					
					var iconStyle = new ol.style.Style({
						image: new ol.style.Icon({
							anchor: [0.5, 1.0],
							anchorXUnits: 'fraction',
							anchorYUnits: 'fraction',
							opacity: 1,
							src: 'icons/02_Icons_map/' + icona,
							scale: 0.5
						})
					});
					
					featurething.setStyle([shadowStyle, iconStyle])
				
					sourcevector.addFeature(featurething);
				}
				
				var clusterSource = new ol.source.Cluster({
			        distance: 40,
			        source: sourcevector
			      });
				
				layer.setSource(clusterSource)
				progressbar_line.style.width = '0px'
				ok(layer)
			}
			catch(e)
			{
				console.log(e)
				fail(e)
			}
		})
		
	}

	async function loadWMSLayer(layer_info)
	{
		return new Promise(function (ok, fail)
		{
			var sourcetile = new ol.source.TileWMS({
				url: layer_info.url ,
				serverType: 'geoserver'
			})
			
			/*
			sourcetile.on('tileloadstart', function(event) {
				console.log('immagini wms caricate!') 
			})
			*/
			
			var layer = new ol.layer.Tile({
				source: sourcetile
			})
			
			map.addLayer(layer)
			
			setTimeout(function()
			{
				ok(layer)	
			}, 500)
			
			

		})

	}
	
	function fetchJson_promise(url)
	{
		return new Promise(function(success, fail)
		{
			var xhttp = new XMLHttpRequest();
			xhttp.open("GET", url , true);
			xhttp.onreadystatechange = function(readystatechange)
			{
				if (xhttp.readyState == 4) // DONE: https://developer.mozilla.org/it/docs/Web/API/XMLHttpRequest/readyState
				{
						if (xhttp.status == 200)
						{
							var data = JSON.parse(xhttp.responseText)
							success(data)
						}
						else
						{
							console.log(xhttp.status)
							fail(url + ': ' + xhttp.status)
						}
				}
			}
			xhttp.send();
		})
	}
   // (european) date time string
	function format_time()
	{
	    const pad0 = (instr) => {
	        let str = String(instr);
	        while (str.length < 2) {
	            str = "0" + str;
	        }
	        return str;
	    };
	    let d = new Date();
	    return pad0(d.getDate())  + "/" + pad0(d.getMonth() + 1) + "/" + pad0(d.getFullYear()) + " " +
	           pad0(d.getHours()) + ":" + pad0(d.getMinutes())   + ":" + pad0(d.getSeconds());
	}
	
	function setupLoginForm()
	{
		console.log('login form')
		var form = document.getElementById('loginform');
		var loginuser = document.getElementById('loginuser')
		var loginpass = document.getElementById('loginpass')
		form.addEventListener('submit', async function(e)
		{
			e.preventDefault()
			console.log(loginuser.value)
			console.log(loginpass.value)
			try
			{
			   var resp = await fetchJson_promise('login?user=' + encodeURIComponent(loginuser.value) + '&pass=' + encodeURIComponent(loginpass.value))
			   form.style.visibility = 'hidden'
			}
			catch (e)
			{
				alert('Not autorized!')
			}
		})
	}
}


function showMapOverview()
{
	document.getElementById('section_gfx').style.display='none';
	document.getElementById('section_map').style.display='flex';
	bzanalytics_map.updateSize();
	document.getElementById('headline').style.color='#919499';
	document.getElementById('map_overview').style.color='#FFFFFF';
}


function showHeadline()
{
	document.getElementById('section_gfx').style.display='block';
	document.getElementById('section_map').style.display='none';
	bzanalytics_gfx_plot();	
	document.getElementById('headline').style.color='#919499';
	document.getElementById('map_overview').style.color='#919499';
}