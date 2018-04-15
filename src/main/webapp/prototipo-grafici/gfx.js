'use strict';

let state = {
    active_tab: 0,
    scale: {
        from:  1522010124044, 
        to:    1522096524044,
        range: 86400000
           },
    graphs: [
        { category:         "meteorology",
          station:          "23200MS",
          station_name:     "Meran/Gratsch",
          data_type:        "air-temperature",
          unit:             "blabla",
          period:           "600"
        },
        { category:         "meteorology",
          station:          "23200MS",
          station_name:     "Meran/Gratsch",
          data_type:        "precipitation",
          unit:             "blabla",
          period:           "300"
        }

    ]    
};
/* iname=air-temperature&period=600&from=1522010124044&to=1522096524044 */

const dump_state = () => {

    console.log("#" + encodeURI(JSON.stringify(state)));

};


const qs  = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const URL_PREFIX = "http://ipchannels.integreen-life.bz.it";
const T0 = Number(new Date());

const DEBUG = true;
const debug_log = (msg) => {
    if (DEBUG) {
        console.log("gfx " + String(Number(new Date()) - T0) + ": " + msg);
    }
};

const show_tab = ix => {

    let tabs = Array.from($$(".gfx_tab"));
    tabs.forEach( el => el.classList.remove("gfx_tab_active") );
    tabs[ix].classList.add("gfx_tab_active");

    let panels = Array.from($$("#gfx_tabbed_panels > div"));
    panels.forEach( el => el.style.display = "none" );
    panels[ix].style.display = "block";

    state.active_tab = ix;

};

const init = () => { 

    // get the location hash (if any)
    // and initialize state from it

    // example:
    // %7B%22active_tab%22:0,%22graphs%22:%5B%7B%22kind%22:%22MeteoFrontEnd%22,%22station%22:%2223200MS%22,%22station_name%22:%22Meran/Gratsch%22%7D,%7B%7D%5D%7D

    let hash = location.hash;

    if (hash !== undefined && hash !== "") {
        hash = hash.substr(1);
        try { 
            state = JSON.parse(decodeURI(hash));
        } catch (e) {
            console.log("warning: cannot parse state from location.hash - ignored");
        }     
    }

    // initialize tabs

    let tab_links = Array.from($$(".gfx_tab > a"));
    tab_links.forEach( (el, ix) => {
        el.addEventListener("click", (ev) => {
            show_tab(ix);
            ev.preventDefault();
        }); 
    });

    show_tab(state.active_tab);



};


init();


let tempurl;
let precurl;

let tempdata;
let precdata;

let plot = (from, delta, reload)  => {

    if (delta < 3600000) {
        delta = 3600000;
    }

    let to = from + delta;

    state.scale.from = from;
    state.scale.to = to;
    state.scale.range = delta;

    if (reload) {
        qs("#gfx_flot").style.display = "none";
        qs("#gfx_wait").style.display = "block";

        // Meran/Gratsch air temperature

        tempurl = "http://ipchannels.integreen-life.bz.it/MeteoFrontEnd/rest/get-records-in-timeframe?station=23200MS&name=air-temperature&period=600&from=" + state.scale.from + "&to=" + state.scale.to + "";
        precurl = "http://ipchannels.integreen-life.bz.it/MeteoFrontEnd/rest/get-records-in-timeframe?station=23200MS&name=precipitation&period=300&from=" + state.scale.from + "&to=" + state.scale.to + "";

        tempdata = undefined;
        precdata = undefined;
    }

    let pl = () => {

    if (tempdata == undefined || precdata == undefined) {
        return;
    }

    qs("#gfx_wait").style.display = "none";
    qs("#gfx_flot").style.display = "block";

    let temp = tempdata.map( el => [ el.timestamp, Number(el.value) ] );
    let prec = precdata.map( el => [ el.timestamp, Number(el.value) ] ); 

    if (temp.length === 0 && prec.length === 0) {
        qs("#gfx_flot").style.display = "none";
        return;
    }

    jQuery("#gfx_flot")
        .plot( 
            [
            { data: temp, label: "Meran/Gratsch air temperature [C]", color: "#CC2222"  },
            { data: prec, label: "Meran/Gratsch precipitation [mm]",  color: "#2288CC", yaxis: 2 }
            ],

            {
                lines: { show: true },
                points: { show: true, radius: 3 },
                legend: {
                   show: true,
                   noColumns: 1,
                   position: "ne"
                },
                shadowSize: 0,
                xaxes:
                [
                {
                 position: "bottom",
                 mode: "time",
                 timezone: "browser",
                 timeformat: "%Y-%m-%d %H:%M:%S",
                 minTickSize: [1, "hour"] 
                 //,
                 // min: (new Date(1996, 0, 1)).getTime(),
                 // max: (new Date(2000, 0, 1)).getTime() 
                }
                ],
                yaxes:
                [
                { position: "left",  min: -15.0, max: 40.0 },
                { position: "right" }
                ],
              grid: {
            hoverable: true,
            clickable: true
        },
               
            }
        );
    };

    if (reload) {
    jQuery.getJSON(tempurl, data => { 
        tempdata = data;
        pl();
    });

    jQuery.getJSON(precurl, data => { 
        precdata = data;
        pl();
    });

    } else {
        pl();
    }


};

