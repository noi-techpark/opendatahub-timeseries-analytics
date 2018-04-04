function fetchJson_promise(url)
{
   return new Promise(function(success, fail)
   {
        var xhttp = new XMLHttpRequest();
        xhttp.open("GET", url , true);
        xhttp.onreadystatechange = function(readystatechange)
        {
           if (xhttp.readyState == 4) // DONE:
                                        // https://developer.mozilla.org/it/docs/Web/API/XMLHttpRequest/readyState
           {
               console.log('status')
               console.log(xhttp.status)
               if (xhttp.status == 200)
               {
                   console.log('qui1')
                   var data = JSON.parse(xhttp.responseText)
                   success(data)
               }
               else
               {
                   console.log('qui2')
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
   console.log(json)
   
   for (var layer_info of json)
   {
      console.log(layer_info)
      let layer_display = layer_template.cloneNode(true)
      layer_display.querySelector('.label').textContent = layer_info.id
      layer_display.querySelector('.icon').src = layer_info.icon
      layers_container.appendChild(layer_display)
      
      // inizia caricamento dati (mostrare un progress?)
      let format = layer_info.format
      console.log(format)
      
      switch (format)
      {
         case 'integreen':
            loadIntegreenLayer(map, layer_info, layer_display)
            break;
         case 'wms':
            loadWMSLayer(map, layer_info, layer_display)
            break;
         default:
            alert('Unknow format: ' + format)
            break;
      }
      
      
   }

   async function loadWMSLayer(map, layer_info, layer_display)
   {
      var sourcetile = new ol.source.TileWMS({
         url: layer_info.url ,
         serverType: 'geoserver'
       })
      
      sourcetile.on('tileloadend', function(event) {
         console.log('immagini wms caricate!') 
      })
      
      sourcetile.on('tileloaderror', function(event) {
         console.log('immagini wms caricate!') 
      })
      
      var layer = new ol.layer.Tile({
         source: sourcetile
       })

      map.addLayer(layer)
   }

   async function loadIntegreenLayer(map, layer_info, layer_display)
   {
      var iconStyle = new ol.style.Style({
         image: new ol.style.Icon({
           anchor: [0.5, 1.0],
           anchorXUnits: 'fraction',
           anchorYUnits: 'fraction',
           opacity: 1,
           src: layer_info.icon,
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
      
       
      let layer = null;
      let loading_in_progress = false;
      
      
      let spinner = layer_display.querySelector('.spinner')
      
       
      layer_display.addEventListener('click', async function()
      {
         
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
            
            var sourcevector = new ol.source.Vector({});
   
            layer = new ol.layer.Vector({
              title : 'meteoLayer',
              visible : true,
              source : sourcevector,
              style : [shadowStyle, iconStyle]
            })
            
            map.addLayer(layer)
            
            await load_refresh_features()
         }
      })
      
      spinner.addEventListener('click', function(e)
      {
         e.stopPropagation(); // evita che il click passi a tutta la riga se gestito da me
         load_refresh_features()         
      });
      
      async function load_refresh_features()
      {
         // cliccare su reload se il layer non è visibile, salta questa parte!
         if (layer == null)
            return;
         
         spinner.classList.add('loading')
         loading_in_progress = true;

         layer_display.querySelector('.error').classList.remove('show')
         
         try
         {
            let json = await fetchJson_promise(layer_info.url)
         
            var sourcevector = new ol.source.Vector({});
            
            for (var i = 0; i < json.length; i++)
            {
               var thing = new ol.geom.Point(ol.proj.transform([ json[i].longitude,
                     json[i].latitude ], layer_info.projection, 'EPSG:3857'));
               var featurething = new ol.Feature({
                  // name: "Thing",
                  geometry : thing
               });
               
               featurething.setProperties(json[i])

               sourcevector.addFeature(featurething);
            }
            
            layer.setSource(sourcevector)
         }
         catch (err)
         {
            layer_display.querySelector('.error').classList.add('show')
         }
         finally
         {
            spinner.classList.remove('loading')
            loading_in_progress = false;
         }
         
         
         
         
      }
      
      /*
      var sourcevector = new ol.source.Vector({});

      
       var layer = new ol.layer.Vector({
         title : 'meteoLayer',
         visible : false,
         source : sourcevector,
         style : [shadowStyle, iconStyle]
      })

      map.addLayer(layer)
      
      
      
         layer.setVisible(true)
      })


      */
   }
}