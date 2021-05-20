"use strict";


async function map_start_promise()
{
	let autorefresh_functions = []
	let unsee_functions = []
	var disableClusteringZoomLevel = 18;
	var clusterDistance = 80;
	var clusterNumberIconsCache = {};

	startAutoRefresh();

	let error_console = document.getElementById('error-console')

	var layers_container = document.getElementById('layers-container')


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
//		thunderforest tile disabled
//		source : env.THUNDERFOREST_MAP_API_KEY ? sources[1] : sources[0]
		source : sources[0]
	})

	var filterGrayscale = new ol.filter.Colorize();
	mapLayer.addFilter(filterGrayscale);
    filterGrayscale.setFilter('grayscale');

    var filterLuminosity = new ol.filter.Colorize();
    mapLayer.addFilter(filterLuminosity);
    filterLuminosity.setFilter({ operation: 'luminosity', value: 0.75});


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
	let imageMapping = {}

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
        let group_layer_div = document.createElement('div');
        group_layer_div.style.display = 'none';
		setupLayerGroup_promise(layer_group, group_layer_div);
        layers_container.appendChild(group_layer_div);

		for (var layer_info of layer_group.layers)
		{
			setupLayer_promise(layer_info, layer_group.id, group_layer_div)
		}
	}

	let unseeAll = document.getElementById('unsee-all');
	unseeAll.addEventListener('click', function (ev) {
		for(let i = unsee_functions.length - 1; i >= 0; i--) {
			unsee_functions[i]();
		}
	});

	setupFeatureClickPopup()

