'use strict';

let state = {
    active_tab: 0,
    scale: { from:  1522010124044, 
             to:    1522096524044,
             range: 86400000
           },
    graphs: [
        { kind:             "MeteoFrontEnd",
          station:          "23200MS",
          station_human:    "Meran/Gratsch",
          name:             "air-temperature",
          period:           "600"
        },
        {}

    ]    
};
/* iname=air-temperature&period=600&from=1522010124044&to=1522096524044 */

// console.log(encodeURI(JSON.stringify(state)));


const $  = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);


const show_tab = ix => {

    let tabs = Array.from($$(".gfx_tab"));
    tabs.forEach( el => el.classList.remove("gfx_tab_active") );
    tabs[ix].classList.add("gfx_tab_active");

    let panels = Array.from($$("#gfx_panels > div"));
    panels.forEach( el => el.style.display = "none" );
    panels[ix].style.display = "block";

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
        $("#gfx_flot").style.display = "none";
        $("#gfx_wait").style.display = "block";

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

    $("#gfx_wait").style.display = "none";
    $("#gfx_flot").style.display = "block";

    let temp = tempdata.map( el => [ el.timestamp, Number(el.value) ] );
    let prec = precdata.map( el => [ el.timestamp, Number(el.value) ] ); 

    if (temp.length === 0 && prec.length === 0) {
        $("#gfx_flot").style.display = "none";
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