plot(state.scale.from, state.scale.range, true);

window.addEventListener("resize", () => plot(state.scale.from, state.scale.range, false) );



// tabbed panels -> add data set

qs("#gfx_selstation").style.display = "none";
qs("#gfx_seldataset").style.display = "none";
qs("#gfx_addset").style.display = "none";

qs("#gfx_selcategory").addEventListener("change", (ev) => {

    let cat = getSelectValue(ev.target);
    debug_log("event: #gfx_selcategory change fired with cat = " + cat);

    switch (cat) {

        case "":

            qs("#gfx_selstation").style.display = "none";
            qs("#gfx_seldataset").style.display = "none";
            qs("#gfx_addset").style.display = "none";
            break;

        case "meteorology":

            jQuery.getJSON(URL_PREFIX + "/MeteoFrontEnd/rest/get-station-details", (data) => {
                debug_log("ajax: got data length = " + data.length);
                let opt = `<option value="">select station...</option>`;
                opt += data
                        .sort( (a, b) => a.name > b.name? 1: -1 )
                        .map( station => `<option value="${station.id};${station.name};">&rarr; ${station.name}</option>` )
                        .join("\n");
                let next = qs("#gfx_selstation");
                next.innerHTML = opt;
                next.style.display = "inline-block";
            });
            break;

    }
 
});

qs("#gfx_selstation").addEventListener("change", (ev) => {

    let station = getSelectValue(ev.target);
    station = (station.split(";"))[0];

    debug_log("event: #gfx_selstation change fired with station = " + station);

    switch (station) {

        case "":

            qs("#gfx_seldataset").style.display = "none";
            qs("#gfx_addset").style.display = "none";
            break;

        default: 

            jQuery.getJSON(URL_PREFIX + "/MeteoFrontEnd/rest/get-data-types?station=" + station, (data) => {
                debug_log("ajax: got data length = " + data.length);
                let opt = `<option value="">select dataset...</option>`;
                opt += data
                        .sort( (a, b) => a[0] > b[0]? 1: -1 )
                        .map( type => `<option value="${type[0]};${type[1]};${type[3]}">&rarr; ${type[0]} [${type[1]}] (${type[3]}s)</option>` )
                        .join("\n");
                let next = qs("#gfx_seldataset");
                next.innerHTML = opt;
                next.style.display = "inline-block";
            });

            break;

    }
 
});

qs("#gfx_seldataset").addEventListener("change", (ev) => {

    let dataset = getSelectValue(ev.target);
    debug_log("event: #gfx_seldataset change fired with dataset = " + dataset);

    switch (dataset) {

        case "":

            qs("#gfx_addset").style.display = "none";
            break;

        default: 
            let next = qs("#gfx_addset");
            next.style.display = "inline-block";
            break;

    }
 
});

qs("#gfx_addset").addEventListener("click", (ev) => {

    let category     = getSelectValue(qs("#gfx_selcategory"));
    let station      = (getSelectValue(qs("#gfx_selstation")).split(";"))[0];
    let station_name = (getSelectValue(qs("#gfx_selstation")).split(";"))[1];
    let data_type    = (getSelectValue(qs("#gfx_seldataset")).split(";"))[0];
    let unit         = (getSelectValue(qs("#gfx_seldataset")).split(";"))[1];
    let period       = (getSelectValue(qs("#gfx_seldataset")).split(";"))[2];

    let obj = { "category":     category,
                "station":      station,
                "station_name": station_name,
                "data_type":    data_type,
                "unit":         unit,
                "period":       period
              };

    let found = false;

    state.graphs.forEach( graph => {
        if ( graph.category  === obj.category &&
             graph.station   === obj.station &&
             graph.data_type === obj.data_type &&
             graph.period    === obj.period
           ) {
            found = true;
        }
    });

    if (found) {
        debug_log("nothing added, graph was already present: " + JSON.stringify(obj));
    } else {
        state.graphs.push(obj);
        debug_log("added graph: " + JSON.stringify(obj));
    }

    qs("#gfx_selcategory").value = "";
    qs("#gfx_selstation").style.display = "none";
    qs("#gfx_seldataset").style.display = "none";
    qs("#gfx_addset").style.display = "none";
    show_tab(0);

});


const getSelectValue = (element) => {
    if (element === null || element === undefined) {
        return undefined;
    }
    return element.options[element.selectedIndex].value;
};
