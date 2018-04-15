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
      
      configureLayer(map, layer_info, layer_display)
      
   }
   
   function configureLayer(map, layer_info, layer_display)
   {
      let spinner = layer_display.querySelector('.spinner')
      
      let layer = null;
      
      let loading = false;
      
      layer_display.addEventListener('click', async function()
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
            map.addLayer(layer)
            spinner.classList.remove('loading')
            loading = false
         }
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
          
          var sourcevector = new ol.source.Vector({});
          
          let layer = new ol.layer.Vector({
            title : 'meteoLayer',
            visible : true,
            source : sourcevector,
            style : [shadowStyle, iconStyle]
          })
          
          let json = await fetchJson_promise(layer_info.url)
          
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
         
         sourcetile.on('tileloadstart', function(event) {
            console.log('immagini wms caricate!') 
         })
         
         var layer = new ol.layer.Tile({
            source: sourcetile
         })
         
         ok(layer)

      })

   }
}