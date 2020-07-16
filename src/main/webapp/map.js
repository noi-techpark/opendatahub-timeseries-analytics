"use strict";


async function map_start_promise()
{
	let autorefresh_functions = []
	var disableClusteringZoomLevel = 18;
	var clusterDistance = 80;

	startAutoRefresh();

	let error_console = document.getElementById('error-console')

	var layers_container = document.getElementById('layers-container')
	var layer_template = document.getElementById('layer_template_id');
	layer_template.removeAttribute('id')
	layers_container.removeChild(layer_template)


	let selectedFeature = null;
	let hoverFeature = null;

	let mapTileURLs = [
		['OpenStreetMap', null],
		['Neighbourhood', 'https://tile.thunderforest.com/neighbourhood/{z}/{x}/{y}.png?apikey='],
		['OpenCycleMap', 'https://tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey='],
		['Transport', 'https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey='],
		['Landscape', 'https://tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey='],
		['Outdoors', 'https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey='],
		['Transport Dark', 'https://tile.thunderforest.com/transport-dark/{z}/{x}/{y}.png?apikey='],
		['Spinal Map', 'https://tile.thunderforest.com/spinal-map/{z}/{x}/{y}.png?apikey='],
		['Pioneer', 'https://tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey='],
		['Mobile Atlas', 'https://tile.thunderforest.com/mobile-atlas/{z}/{x}/{y}.png?apikey=']
	];

	let sources = [];
	let selectCountainer = document.getElementById('header').getElementsByTagName('div')[0];
	let mapSourceSelect = document.createElement('select');
	mapSourceSelect.style.display = 'none';
	selectCountainer.appendChild(mapSourceSelect);

	let mapLayer = null;

	for(let i = 0; i < mapTileURLs.length; i++) {
		if(i == 0) {
			sources[0] = new ol.source.OSM();
		} else {
			sources[sources.length] = new ol.source.OSM({
				attributions: [
					'Maps © <a href="http://www.thunderforest.com">Thunderforest</a>, Data © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
				],
				url : mapTileURLs[i][1] + env.THUNDERFOREST_MAP_API_KEY
			})
		}
		let opt = document.createElement('option');
		opt.value = i;
		opt.innerHTML = mapTileURLs[i][0];
		mapSourceSelect.appendChild(opt);
	}
	mapSourceSelect.addEventListener("change", function (ev) {
		mapLayer.setSource(sources[mapSourceSelect.selectedIndex])
	});

	mapLayer = new ol.layer.Tile({
		source : env.THUNDERFOREST_MAP_API_KEY ? sources[1] : sources[0]
	})


	let map = new ol.Map({
		target : 'map',
		layers : [ mapLayer

		],
		view : new ol.View({

			enableRotation : false, // altrimenti sballano i tile calcolati da me
			center : ol.proj.fromLonLat([ 11.34, 46.48 ]),
			// zoom iniziale mappa
			zoom : 12

		})
	});

	map.getView().on('change:resolution', function(evt){
		var view = evt.target;

		map.getLayers().getArray().map(function(layer) {
			var source = layer.getSource();
			if(layer.get('layerUseType') === 'route') {
				if (view.getZoom() >= disableClusteringZoomLevel && !layer.getVisible()) {
					layer.setVisible(true);
				} else if (view.getZoom() < disableClusteringZoomLevel && layer.getVisible()) {
					layer.setVisible(false);
				}
			}
			if (source instanceof ol.source.Cluster) {
				var distance = source.getDistance();
				if (view.getZoom() >= disableClusteringZoomLevel && distance > 0) {
					source.setDistance(0);
				}
				else if (view.getZoom() < disableClusteringZoomLevel && distance == 0) {
					source.setDistance(clusterDistance);
				}
			}
		});
	}, map);

	window.bzanalytics_map = map;


	let json = await fetchJson_promise('layers-config.json')
	let linkstationConfig = await fetchJson_promise('linkstation-config.json')

	// for groups
	/*
	    <div>
	        <div>nome gruppo</div>
	        <div > css: margin-left
	            ... layers
	        </div>
	    </div>

	 */

	for (var layer_group of json)
	{
		setupLayerGroup_promise(layer_group)

		for (var layer_info of layer_group.layers)
		{
			setupLayer_promise(layer_info, layer_group.id)
		}
	}

	setupFeatureClickPopup()

//	setupLoginForm()

	//////////////////////////////////////////////////////
	// Functions
	//////////////////////////////////////////////////////

	async function setupLayer_promise(layer_info, layer_group_id)
	{
		let layer_display = layer_template.cloneNode(true)
		layer_display.style.paddingLeft = '40px'
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


		let refresh_function = async function()
		{
			// refresh_function dovrebbe essere chiamata solo nello stato layer_selected e no layer_loading
			if (!layer_selected || layer_loading)
			{
				return;
			}
			await toggle_layer_function()

			if (layer_selected)
			{
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
				if(layer.get('routesLayer')) {
					map.removeLayer(layer.get('routesLayer'));
				}
				map.removeLayer(layer);

				// rimuovi il timer di aggiornamento automatico
				autorefresh_functions.splice(autorefresh_functions.indexOf(refresh_function),1)
			}
			else
			{
				// crea layer
				// mostrare progress di caricamento
				layer_loading = true;
				layer_selected = true;
				layer_display.classList.add('selected')

				try
				{
					switch (format)
					{
						case 'integreen':
							switch (layer_group_id){
								case "Stazioni Puntuali":
									layer = await loadIntegreenLayerPuntuali(layer_info, layer_display.querySelector('.circle-spinner'))
									break;
								case "Stazioni lineari":
									layer = await loadIntegreenLayerLineari(layer_info, layer_display.querySelector('.circle-spinner'))
									break;
								default:
									// meglio sarebbe lanciare un eccezione per bloccare l'esecuzione successiva!
									alert('Unknow layer group: ' + layer_group_id)
									break;
							}
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
					error_console.textContent = format_time() + ': ' + e;
				}
				finally
				{

					layer_loading = false;

					autorefresh_functions.push(refresh_function)
				}

			}
		}

		layer_display.addEventListener('click', toggle_layer_function)

	}

	async function setupLayerGroup_promise(layer_group)
	{
		let layer_display = layer_template.cloneNode(true)
		layer_display.querySelector('.label').classList.add('group_label')
		layer_display.querySelector('.label').textContent = layer_group.id
		layers_container.appendChild(layer_display)
	}


	function startAutoRefresh()
	{
		let now_millis = new Date().getTime()
		let next_time = 600000 - now_millis % 600000
		setTimeout(async function()
		{
			let refresh_local_copy = autorefresh_functions.slice();
			for (let i = 0; i < refresh_local_copy.length; i++)
			{
				refresh_local_copy[i]()
			}
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
			popup_overlay.setPosition()
		})

		details_close.addEventListener('click', function()
		{
			details_content.textContent  = '';
			details_title.textContent = '';
			details_container.style.display = "none";
			if (selectedFeature != null)
				selectedFeature.changed();
			selectedFeature = null;
			map.updateSize();
		})

		var popup_overlay = new ol.Overlay({
			element : popup_element,
			positioning : 'bottom-center',
			offset : [ 0, -30 ]
		})
		map.addOverlay(popup_overlay);

		popup_element.style.display = 'block'

		map.on('click', async function(e)
		{
			var features = map.getFeaturesAtPixel(e.pixel);
			if (features)
			{
				// clustered icon? simply zoom!
				if (features[0].get("features").length > 1)
				{
					let currZoom = map.getView().getZoom();
					let nextZoom = currZoom + 1;
					let nextResolution = map.getView().getResolutionForZoom(nextZoom)
					let newcenter = map.getView().calculateCenterZoom(nextResolution, features[0].getGeometry().getCoordinates());
					map.getView().setCenter(newcenter)
					map.getView().setZoom(nextZoom)
					return;
				}

				if (selectedFeature != null)
					selectedFeature.changed();
				selectedFeature = features[0].get("features")[0];
				selectedFeature.changed();

				details_content.textContent  = 'loading ...';
				details_title.textContent = '';
				details_container.style.display = 'block';
				map.updateSize();
				var coords = features[0].getGeometry().getCoordinates();

				var scode = features[0].get("features")[0].getProperties()['scode'];
				var stationType = features[0].get("features")[0].getProperties()['stationType'];
				let station_data_json = await fetchJson_promise(env.ODH_MOBILITY_API_URI + "/tree/" + stationType + "/*/latest?where=scode.eq.\"" + scode + "\"", AUTHORIZATION_TOKEN)
				if(station_data_json.data == undefined
					|| jQuery.isEmptyObject(station_data_json.data)
					|| station_data_json.data[stationType] == undefined
					|| station_data_json.data[stationType].stations == undefined
					|| jQuery.isEmptyObject(station_data_json.data[stationType].stations)){
					station_data_json = await fetchJson_promise(env.ODH_MOBILITY_API_URI + "/tree/" + stationType + "/*?where=scode.eq.\"" + scode + "\"", AUTHORIZATION_TOKEN)
				}
				var integreen_data = station_data_json.data[stationType].stations[scode];
				let layer_info = features[0].get("features")[0].getProperties()['layer_info'];
				let color = features[0].get("features")[0].getProperties()['color'];

				details_title.textContent = integreen_data['sname'];
				details_content.textContent = ''
				let index = 0;

				let createDetailsRow = function (name, value, highlited) {
					var row = document.createElement('div')
					row.className = "valuesDiv"
					row.style = "display:flex;"
					var nameDiv = document.createElement('div')
					nameDiv.textContent = name.toUpperCase();
					nameDiv.className = "details-name"
					row.appendChild(nameDiv);
					var valueDiv = document.createElement('div')
					var valueText = value + "";
					valueDiv.textContent = valueText.toUpperCase();
					valueDiv.className = "details-value"
					row.appendChild(valueDiv);

					if(highlited){
						nameDiv.style = "color: " + color + "; font-size: 20px; font-weight: 500; margin-bottom: 20px; padding-top: 5px;";
						valueDiv.style = "background-color: " + color + "; color: #FFFFFF; font-size: 18px; font-weight: 500;margin-bottom: 20px; padding-left: 20px; padding-right: 20px; padding-top: 5px; padding-bottom: 5px; border-radius: 5px;";
					}

					details_content.appendChild(row)
				}
				createDetailsRow('code', integreen_data['scode'], true);
				createDetailsRow('name', integreen_data['sname'], false);
				if(!!integreen_data['scoordinate']) {
					createDetailsRow('latitude', integreen_data['scoordinate']['x'], false);
					createDetailsRow('longitude', integreen_data['scoordinate']['y'], false);
					createDetailsRow('COORDINATEREFERENCESYSTEM', integreen_data['scoordinate']['srid'], false);
				}
				createDetailsRow('origin', integreen_data['sorigin'], false);
				createDetailsRow('type', integreen_data['stype'], false);
				for (var name in integreen_data['smetadata']) {
					if(name != 'coordinates') {
						createDetailsRow(name, integreen_data['smetadata'][name], false);
					}
				}




				let valuesDiv = document.createElement('div')
				details_content.appendChild(valuesDiv)
				let mainValuesDiv = document.createElement('div')
				let moreValuesDiv = document.createElement('div')
				moreValuesDiv.style.display ='none';

				try
				{
					let json_datatypes = Object.values(integreen_data.sdatatypes)
					if(json_datatypes === undefined) {
						valuesDiv.textContent = 'Error! Not authorized?';
					}

					for (var dt = 0; dt < json_datatypes.length; dt++)
					{
						let value_datatype = json_datatypes[dt];
						let value_datatype_messurments = value_datatype.tmeasurements;

						if(value_datatype_messurments !== undefined)
							for (var dtm = 0; dtm < value_datatype_messurments.length; dtm++) {
								let value_datatype_messurment = value_datatype_messurments[dtm];
								let currentValuesDiv = moreValuesDiv;
								for (let mDi = 0; mDi < layer_info['main-data'].length; mDi++) {
									let mainData = layer_info['main-data'][mDi];
									if (value_datatype.tname == mainData[0] && (mainData[1] == null || value_datatype_messurment.mperiod == mainData[1])) {
										currentValuesDiv = mainValuesDiv;
										break;
									}
								}
								let row = document.createElement('div')
								row.className = "details-valueItem1"
								currentValuesDiv.appendChild(row)
								let rowAlink = document.createElement('a')
								let rowText = value_datatype_messurment.mvalue + ' ' + value_datatype.tname + ' [' + value_datatype_messurment.mperiod + ']'
								rowAlink.textContent = rowText.toUpperCase()
								let state = {
									active_tab: 0,
									height: "400px",
									auto_refresh: false,
									scale: {
										from: new Date(new Date(value_datatype_messurment.mvalidtime).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
										to: new Date(value_datatype_messurment.mvalidtime).toISOString().split('T')[0]
									},
									graphs: [
										{
											category: layer_info.id,
											station: integreen_data.scode,
											station_name: integreen_data.sname,
											data_type: value_datatype.tname,
											unit: value_datatype.tunit,
											period: value_datatype_messurment.mperiod,
											yaxis: 1,
											color: 3
										}
									]
								};
								rowAlink.href = location.origin + location.pathname + "#" + encodeURI(JSON.stringify(state))
								rowAlink.target = '_blank'
								row.appendChild(rowAlink)
								let row2 = document.createElement('div')
								row2.textContent = ' (' + new Date(value_datatype_messurment.mvalidtime).toLocaleString() + ')'
								row2.className = "details-valueItem2"
								currentValuesDiv.appendChild(row2)
							}
						else {
							let row = document.createElement('div')
							row.className = "details-valueItem1"
							let rowText = value_datatype.tname
							row.textContent = rowText.toUpperCase()
							moreValuesDiv.appendChild(row)
							let row2 = document.createElement('div')
							row2.textContent = 'Error! Not authorized?'
							row2.className = "details-valueItem2"
							moreValuesDiv.appendChild(row2)

						}
					}
					valuesDiv.textContent = ''
					valuesDiv.appendChild(mainValuesDiv)
					valuesDiv.appendChild(moreValuesDiv)
					if(mainValuesDiv.childElementCount > 0)
					{
						let moreButton = document.createElement('button')
						moreButton.textContent =  'more'
						valuesDiv.appendChild(moreButton)

						moreButton.addEventListener('click', function(e) {
							moreValuesDiv.style.display = ''
							moreButton.style.display = 'none'
						})
					} else
					{
						moreValuesDiv.style.display ='';
					}
				}
				catch (e)
				{
					console.log(e)
					valuesDiv.textContent = 'Error! Not authorized?';
				}

			}
			else
			{
				popup_overlay.setPosition()
			}
		});

		map.on('pointermove', function(e) {
			let preHoverFeature = hoverFeature;
			hoverFeature = null;

			map.forEachFeatureAtPixel(e.pixel, function(f) {
				hoverFeature = f;
				return true;
			});

			if(hoverFeature == null && preHoverFeature != null) {
				preHoverFeature.changed();
			}

			if(hoverFeature != null && hoverFeature != preHoverFeature) {
				hoverFeature.changed();
			}
		});

	}

	async function loadIntegreenLayerPuntuali(layer_info, progressbar_line)
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
						scale: 0.6
					})
				});

				var cluserStyle = new ol.style.Style({
					image: new ol.style.Icon({
						anchor: [-50, +320],
						anchorXUnits: 'pixels',
						anchorYUnits: 'pixels',
						opacity: 1,
						src: 'icons/value-circle/cluster.svg',
						scale: 0.20
					})
				});

				var selectedStyle = new ol.style.Style({
					image: new ol.style.Icon({
						anchor: [0.5, 0.85],
						anchorXUnits: 'fraction',
						anchorYUnits: 'fraction',
						opacity: 1,
						src: 'icons/Schatten.svg',
						scale: 0.6
					})
				});
				var overlappingCenterCircleStyle = new ol.style.Style({
					image: new ol.style.Circle({
						radius: 7, fill: new ol.style.Fill({color:[255,255,255,1]}), stroke: new ol.style.Stroke({color: layer_info.color})
					})
				});

				var sourcevector = new ol.source.Vector({});

				var clusterSource = new ol.source.Cluster({
					distance: map.getView().getZoom() < disableClusteringZoomLevel? clusterDistance: 0,
					source: sourcevector
				});

				let layer = new ol.layer.Vector({
					visible : true,
					source : clusterSource,
					style: function(list)
					{
						let features = list.get('features')
						let iconStyle = features[0].get('iconStyle');
						let valueStyle = features[0].get('valueStyle');
						if (features.length == 1)
						{
							if (selectedFeature != null && selectedFeature === features[0])
								return [selectedStyle, iconStyle, valueStyle]
							else
								return [iconStyle, valueStyle]
						}
						else
							return [iconStyle, cluserStyle]
					}
				})

				let layerRouteSourcevector = new ol.source.Vector({});
				let layerRoute = new ol.layer.Vector({
					source: layerRouteSourcevector,
					style: [
						new ol.style.Style({
							stroke: new ol.style.Stroke({
								width: 3,
								color: layer_info.color
								//lineDash: [1, 5]
							}),
						})
					],
					layerUseType: 'route',
					updateWhileAnimating: true
				});

				map.addLayer(layerRoute)
				map.addLayer(layer)
				layer.set('routesLayer', layerRoute)
				if(map.getView().getZoom() < disableClusteringZoomLevel) {
					layerRoute.setVisible(false);
				}

				progressbar_line.style.display = "block";

				let json_stations_flat = await fetchJson_promise(env.ODH_MOBILITY_API_URI + "/flat/" + encodeURIComponent(layer_info.stationType) +
					"/?limit=-1&distinct=true&select=scoordinate%2Cscode&where=sactive.eq.true",
					AUTHORIZATION_TOKEN, progressbar_line)
				let json_stations_status = {};
				if(layer_info.icons.length > 1) {
					let datatype_period_duplicates = {};
					let query_where_datatypes = "";
					for(let i = 1; i < layer_info.icons.length; i++) {
						let key = layer_info.icons[i][1] + ";" + layer_info.icons[i][2];
						if(!datatype_period_duplicates[key]) {
							datatype_period_duplicates[key] = true;
							let query_datatype = "and(mperiod.eq." + layer_info.icons[i][2] + ",tname.eq.\"" + layer_info.icons[i][1].replace(/(['"\\])/g, "\\$1") + "\")";
							query_where_datatypes += (query_where_datatypes === ""? "or(": ",") + query_datatype;
						}
					}
					query_where_datatypes += ")";
					let json_stations_status_result = await fetchJson_promise(
						env.ODH_MOBILITY_API_URI +
						"/tree" +
						"/" + encodeURIComponent(layer_info.stationType)
						+ "/*/latest" +
						"?limit=-1" +
						"&distinct=true" +
						"&select=tmeasurements" +
						"&showNull=true" +
						"&where=sactive.eq.true," + encodeURIComponent(query_where_datatypes),
						AUTHORIZATION_TOKEN, progressbar_line)
					json_stations_status = json_stations_status_result.data[layer_info.stationType]? json_stations_status_result.data[layer_info.stationType].stations: {};
				}


				let overlapping_points = {};
				let overlapping_groups = [];
				let overlapping_star_features = [];
				let allFeatures = [];

				for (var i = 0; i < json_stations_flat.data.length; i++)
				{

					//progressbar_line.style.width = '' + ((i+1)*100/json_stations.length) + '%'

					let lat = json_stations_flat.data[i].scoordinate? json_stations_flat.data[i].scoordinate.y: 0;
					let lon = json_stations_flat.data[i].scoordinate? json_stations_flat.data[i].scoordinate.x: 0;

					if (!lat || !lon)
					{
						// skip if lat or lon is undefined, otherwise all the markers on the layer will not show!
						continue;
					}

					let key = layer_info.scode + lat + '-' + lon;
					var thing = new ol.geom.Point(ol.proj.transform([lon, lat], layer_info.projection, 'EPSG:3857'));

					var featurething = new ol.Feature({
						geometry : thing,
						stationType: layer_info.stationType,
						scode: json_stations_flat.data[i].scode,
						'layer_info': layer_info
					});
					featurething.setId(json_stations_flat.data[i].scode);

					if (overlapping_points[key] != undefined)
					{
						if(overlapping_points[key][1] == -1) {
							let overlappingIndex = overlapping_groups.length;
							overlapping_points[key][1] = overlappingIndex;
							overlapping_groups[overlappingIndex] = [overlapping_points[key][0]];
							overlapping_star_features[overlappingIndex] = [overlapping_points[key][2]];
						}
						let overlappingIndex = overlapping_points[key][1];
						overlapping_groups[overlappingIndex].push(i);
						overlapping_star_features[overlappingIndex].push(featurething);
					} else {
						overlapping_points[key] = [i, -1, featurething];
					}




					var icona = 'transparent.svg';


					if(json_stations_status[json_stations_flat.data[i].scode]) {
						for (var ic = 1; ic < layer_info.icons.length; ic++) {
							// if (ic == 1)
							// 	icona = 'black.svg'
							try {
								var cond = layer_info.icons[ic]
								let json_value = json_stations_status[json_stations_flat.data[i].scode].sdatatypes[cond[1]];
								if (json_value)
									for (let jc = 0; jc < json_value.tmeasurements.length; jc++) {
										if (json_value.tmeasurements[jc].mperiod == cond[2]) {
											let valore_attuale = json_value.tmeasurements[jc].mvalue;
											let timestamp = json_value.tmeasurements[jc].mvalidtime;
											if (cond[3] <= valore_attuale && valore_attuale < cond[4]) {
//												if (new Date(timestamp).getTime() < new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
//													icona = 'gray.svg'
//												else
												icona = cond[0];
												break;
											}
										}
									}
							} catch (e) {
								console.log(e)
							}
						}
					}


					var valueStyle = new ol.style.Style({
						image: new ol.style.Icon({
							anchor: [-50, +320],
							anchorXUnits: 'pixels',
							anchorYUnits: 'pixels',
							opacity: 1,
							src: 'icons/value-circle/' + icona,
							scale: 0.20
						})
					});

					featurething.setProperties({'iconStyle': iconStyle, 'valueStyle': valueStyle, 'color': layer_info.color})

					allFeatures.push(featurething);
				}
				for (var i = 0; i < overlapping_star_features.length; i++)
				{
					let coordinates = overlapping_star_features[i][0].getGeometry().flatCoordinates;
					let points = generatePointsCircle(overlapping_star_features[i].length, coordinates);

					let overlapping_star_feature = new ol.Feature({
						geometry : new ol.geom.Point(coordinates)
					});
					overlapping_star_feature.setStyle(overlappingCenterCircleStyle);
					layerRouteSourcevector.addFeature(overlapping_star_feature);

					let multiLineString = new ol.geom.MultiLineString([])
					layerRouteSourcevector.addFeature(new ol.Feature({ geometry: multiLineString }));


					multiLineString.setCoordinates([]);

					for(let j = 0; j < overlapping_star_features[i].length; j++) {
						let f = overlapping_star_features[i][j];
						let fPoints = points[j];

						multiLineString.appendLineString(
							new ol.geom.LineString([coordinates, fPoints])
						);
						f.setGeometry(new ol.geom.Point(fPoints));
					}

				}
				sourcevector.addFeatures(allFeatures);

				progressbar_line.style.display = "none";
				ok(layer)
			}
			catch(e)
			{
				fail(e)
			}
		})

	}

	async function loadIntegreenLayerLineari(layer_info, progressbar_line)
	{
		return new Promise(async function(ok,fail)
		{
			try {

				var sourcevector = new ol.source.Vector({
					wrapX: false
				});

				let parseColor = function (color) {
					let m = color.match(/^#([0-9a-f]{3})$/i);
					if( m) {
						m = m[0];
						return [
							parseInt(m.charAt(1),16)*0x11,
							parseInt(m.charAt(2),16)*0x11,
							parseInt(m.charAt(3),16)*0x11
						];
					}

					m = color.match(/^#([0-9a-f]{6})$/i);
					if( m) {
						m = m[0];
						return [
							parseInt(m.substr(1,2),16),
							parseInt(m.substr(3,2),16),
							parseInt(m.substr(5,2),16)
						];
					}

					m = color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
					if( m) {
						return [m[1],m[2],m[3]];
					}

					return [0, 0, 0];
				}

				var layer = new ol.layer.Vector({
					source: sourcevector,
					style: function(list) {
						let features = list.get('features')
						let condColor = features[0].get('condColor');
						if (selectedFeature != null && selectedFeature.getId() === features[0].getId())
							return [
								new ol.style.Style({
									stroke: new ol.style.Stroke({
										color: "#000000",
										width: 5
									}),
									zIndex: 101
								}),
								new ol.style.Style({
									stroke: new ol.style.Stroke({
										color: condColor,
										width: 3
									}),
									zIndex: 102
								})
							]
						else if (hoverFeature != null && hoverFeature.getId() === features[0].getId())
							return [
								new ol.style.Style({
									stroke: new ol.style.Stroke({
										color: '#000000',
										width: 5
									}),
									zIndex: 103
								}),
								new ol.style.Style({
									stroke: new ol.style.Stroke({
										color: condColor,
										width: 3
									}),
									zIndex: 104
								})
							]
						else
							return [
								new ol.style.Style({
									stroke: new ol.style.Stroke({
										color: condColor,
										width: 3
									}),
									zIndex: 100
								})
							]
					}
				});

				map.addLayer(layer)


				progressbar_line.style.display = "block";


				let json_stations_flat = await fetchJson_promise(env.ODH_MOBILITY_API_URI + "/flat/" + encodeURIComponent(layer_info.stationType) +
					"/?limit=-1&distinct=true&select=smetadata.coordinates%2Cscode&where=sactive.eq.false",
					AUTHORIZATION_TOKEN, progressbar_line);

				let json_stations_status = {};
				let datatype_period_duplicates = {};
				let query_where_datatypes = "";
				$.each(linkstationConfig, function (configI, config) {
					for (let i = 1; i < config.length; i++) {
						let key = config[i][1];
						if (!datatype_period_duplicates[key]) {
							datatype_period_duplicates[key] = true;
							let query_datatype = "and(tname.eq.\"" + config[i][1].replace(/(['"\\])/g, "\\$1") + "\")";
							query_where_datatypes += (query_where_datatypes === "" ? "or(" : ",") + query_datatype;
						}
					}
				});
				query_where_datatypes += ")";
				let json_stations_status_result = await fetchJson_promise(env.ODH_MOBILITY_API_URI +
					"/tree" +
					"/" + encodeURIComponent(layer_info.stationType)
					+ "/*/latest" +
					"?limit=-1" +
					"&distinct=true" +
					"&select=tmeasurements" +
					"&where=sactive.eq.false," + encodeURIComponent(query_where_datatypes),
					AUTHORIZATION_TOKEN, progressbar_line)
				json_stations_status = json_stations_status_result.data[layer_info.stationType] ? json_stations_status_result.data[layer_info.stationType].stations : {};

				let allFeatures = [];

				for (var i = 0; i < json_stations_flat.data.length; i++) {
					if (!json_stations_flat.data[i]['smetadata.coordinates'])
						continue;

					let coordinates = json_stations_flat.data[i]['smetadata.coordinates'];

					let points = [];
					for (let ci = 0; ci < coordinates.length; ci++) {
						points.push(ol.proj.fromLonLat([coordinates[ci].lat, coordinates[ci].lon]))
					}

					var featurething = new ol.Feature({
						geometry: new ol.geom.LineString(points),
						stationType: layer_info.stationType,
						scode: json_stations_flat.data[i].scode,
						'layer_info': layer_info
					});
					featurething.setId(json_stations_flat.data[i].scode);
					featurething.set('features', [featurething]);

					var condColor = '#808080';

					let conditions = linkstationConfig[json_stations_flat.data[i].scode];

					if(conditions && json_stations_status[json_stations_flat.data[i].scode]) {
						for (var ic = 0; ic < conditions.length; ic++) {
							try {
								var cond = conditions[ic]
								let json_value = json_stations_status[json_stations_flat.data[i].scode].sdatatypes[cond[1]];
								if (json_value)
									for (let jc = 0; jc < json_value.tmeasurements.length; jc++) {
										if (json_value.tmeasurements[jc].mperiod == cond[2]) {
											let valore_attuale = json_value.tmeasurements[jc].mvalue;
											let timestamp = json_value.tmeasurements[jc].mvalidtime;
											if (cond[3] <= valore_attuale && valore_attuale < cond[4]) {
//												if (new Date(timestamp).getTime() < new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
//													condColor = '#808080';
//												else
												condColor = cond[0];
												break;
											}
										}
									}
							} catch (e) {
								console.log(e)
							}
						}
					}


					featurething.setProperties({'condColor': condColor, 'color': layer_info.color})

					allFeatures.push(featurething);
				}
				sourcevector.addFeatures(allFeatures);

				progressbar_line.style.display = "none";
				ok(layer)
			}
			catch(e)
			{
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

	function fetchJson_promise(url, authorization_header, spinnerItem)
	{
		return new Promise(function(success, fail)
		{
			var xhttp = new XMLHttpRequest()
			xhttp.open("GET", url , true);
			if(authorization_header) {
				xhttp.setRequestHeader("Authorization", authorization_header);
			}
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
						if(spinnerItem) {
							spinnerItem.style.display = "none";
						}
						fail(url + ': ' + xhttp.status)
					}
				}
			}
			xhttp.send();
		})
	}

	function fetchJsonLogin_promise(url, params)
	{
		return new Promise(function(success, fail)
		{
			var xhttp = new XMLHttpRequest();
			xhttp.open("POST", url , true);
			xhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

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
						fail(url + ': ' + xhttp.status)
					}
				}
			}
			xhttp.send(params);
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

}


function showMapOverview()
{
	document.getElementById('section_gfx').style.display='none';
	if (document.getElementById("gfx_data_cursor_pane")) {
		document.getElementById("gfx_data_cursor_pane").style.display='none';
	}
	if (document.getElementById("gfx_data_cursor_mark")) {
		document.getElementById("gfx_data_cursor_mark").style.display='none';
	}
	document.getElementById('section_map').style.display='flex';
	bzanalytics_map.updateSize();
	document.getElementById('headline').style.color='#919499';
	document.getElementById('map_overview').style.color='#FFFFFF';
}


function showCharts()
{
	document.getElementById('section_gfx').style.display='block';
	document.getElementById('section_map').style.display='none';
	document.getElementById('headline').style.color='#FFFFFF';
	document.getElementById('map_overview').style.color='#919499';
}

function generatePointsCircle(count, centerCoords) {
	var
		separation = 30,
		twoPi = Math.PI * 2,
		start_angle = twoPi / 12,
		circumference = separation * (2 + count),
		legLength = circumference / twoPi,  //radius from circumference
		angleStep = twoPi / count,
		res = [],
		i, angle;
	res.length = count;

	for (i = count - 1; i >= 0; i--) {
		angle = start_angle + i * angleStep;
		res[i] = [
			centerCoords[0] + legLength * Math.cos(angle),
			centerCoords[1] + legLength * Math.sin(angle)
		];
	}
	return res;
}