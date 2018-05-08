"use strict";
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
                   fail(xhttp.status)
               }
           }
        }
        xhttp.send();
   })
}

async function map_start_promise()
{
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
      // console.log(layer_info)
      let layer_display = layer_template.cloneNode(true)
      layer_display.querySelector('.label').textContent = layer_info.id
      layers_container.appendChild(layer_display)
      
      // inizia caricamento dati (mostrare un progress?)
      let format = layer_info.format
      console.log(format)
      switch (format)
      {
         case 'integreen':
            layer_display.querySelector('.icon').src = layer_info.icons[0]
            var layer = await loadIntegreenLayer2(layer_info)
            map.addLayer(layer)
            // ok(layer)
            break;
         case 'wms':
            layer_display.querySelector('.icon').src = layer_info.icon
            layer = await loadWMSLayer(layer_info)
            //ok(layer)
            break;
         default:
            alert('Unknow format: ' + format)
            break;
      }
      
      // configureLayer(map, layer_info, layer_display)
      
   }
   
   setupFeatureClickPopup()
   
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
                row.textContent = value_struct['value'] + ' ' + data_type_struct[0] + ' [' + data_type_struct[3] + ']' + ' (' + new Date(value_struct['timestamp']).toISOString() + ')'
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
   
   function configureLayer(map, layer_info, layer_display)
   {
      let spinner = layer_display.querySelector('.spinner')
      
      let layer = null;
      
      let loading = false;
      
      var toggle_layer = async function()
      {
         if (loading)
            return;
         
         if (layer)
         {
            // rimuovi dalla lista di autoaggiornamenti!
            layer_display.classList.remove('selected')
            map.removeLayer(layer)
            layer = null;
         } 
         else
         {         
            layer_display.classList.add('selected')
            spinner.classList.add('loading')
            loading = true
            layer = await loadLayer_promise(map, layer_info)
            // vediamo se notifica la fine del rendering correttamente e sempre solo una volta
            
            layer.getSource().on('tileloadstart', function() {
               console.log('tileloadstart '  + new Date().getTime())
             });

            layer.getSource().on('tileloadend', function() {
               console.log('tileloadend')
             });
            layer.getSource().on('tileloaderror', function() {
               console.log('tileloaderror')
             });
            
            map.addLayer(layer)
            spinner.classList.remove('loading')
            loading = false
            
            console.log('click finish ' + new Date().getTime())
         }
      }
      
      layer_display.addEventListener('click', toggle_layer)
      
      spinner.addEventListener('click', async function(e)
      {
         // console.log('cliccato spinner')
         e.stopPropagation()
         // ricarica i dati deselezionando e riselezionado il layer
         await toggle_layer()
         await toggle_layer()
      })
      
   }
   
   async function loadLayer_promise(map, layer_info)
   {
      return new Promise(async function(ok, fail)
      {
         let format = layer_info.format
         let layer = null;
         switch (format)
         {
            case 'integreen':
               // loadIntegreenLayer(map, layer_info, layer_display)
               layer = await loadIntegreenLayer2(layer_info)
               ok(layer)
               break;
            case 'wms':
               layer = await loadWMSLayer(layer_info)
               ok(layer)
               break;
            default:
               alert('Unknow format: ' + format)
               break;
         }
      })
   }
   
   async function loadIntegreenLayer2(layer_info)
   {
      return new Promise(async function(ok,fail)
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
          
          let json_stations = await fetchJson_promise(layer_info.base_url + 'get-station-details')
          
          for (var i = 0; i < json.length; i++)
          {
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
                let json_value = await fetchJson_promise(layer_info.base_url + 'get-newest-record?station=' + json_stations[i].id + '&type=' + json_datatypes[dt][0])
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
             
             
             // featurething.setProperties(json_stations[i])

             sourcevector.addFeature(featurething);
          }
          
          layer.setSource(sourcevector)
          
          ok(layer)
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
         
         setTimeout(function()
         {
            ok(layer)   
         }, 500)
         
         

      })

   }
}