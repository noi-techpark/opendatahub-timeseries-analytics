function map_start()
{

   var zoom_element = document.getElementById('zoomlevel')
   var map;

   function showMap()
   {
      map = new ol.Map({
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
      
      createLayers()

      // meteoLayer()
      // bluetoothLayer()
      // parkingLayer()
      // inquinamentoLayer()
      
      // TODO provare con i tempi di percorrenza e PM10 che generano invece linee con colori diversi
      
      // non sembra invece ci siano dei parametri, quindi i parametri saranno probabilmente fissi
      
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

      map.on('click', function(e)
      {
         // overlay.setPosition();
         var features = map.getFeaturesAtPixel(e.pixel);
         if (features)
         {
            var coords = features[0].getGeometry().getCoordinates();
            // var hdms = coordinate.toStringHDMS(proj.toLonLat(coords));
            popup_title.textContent   = features[0].getProperties()['type'];
            popup_content.textContent = '' // features[0].getProperties()['value'];
            // popup_content.textContent = JSON.stringify(features[0].getProperties());
            var data = features[0].getProperties();
            for (var name in data) 
            {
               if (data.hasOwnProperty(name) && ['_t', 'geometry'].indexOf(name) < 0) 
               {
                  var row = document.createElement('div')
                  row.textContent = name + ': ' + data[name]
                  popup_content.appendChild(row)
               }
            }
            
            popup_overlay.setPosition(coords);
         }
      });
   }
   
   
   function createLayers()
   {
      var layersMetadata = [
         {
            name: 'meteo',
            icon: 'meteo-icon.png',
            createFunction: meteoLayer,
         }
         ,
         {
            name: 'bluetooth',
            icon: 'bluetooth-icon.png',
            createFunction: bluetoothLayer,
         }
         ,
         {
            name: 'inquinamento',
            icon: 'inquinamento-icon.png',
            createFunction: inquinamentoLayer,
         }
         ,
         {
            name: 'pollution_pm10',
            icon: 'icon-pm10-active.png',
            createFunction: pollution_pm10,
            zindex: 1
         }
         ,
         {
            name: 'congestione',
            icon: 'icon-journeytime-active.png',
            createFunction: congestion,
            zindex: 2
         }
      ]
      var layers_container = document.getElementById('layers-container')
      for (var l = 0; l < layersMetadata.length; l++)
      {
         var div = document.createElement('div')
         var img = document.createElement('img')
         img.src = layersMetadata[l]['icon']
         div.appendChild(img)
         var span = document.createElement('span')
         span.textContent = layersMetadata[l]['name']
         div.appendChild(span)
         
         var layer = layersMetadata[l]['createFunction']()
         if (layersMetadata[l]['zindex'])
         {
            layer.setZIndex(parseInt(layersMetadata[l]['zindex']));
         } 
         else
         {
            layer.setZIndex(1000)
         }
         
         setupToggleClick(div, layer)
         
         layers_container.appendChild(div)
         
         
         
      }
   }
   
   
   function setupToggleClick(div, layer)
   {
      var visible = false;
      function toggle()
      {
         layer.setVisible(visible);
         if (visible)
         {
            div.classList.add('visible')
         }
         else
         {
            div.classList.remove('visible')
         }
         visible = !visible
      }
      div.addEventListener('click', toggle)
      toggle();
   }
   
   
   function pollution_pm10()
   {
      var sourcevector = new ol.source.Vector({});
      
      var layer = new ol.layer.Tile({
         xextent: [-13884991, 2870341, -7455066, 6338219],
         source: new ol.source.TileWMS({
           url: 'http://geodata.integreen-life.bz.it/geoserver/edi/wms',
           params: {'LAYERS': 'edi:pollution_pm10', 'TILED': true},
           serverType: 'geoserver',
           // Countries have transparency, so do not fade tiles:
           transition: 0
         })
       })

      map.addLayer(layer)
      
      return layer;
   }
   
   function congestion()
   {
      var sourcevector = new ol.source.Vector({});
      
      var layer = new ol.layer.Tile({
         xextent: [-13884991, 2870341, -7455066, 6338219],
         source: new ol.source.TileWMS({
           url: 'http://geodata.integreen-life.bz.it/geoserver/edi/wms',
           params: {'LAYERS': 'edi:congestion', 'TILED': true},
           serverType: 'geoserver',
           // Countries have transparency, so do not fade tiles:
           transition: 0
         })
       })

      map.addLayer(layer)
      
      return layer;
   }
   
   
   function meteoLayer()
   {
      var sourcevector = new ol.source.Vector({});

      var iconStyle = new ol.style.Style({
         image: new ol.style.Icon({
           anchor: [0.5, 1.0],
           anchorXUnits: 'fraction',
           anchorYUnits: 'fraction',
           opacity: 1,
           src: 'meteo-icon.png',
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

       var layer = new ol.layer.Vector({
         title : 'meteoLayer',
         visible : true,
         source : sourcevector,
         style : [shadowStyle, iconStyle]
      })

      map.addLayer(layer)

      var xhttp = new XMLHttpRequest();
      xhttp.open('GET',
                 '../data/integreen/MeteoFrontEnd/rest/get-station-details',
                 false); // TODO: go async!
      xhttp.send()
      var json = JSON.parse(xhttp.responseText)
      

      for (var i = 0; i < json.length; i++)
      {
         var thing = new ol.geom.Point(ol.proj.transform([ json[i].longitude,
               json[i].latitude ], 'EPSG:4326', 'EPSG:3857'));
         var featurething = new ol.Feature({
            // name: "Thing",
            geometry : thing
         });
         
         featurething.setProperties(json[i])

         sourcevector.addFeature(featurething);
      }

      return layer;
   }
   
   function bluetoothLayer()
   {
      var sourcevector = new ol.source.Vector({});

      var iconStyle = new ol.style.Style({
         image: new ol.style.Icon({
           anchor: [0.5, 1.0],
           anchorXUnits: 'fraction',
           anchorYUnits: 'fraction',
           opacity: 1,
           src: 'bluetooth-icon.png',
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

       var layer = new ol.layer.Vector({
         title : 'meteoLayer',
         visible : true,
         source : sourcevector,
         style : [shadowStyle, iconStyle]
      })

      map.addLayer(layer)

      var xhttp = new XMLHttpRequest();
      xhttp.open('GET',
                 '../data/integreen/BluetoothFrontEnd/rest/get-station-details',
                 false); // TODO: go async!
      xhttp.send()
      var json = JSON.parse(xhttp.responseText)
      

      for (var i = 0; i < json.length; i++)
      {
         var thing = new ol.geom.Point(ol.proj.transform([ json[i].longitude,
               json[i].latitude ], 'EPSG:4326', 'EPSG:3857'));
         var featurething = new ol.Feature({
            // name: "Thing",
            geometry : thing
         });
         
         featurething.setProperties(json[i])

         sourcevector.addFeature(featurething);
      }

      
      return layer;
   }
   
   function inquinamentoLayer()
   {
      var sourcevector = new ol.source.Vector({});

      var iconStyle = new ol.style.Style({
         image: new ol.style.Icon({
           anchor: [0.5, 1.0],
           anchorXUnits: 'fraction',
           anchorYUnits: 'fraction',
           opacity: 1,
           src: 'inquinamento-icon.png',
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

       var layer = new ol.layer.Vector({
         title : 'meteoLayer',
         visible : true,
         source : sourcevector,
         style : [shadowStyle, iconStyle]
      })

      map.addLayer(layer)

      // TODO Temo che questa url non esiste, e viene invece interrogato il numero di parcheggi con parametri
      
      var xhttp = new XMLHttpRequest();
      xhttp.open('GET',
                 '../data/integreen/EnvironmentFrontEnd/rest/get-station-details',
                 false); // TODO: go async!
      xhttp.send()
      var json = JSON.parse(xhttp.responseText)
      

      for (var i = 0; i < json.length; i++)
      {
         var thing = new ol.geom.Point(ol.proj.transform([ json[i].longitude,
               json[i].latitude ], 'EPSG:4326', 'EPSG:3857'));
         var featurething = new ol.Feature({
            // name: "Thing",
            geometry : thing
         });
         
         featurething.setProperties(json[i])

         sourcevector.addFeature(featurething);
      }

      return layer;
     
   }

   showMap()
}
