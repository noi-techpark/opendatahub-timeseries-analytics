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

      // http://analytics.mobility.bz.it/data/get_geojson?frontend=Bluetooth&amp;period=900&amp;type=Bluetooth+Count+record 

      var sourcevector = new ol.source.Vector({});

      var layer = new ol.layer.Vector({
         title : 'layer1',
         visible : true,
         source : sourcevector,
         style : new ol.style.Style({
            image : new ol.style.Circle({
               radius : 4,
               stroke : new ol.style.Stroke({
                  color : 'blue',
                  width : 1
               }),
               fill : new ol.style.Fill({
                  color : [ 0, 0, 255, 0.5 ]
               })
            }),
            stroke : new ol.style.Stroke({
               color : [ 0, 0, 255, 0.5 ],
               width : 2
            })
         })
      })

      map.addLayer(layer)

      var xhttp = new XMLHttpRequest();
      xhttp.open('GET',
                 '../data/integreen/MeteoFrontEnd/rest/get-station-details',
                 false); // TODO: go async!
      xhttp.send()
      var json = JSON.parse(xhttp.responseText)
      console.log(json)
      
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

      for (var i = 0; i < json.length; i++)
      {
         console.log(json[i])
         var thing = new ol.geom.Point(ol.proj.transform([ json[i].longitude,
               json[i].latitude ], 'EPSG:4326', 'EPSG:3857'));
         var featurething = new ol.Feature({
            // name: "Thing",
            geometry : thing
         });
         featurething.setStyle([shadowStyle, iconStyle]);

         sourcevector.addFeature(featurething);
      }

      var popup_element = document.getElementById('map-popup');
      var popup_close = document.getElementById('map-popup-close');
      var popup_content = document.getElementById('map-popup-content');

      popup_close.addEventListener('click', function()
      {
         popup_overlay.setPosition() // nascondi il popup passando una posizione undefined
      })

      var popup_overlay = new ol.Overlay({
         element : popup_element,
         positioning : 'bottom-center',
         offset : [ 0, 0 ]
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
            console.log(coords)
            // var hdms = coordinate.toStringHDMS(proj.toLonLat(coords));
            // console.log(hdms)
            popup_content.contentText = 'aa';
            popup_overlay.setPosition(coords);
         }
      });
   }

   showMap()
}
