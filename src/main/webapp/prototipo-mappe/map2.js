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
   

   let json = await fetchJson_promise('layers-config.json')
   // console.log(json)
   
   for (var layer_info of json)
   {
      setupLayer_promise(layer_info)
   }
   
   setupFeatureClickPopup()
   
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
            layer_display.querySelector('.icon').src = layer_info.icons[0]
            break;
         default:
            layer_display.querySelector('.icon').src = layer_info.icon
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
               error_console.textContent = new Date().toLocaleString() + ': ' + e;
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

      popup_close.addEventListener('click', function()
      {
         popup_overlay.setPosition() // nascondi il popup passando una posizione undefined
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
             var coords = features[0].getGeometry().getCoordinates();
             // var hdms = coordinate.toStringHDMS(proj.toLonLat(coords));
             var integreen_data = features[0].getProperties()['integreen_data'];
             popup_title.textContent   = integreen_data['name'];
             popup_content.textContent = '' 
             for (var name in integreen_data) 
             {
                if (integreen_data.hasOwnProperty(name) && ['_t', 'data_types'].indexOf(name) < 0) 
                {
                   var row = document.createElement('div')
                   row.textContent = name + ': ' + integreen_data[name]
                   popup_content.appendChild(row)
                }
             }
             var row = document.createElement('div')
             row.textContent = '---'
             popup_content.appendChild(row)
             
             var data_types = integreen_data['data_types']
             for (var dt = 0; dt < data_types.length; dt++)
             {
                var row = document.createElement('div')
                var value_struct = data_types[dt]['newest_record']
                var data_type_struct = data_types[dt]['data_type']
                row.textContent = value_struct['value'] + ' ' + data_type_struct[0] + ' [' + data_type_struct[3] + ']' + ' (' + new Date(value_struct['timestamp']).toLocaleString() + ')'
                popup_content.appendChild(row)
             }
             
             popup_overlay.setPosition(coords);
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
                 src: layer_info.icons[0],
                 scale: 0.5
               })
             });
             
             var shadowStyle = new ol.style.Style({
                image: new ol.style.Icon({
                  anchor: [0.3, 1.0],
                  anchorXUnits: 'fraction',
                  anchorYUnits: 'fraction',
                  opacity: 1,
                  src: 'marker-shadow.png',
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
                //   break;
                
                
                progressbar_line.style.width = '' + ((i+1)*100/json_stations.length) + 'px'
                
                var thing = new ol.geom.Point(ol.proj.transform([json_stations[i].longitude, json_stations[i].latitude], layer_info.projection, 'EPSG:3857'));
                
                var featurething = new ol.Feature({
                   // name: "Thing",
                   geometry : thing,
                   integreen_data: json_stations[i]
                });
                
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
                              src: cond[0],
                              scale: 0.5
                            })
                          });
                          featurething.setStyle([shadowStyle, iconStyle])
                      }
                   }
                   
                }
                
                sourcevector.addFeature(featurething);
             }
             
             layer.setSource(sourcevector)
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
}