//	setupLoginForm()

	//////////////////////////////////////////////////////
	// Functions
	//////////////////////////////////////////////////////

	async function setupLayer_promise(layer_info, layer_group_id, group_layer_div)
    {
        let layer_div = document.createElement('div');
        layer_div.className = 'layer-div inactive';

        let layer_div_svg = document.createElement('div');
        layer_div_svg.style.display = 'flex';
        layer_div_svg.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="27px" height="27px">' +
            '<ellipse style="fill: ' + layer_info.color + '" rx="13.5" ry="13.5" cx="13.5" cy="13.5">' +
            '</ellipse>' +
            '</svg>';
        layer_div.appendChild(layer_div_svg);

        let layer_label_div = document.createElement('div');
        layer_label_div.className = 'layer-label-div';
        layer_label_div.style.backgroundColor = layer_info.color;
        layer_div.appendChild(layer_label_div);

        let layer_label_div_span = document.createElement('span');
        layer_label_div_span.textContent = layer_info.id;
        layer_label_div.appendChild(layer_label_div_span);

        let layer_label_div_img_hide = document.createElement('img');
        layer_label_div_img_hide.className = 'img-hide';
        layer_label_div_img_hide.src = 'img/ic_hide.svg';
        layer_label_div.appendChild(layer_label_div_img_hide);

        let layer_label_div_img_loading = document.createElement('img');
        layer_label_div_img_loading.className = 'img-loading';
        layer_label_div_img_loading.src = 'img/ic_loading.svg';
        layer_label_div.appendChild(layer_label_div_img_loading);

        group_layer_div.appendChild(layer_div);

        if(layer_info.imageMapping != undefined && layer_info.imageMapping != null &&
            layer_info.imageMapping.length > 0) {
            for(let i = 0; i < layer_info.imageMapping.length; i++) {
                let imagesCall =env.ODH_MOBILITY_API_URI +
                    "/flat/" +
                    encodeURIComponent(layer_info.stationType) +
                    "/" +
                    encodeURIComponent(layer_info.imageMapping[i].dataType) +
                    "/?limit=200&offset=0&shownull=false&distinct=true&select=tmetadata";
                $.ajax({
                    url: imagesCall,
                    beforeSend: function (xhr) {
                        if(AUTHORIZATION_TOKEN) {
                            xhr.setRequestHeader("Authorization", "Bearer " + AUTHORIZATION_TOKEN);
                        }
                    },
                    success: function( images_metadata ) {
                        imageMapping[layer_info.stationType] = imageMapping[layer_info.stationType] || {};
                        imageMapping[layer_info.stationType][layer_info.imageMapping[i].dataType] =
                            images_metadata.data[0].tmetadata[layer_info.imageMapping[i].dataTypeMetadata];
                    }
                });
            }
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


        let unsee_function = async function()
        {
            // refresh_function dovrebbe essere chiamata solo nello stato layer_selected e no layer_loading
            if (!layer_selected || layer_loading)
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
                layer_div.classList.add('inactive')
                if(layer.get('routesLayer')) {
                    map.removeLayer(layer.get('routesLayer'));
                }
                map.removeLayer(layer);

                // rimuovi il timer di aggiornamento automatico
                autorefresh_functions.splice(autorefresh_functions.indexOf(refresh_function),1)
                unsee_functions.splice(unsee_functions.indexOf(unsee_function),1)
            }
            else
            {
                // crea layer
                // mostrare progress di caricamento
                layer_loading = true;
                layer_selected = true;
                layer_div.classList.remove('inactive')

                try
                {

                    let format = layer_info.format
                    switch (format)
                    {
                        case 'integreen':
                            switch (layer_group_id){
                                case "Node Layer":

                                    layer = await loadIntegreenNodeLayer(layer_info, layer_div)
                                    break;
                                case "Edge Layer":
                                    layer = await loadIntegreenEdgeLayer(layer_info, layer_div)
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
                    unsee_functions.push(unsee_function)
                }

            }
        }

        layer_div.addEventListener('click', toggle_layer_function)
    }

	async function setupLayerGroup_promise(layer_group, group_layer_div)
	{
	    let layer_div = document.createElement('div');
	    layer_div.className = 'layer-div';

        let layer_div_span = document.createElement('span');
        layer_div_span.textContent = layer_group.id;
        layer_div.appendChild(layer_div_span);

        let layer_div_img = document.createElement('img');
        layer_div_img.src = 'img/ic_arrow_down.svg';
        layer_div_img.style = 'margin-left: 28px';
        layer_div.appendChild(layer_div_img);

        layers_container.appendChild(layer_div);

        let groupVisivle = false;

        let toggle_layer_function = async function()
        {
            if(groupVisivle) {
                group_layer_div.style.display = 'none';
                groupVisivle = false;
            } else {
                group_layer_div.style.display = 'block';
                groupVisivle = true;
            }
        }

        layer_div.addEventListener('click', toggle_layer_function)
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

		var details_close = document.getElementById('details-close');
		var details_content = document.getElementById('details-content');
		var details_header = document.getElementById('details-header');
		var details_icon = document.getElementById('details-icon');
		var details_title = document.getElementById('details-title');
		var details_container = document.getElementById('details-container');

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

                let layer_info = features[0].get("features")[0].getProperties()['layer_info'];
                let color = features[0].get("features")[0].getProperties()['color'];

				details_content.textContent  = 'loading ...';
				details_title.textContent = '';
                details_header.style.backgroundColor = color;
                details_icon.src = "img/marker/icons/" + layer_info.icons[0];
                details_content.style.marginTop = details_header.clientHeight + 'px';
				details_container.style.display = 'block';
				map.updateSize();

				var scode = features[0].get("features")[0].getProperties()['scode'];
				var stationType = features[0].get("features")[0].getProperties()['stationType'];
				let station_data_json = await fetchJson_promise(env.ODH_MOBILITY_API_URI + "/tree/" + stationType + "/*/latest?where=scode.eq.\"" + scode + "\"", AUTHORIZATION_TOKEN)
				if(station_data_json.data == undefined
					|| jQuery.isEmptyObject(station_data_json.data)
					|| station_data_json.data[stationType] == undefined
					|| station_data_json.data[stationType].stations == undefined
					|| jQuery.isEmptyObject(station_data_json.data[stationType].stations)){
					station_data_json = await fetchJson_promise(env.ODH_MOBILITY_API_URI + "/tree/" + stationType + "/*?where=scode.eq.\"" + scode + "\"", AUTHORIZATION_TOKEN)
						if(station_data_json.data == undefined
							|| jQuery.isEmptyObject(station_data_json.data)
							|| station_data_json.data[stationType] == undefined
							|| station_data_json.data[stationType].stations == undefined
							|| jQuery.isEmptyObject(station_data_json.data[stationType].stations)){
							station_data_json = await fetchJson_promise(env.ODH_MOBILITY_API_URI + "/tree/" + stationType + "?where=scode.eq.\"" + scode + "\"", AUTHORIZATION_TOKEN)
						}
				}
				var integreen_data = station_data_json.data[stationType].stations[scode];

                details_title.textContent = integreen_data['sname'];
                console.log(details_header)
                details_content.style.marginTop = details_header.clientHeight + 'px';
				details_content.textContent = ''

				let createDetailsRow = function (name, value, highlited) {
					var row = document.createElement('div')
					row.className = "valuesDiv"
					row.style = "display:flex;align-items:center;"
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
                        valueDiv.className += ' highlited';
						valueDiv.style = "background-color: " + color;
					}

					details_content.appendChild(row)
				}
				createDetailsRow('code', integreen_data['scode'], true);
				createDetailsRow('name', integreen_data['sname'], false);
				if(!!integreen_data['scoordinate']) {
					createDetailsRow('latitude', integreen_data['scoordinate']['y'], false);
					createDetailsRow('longitude', integreen_data['scoordinate']['x'], false);
					createDetailsRow('EPSG', integreen_data['scoordinate']['srid'], false);
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
					if(integreen_data.sdatatypes == undefined || integreen_data.sdatatypes == null) {
						valuesDiv.textContent = 'Error! No data type available';
					} else {
						let json_datatypes = Object.values(integreen_data.sdatatypes)
						if (json_datatypes === undefined) {
							valuesDiv.textContent = 'Error! Not authorized?';
						}

						for (var dt = 0; dt < json_datatypes.length; dt++) {
							let value_datatype = json_datatypes[dt];
							let value_datatype_messurments = value_datatype.tmeasurements;

							if (value_datatype_messurments !== undefined)
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

									let mvalueSpan = document.createElement('span');
									mvalueSpan.textContent = ('' + value_datatype_messurment.mvalue).toUpperCase();
									rowAlink.appendChild(mvalueSpan)

									if (layer_info.imageMapping != undefined && layer_info.imageMapping != null &&
										layer_info.imageMapping.length > 0) {
										for (let is_i = 0; is_i < layer_info.imageMapping.length; is_i++) {
											if (value_datatype.tname == layer_info.imageMapping[is_i].dataType) {
												mvalueSpan.textContent = '';
												let value_parts = value_datatype_messurment.mvalue.split(layer_info.imageMapping[is_i].valueSeparator);
												for (let vp_i = 0; vp_i < value_parts.length; vp_i++) {
													let imgData = imageMapping[stationType][value_datatype.tname] ?
														imageMapping[stationType][value_datatype.tname].filter(function (imgData) {
															return imgData.id == value_parts[vp_i]
														}) : [];
													if (imgData.length > 0) {
														let mvaluePartImg = document.createElement('img');
														mvaluePartImg.src = 'data:image/*;base64,' + imgData[0][layer_info.imageMapping[is_i].metaDataImgData];
														mvaluePartImg.alt = imgData[0].description.it.toUpperCase();
														mvaluePartImg.title = imgData[0].description.it.toUpperCase();
														mvaluePartImg.style.height = '16px';
														mvalueSpan.appendChild(mvaluePartImg);

														let mvaluePartSpan = document.createElement('span');
														mvaluePartSpan.textContent = ' ' + imgData[0].description.it.toUpperCase();
														mvalueSpan.appendChild(mvaluePartSpan);

													} else {
														let mvaluePartSpan = document.createElement('span');
														mvaluePartSpan.textContent = value_parts[vp_i].toUpperCase();
														mvalueSpan.appendChild(mvaluePartSpan);
													}
													if (vp_i != value_parts.length - 1) {
														let mvaluePartSeparatorSpan = document.createElement('span');
														mvaluePartSeparatorSpan.textContent = '|';
														mvalueSpan.appendChild(mvaluePartSeparatorSpan);
													}
												}
											}
										}

									}

									let tnameMperiodSpan = document.createElement('span');
									let tnameMperiodText = ' ' + value_datatype.tname + ' [' + value_datatype_messurment.mperiod + ']'
									tnameMperiodSpan.textContent = tnameMperiodText.toUpperCase()
									rowAlink.appendChild(tnameMperiodSpan)

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
						if (mainValuesDiv.childElementCount > 0) {
							let moreButton = document.createElement('button')
							moreButton.textContent = 'more'
							valuesDiv.appendChild(moreButton)

							moreButton.addEventListener('click', function (e) {
								moreValuesDiv.style.display = ''
								moreButton.style.display = 'none'
							})
						} else {
							moreValuesDiv.style.display = '';
						}
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

	let raw_marker_svg = null;
	let raw_marker_selected_svg = null;
	let raw_marker_cluster_svg = null;
	let raw_marker_cluster_size_svg = null;
	let raw_marker_overlapping_marker_svg = null;
	let raw_marker_overlapping_selected_marker_svg = null;

	async function loadIntegreenNodeLayer(layer_info, loadingItem)
	{
		return new Promise(async function(ok,fail)
		{
            loadingItem.classList.add('loading');
			try
			{
				if(raw_marker_svg == null || raw_marker_svg == undefined){
					raw_marker_svg = await fetchSvg_promise('img/marker/marker.svg');
				}
				let marker_svg = raw_marker_svg.clone();
				marker_svg.find('.marker-color').css('fill', layer_info.color);

                if(raw_marker_selected_svg == null || raw_marker_selected_svg == undefined) {
					raw_marker_selected_svg = await fetchSvg_promise('img/marker/marker_selected.svg')
				}
				let marker_selected_svg = raw_marker_selected_svg.clone();
				marker_selected_svg.find('.marker-color').css('fill', layer_info.color);
				marker_selected_svg.find('.layername-label').text(layer_info.id);

				if(raw_marker_cluster_svg == null || raw_marker_cluster_svg == undefined) {
					raw_marker_cluster_svg = await fetchSvg_promise('img/marker/marker_cluster.svg');
				}
				let marker_cluster_svg = raw_marker_cluster_svg.clone();
				marker_cluster_svg.find('.marker-color').css('fill', layer_info.color);

				if(raw_marker_cluster_size_svg == null || raw_marker_cluster_size_svg == undefined) {
					raw_marker_cluster_size_svg = await fetchSvg_promise('img/marker/marker_cluster_size.svg');
				}
				let marker_cluster_size_svg = raw_marker_cluster_size_svg.clone();

				if(raw_marker_overlapping_marker_svg == null || raw_marker_overlapping_marker_svg == undefined) {
					raw_marker_overlapping_marker_svg = await fetchSvg_promise('img/marker/marker_overlapping_marker.svg')
				}
				let marker_overlapping_marker_svg = raw_marker_overlapping_marker_svg.clone();
				marker_overlapping_marker_svg.find('.marker-color').css('fill', layer_info.color);

				if(raw_marker_overlapping_selected_marker_svg == null || raw_marker_overlapping_selected_marker_svg == undefined) {
					raw_marker_overlapping_selected_marker_svg = await fetchSvg_promise('img/marker/marker_overlapping_marker_selected.svg');
				}
				let marker_overlapping_selected_marker_svg = raw_marker_overlapping_selected_marker_svg.clone();
				marker_overlapping_selected_marker_svg.find('.marker-color').css('fill', layer_info.color);
				var iconStyle = new ol.style.Style({
					image: new ol.style.Icon({
						anchor: [0.5, 27],
						anchorOrigin: 'bottom-left',
						anchorXUnits: 'fraction',
						anchorYUnits: 'pixel',
						opacity: 1,
						src:  'data:image/svg+xml;base64,' + btoa(marker_svg[0].outerHTML),
						scale: 0.6
					}),
					zIndex: 110
				});


				var shadowStyle = new ol.style.Style({
					stroke: new ol.style.Stroke({
						color: 'rgba(0,0,0,0.5)',
						width: 6
					}),
					zIndex: 112
				});

				var iconStyleSelected = new ol.style.Style({
					image: new ol.style.Icon({
						anchor: [0.5, 31],
						anchorOrigin: 'bottom-left',
						anchorXUnits: 'fraction',
						anchorYUnits: 'pixel',
						opacity: 1,
						src:  'data:image/svg+xml;base64,' + btoa(marker_selected_svg[0].outerHTML),
						scale: 0.6
					}),
					zIndex: 111
				});

				var iconStyleCluster = new ol.style.Style({
					image: new ol.style.Icon({
						anchor: [0.5, 50],
						anchorOrigin: 'bottom-left',
						anchorXUnits: 'fraction',
						anchorYUnits: 'pixel',
						opacity: 1,
						src:  'data:image/svg+xml;base64,' + btoa(marker_cluster_svg[0].outerHTML),
						scale: 0.6
					})
				});

                var iconStyleImage = new ol.style.Style({
                    image: new ol.style.Icon({
                        anchor: [0.5, +85],
                        anchorXUnits: 'fraction',
                        anchorYUnits: 'pixels',
                        opacity: 1,
                        src:  'img/marker/icons/' + layer_info.icons[0],
                        scale: 0.6
                    }),
					zIndex: 112
                });

                var iconSelectedStyleImage = new ol.style.Style({
                    image: new ol.style.Icon({
                        anchor: [0.5, +120],
                        anchorXUnits: 'fraction',
                        anchorYUnits: 'pixels',
                        opacity: 1,
                        src:  'img/marker/icons/' + layer_info.icons[0],
                        scale: 0.6
                    }),
					zIndex: 113
                });

				var iconOverlappingStyle = new ol.style.Style({
					image: new ol.style.Icon({
						anchor: [0.5, 0.5],
						anchorOrigin: 'bottom-left',
						anchorXUnits: 'fraction',
						anchorYUnits: 'fraction',
						opacity: 1,
						src:  'data:image/svg+xml;base64,' + btoa(marker_overlapping_marker_svg[0].outerHTML),
						scale: 0.6
					}),
					zIndex: 114
				});

				var iconOverlappingSelectedStyle = new ol.style.Style({
					image: new ol.style.Icon({
						anchor: [0.5, 0.5],
						anchorOrigin: 'bottom-left',
						anchorXUnits: 'fraction',
						anchorYUnits: 'fraction',
						opacity: 1,
						src:  'data:image/svg+xml;base64,' + btoa(marker_overlapping_selected_marker_svg[0].outerHTML),
						scale: 0.6
					}),
					zIndex: 115
				});

				var overlappingCenterCircleStyle = new ol.style.Style({
					image: new ol.style.Circle({
						radius: 36.5 * 0.6, fill: new ol.style.Fill({color: layer_info.color}), stroke: new ol.style.Stroke({color: layer_info.color}),
						scale: 0.6
					})
				});

				var overlappingCenterCircleImageStyle = new ol.style.Style({
					image: new ol.style.Icon({
						anchor: [0.5, 0.5],
						anchorXUnits: 'fraction',
						anchorYUnits: 'fraction',
						opacity: 1,
						src:  'img/marker/icons/' + layer_info.icons[0],
						scale: 0.6
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
							let isSelected = selectedFeature != null && selectedFeature === features[0];
							if (features[0].overlapping) {
								valueStyle.getImage().setScale(0.45);
								if (isSelected) {
									valueStyle.getImage().setAnchor([-10, +27]);
									return [shadowStyle, iconOverlappingSelectedStyle, valueStyle];
								} else {
									valueStyle.getImage().setAnchor([-10, +27]);
									return [shadowStyle, iconOverlappingStyle, valueStyle];
								}
							} else  {
								valueStyle.getImage().setScale(0.6);
								if (isSelected) {
									valueStyle.getImage().setAnchor([-40, +190]);
									return [shadowStyle, iconStyleSelected, iconSelectedStyleImage, valueStyle];
								} else {
									valueStyle.getImage().setAnchor([-20, +95]);
									return [shadowStyle, iconStyle, iconStyleImage, valueStyle];
								}
							}
						}
						else {
							if (clusterNumberIconsCache[features.length] == undefined || clusterNumberIconsCache[features.length] == null) {
								marker_cluster_size_svg.find('.cluster-size').text(features.length)
								clusterNumberIconsCache[features.length] = new ol.style.Style({
									image: new ol.style.Icon({
										anchor: [-20, +95],
										anchorXUnits: 'pixels',
										anchorYUnits: 'pixels',
										opacity: 1,
										src: 'data:image/svg+xml;base64,' + btoa(marker_cluster_size_svg[0].outerHTML),
										scale: 0.6
									})
								});
							}
							return [iconStyleCluster, clusterNumberIconsCache[features.length], iconStyleImage]
						}
					}
				})

				let hexColor = layer_info.color;
				let layerRouteSourcevector = new ol.source.Vector({});
				let layerRoute = new ol.layer.Vector({
					source: layerRouteSourcevector,
					style: [
						new ol.style.Style({
							fill: new ol.style.Fill({
								color: 'rgba(' +
									parseInt(hexColor.slice(1, 3), 16) + ',' +
									parseInt(hexColor.slice(3, 5), 16) + ',' +
									parseInt(hexColor.slice(5, 7), 16) + ',' +
									'0.3)'
							})
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

				let json_stations_flat = await fetchJson_promise(env.ODH_MOBILITY_API_URI + "/flat/" + encodeURIComponent(layer_info.stationType) +
					"/?limit=-1&distinct=true&select=scoordinate%2Cscode%2Cstype&where=sactive.eq.true" +
					(layer_info.apiWhere? "," + encodeURIComponent(layer_info.apiWhere): ""),
					AUTHORIZATION_TOKEN, loadingItem)
				let json_stations_status = {};
				if(layer_info.icons.length > 1) {
					let datatype_period_duplicates = {};
					let query_where_datatypes = "";
					for(let i = 1; i < layer_info.icons.length; i++) {
						let key = layer_info.icons[i][1] + ";" + layer_info.icons[i][2];
						if(!datatype_period_duplicates[key]) {
							datatype_period_duplicates[key] = true;
							let query_datatype = "and(mperiod.eq." + layer_info.icons[i][2] + ",tname.eq.\"" + layer_info.icons[i][1].replace(/(['"\(\)\\])/g, "\\$1") + "\")";
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
						"&where=sactive.eq.true," +
							(layer_info.apiWhere? encodeURIComponent(layer_info.apiWhere) + ",": "") +
							encodeURIComponent(query_where_datatypes),
						AUTHORIZATION_TOKEN, loadingItem)
					json_stations_status = {};
					for( let m_stype of layer_info.stationType) {
						if(json_stations_status_result.data[m_stype]) {
							json_stations_status = {...json_stations_status, ...(json_stations_status_result.data[m_stype].stations)};
						}
					}
				}


				let overlapping_points = {};
				let overlapping_groups = [];
				let overlapping_star_features = [];
				let allFeatures = [];

				for (var i = 0; i < json_stations_flat.data.length; i++)
				{

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
						stationType: json_stations_flat.data[i].stype,
						scode: json_stations_flat.data[i].scode,
						'layer_info': layer_info,
						overlapping: false
					});
					featurething.setId(json_stations_flat.data[i].scode);

					if (overlapping_points[key] != undefined)
					{
						if(overlapping_points[key][1] == -1) {
							let overlappingIndex = overlapping_groups.length;
							overlapping_points[key][1] = overlappingIndex;
							overlapping_points[key][2].overlapping = true;
							overlapping_groups[overlappingIndex] = [overlapping_points[key][0]];
							overlapping_star_features[overlappingIndex] = [overlapping_points[key][2]];
						}
						let overlappingIndex = overlapping_points[key][1];
						overlapping_groups[overlappingIndex].push(i);
						featurething.overlapping = true;
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
												if (new Date(timestamp).getTime() < new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
													icona = 'gray.svg'
												else
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
							anchor: [-20, +95],
							anchorXUnits: 'pixels',
							anchorYUnits: 'pixels',
							opacity: 1,
							src: 'img/marker/status/' + icona,
							scale: 0.6
						}),
						zIndex: 116
					});

					featurething.setProperties({'iconStyle': iconStyle, 'valueStyle': valueStyle, 'color': layer_info.color})

					allFeatures.push(featurething);
				}
				if(overlapping_star_features.length > 0) {

					for (var i = 0; i < overlapping_star_features.length; i++) {
						let coordinates = overlapping_star_features[i][0].getGeometry().flatCoordinates;
						let points = generatePointsCircle(overlapping_star_features[i].length, coordinates);

						let overlapping_star_feature = new ol.Feature({
							geometry: new ol.geom.Point(coordinates)
						});
						overlapping_star_feature.setStyle([overlappingCenterCircleStyle, overlappingCenterCircleImageStyle]);
						layerRouteSourcevector.addFeature(overlapping_star_feature);

						let coordsFrom = ol.proj.transform(coordinates, 'EPSG:3857', layer_info.projection);
						let coordsTo = ol.proj.transform(points[0], 'EPSG:3857', layer_info.projection);
						let distance = distanceBetwennCoords(coordsFrom[0], coordsFrom[1], coordsTo[0], coordsTo[1]);
						var circle = new ol.geom.Circle(coordinates, distance * 1.075);
						var CircleFeature = new ol.Feature(circle);
						layerRouteSourcevector.addFeature(CircleFeature);

						for (let j = 0; j < overlapping_star_features[i].length; j++) {
							let f = overlapping_star_features[i][j];
							let fPoints = points[j];

							f.setGeometry(new ol.geom.Point(fPoints));
						}

					}
				}
				sourcevector.addFeatures(allFeatures);

                loadingItem.classList.remove('loading');
				ok(layer)
			}
			catch(e)
			{
                loadingItem.classList.remove('loading');
				fail(e)
			}
		})

	}

	async function loadIntegreenEdgeLayer(layer_info, loadingItem)
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


                loadingItem.classList.add('loading');


				let json_stations_flat = await fetchJson_promise(env.ODH_MOBILITY_API_URI + "/flat,edge/" + encodeURIComponent(layer_info.stationType) +
					"/?limit=-1&distinct=true&select=egeometry,ecode,etype&where=eactive.eq.true" +
					(layer_info.apiWhere? "," + encodeURIComponent(layer_info.apiWhere): ""),
					AUTHORIZATION_TOKEN, loadingItem);

				let json_stations_status = {};
				let datatype_period_duplicates = {};
				let query_where_datatypes = "";
				$.each(linkstationConfig, function (configI, config) {
					for (let i = 1; i < config.length; i++) {
						let key = config[i][1];
						if (!datatype_period_duplicates[key]) {
							datatype_period_duplicates[key] = true;
							let query_datatype = "and(tname.eq.\"" + config[i][1].replace(/(['"\(\)\\])/g, "\\$1") + "\")";
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
					"&where=sactive.eq.true," +
						(layer_info.apiWhere? encodeURIComponent(layer_info.apiWhere) + ",": "") +
						encodeURIComponent(query_where_datatypes),
					AUTHORIZATION_TOKEN, loadingItem)
				json_stations_status = {};
				for( let m_stype of layer_info.stationType) {
					if(json_stations_status_result.data[m_stype]) {
						json_stations_status = {...json_stations_status, ...(json_stations_status_result.data[m_stype].stations)};
					}
				}

				let allFeatures = [];

				for (var i = 0; i < json_stations_flat.data.length; i++) {
					if (!json_stations_flat.data[i]['egeometry'] || !json_stations_flat.data[i]['egeometry'].coordinates)
						continue;

					let coordinates = json_stations_flat.data[i]['egeometry'].coordinates;

					let points = [];
					for (let ci = 0; ci < coordinates.length; ci++) {
						points.push(ol.proj.fromLonLat([coordinates[ci][0], coordinates[ci][1]]))
					}

					var featurething = new ol.Feature({
						geometry: new ol.geom.LineString(points),
						stationType: json_stations_flat.data[i].etype,
						scode: json_stations_flat.data[i].ecode,
						'layer_info': layer_info
					});
					featurething.setId(json_stations_flat.data[i].ecode);
					featurething.set('features', [featurething]);

					var condColor = '#808080';

					let conditions = linkstationConfig[json_stations_flat.data[i].ecode];

					if(conditions && json_stations_status[json_stations_flat.data[i].ecode]) {
						for (var ic = 0; ic < conditions.length; ic++) {
							try {
								var cond = conditions[ic]
								let json_value = json_stations_status[json_stations_flat.data[i].ecode].sdatatypes[cond[1]];
								if (json_value)
									for (let jc = 0; jc < json_value.tmeasurements.length; jc++) {
										if (json_value.tmeasurements[jc].mperiod == cond[2]) {
											let valore_attuale = json_value.tmeasurements[jc].mvalue;
											let timestamp = json_value.tmeasurements[jc].mvalidtime;
											if (cond[3] <= valore_attuale && valore_attuale < cond[4]) {
												if (new Date(timestamp).getTime() < new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
													condColor = '#808080';
												else
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

                loadingItem.classList.remove('loading');
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

	function fetchJson_promise(url, authorization_header, loadingItem)
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
						if(loadingItem) {
                            loadingItem.classList.remove('loading');
						}
						fail(url + ': ' + xhttp.status)
					}
				}
			}
			xhttp.send();
		})
	}

	function fetchSvg_promise(url)
	{
		return new Promise(function(success, fail)
		{
			var xhttp = new XMLHttpRequest()
			xhttp.open("GET", url , true);
			xhttp.onreadystatechange = function(readystatechange)
			{
				if (xhttp.readyState == 4) // DONE: https://developer.mozilla.org/it/docs/Web/API/XMLHttpRequest/readyState
				{
					if (xhttp.status == 200)
					{
						var data = $(xhttp.responseText).filter(function (i, el) { return $(el).is('svg') });
						success(data);
					}
					else
					{
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
	document.getElementById('headline').classList.remove("active");
	document.getElementById('map_overview').classList.add("active");
}

function showCharts()
{
	document.getElementById('section_gfx').style.display='block';
	document.getElementById('section_map').style.display='none';
    document.getElementById('map_overview').classList.remove("active");
    document.getElementById('headline').classList.add("active");
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


function distanceBetwennCoords(lat1, lon1, lat2, lon2) {
	let degreesToRadians = function(degrees) {
		return degrees * Math.PI / 180;
	}

	var earthRadiusM = 6371000;

	var dLat = degreesToRadians(lat2-lat1);
	var dLon = degreesToRadians(lon2-lon1);

	lat1 = degreesToRadians(lat1);
	lat2 = degreesToRadians(lat2);

	var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
		Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	return earthRadiusM * c;
}
