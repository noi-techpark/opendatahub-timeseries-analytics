/*
    bz analytics
    graphics web ui / javascript

    (C) 2018 IDM Suedtirol - Alto Adige

    see vendor/ for third pary libraries needed by this code

    author: chris@1006.org  
*/

'use strict';


/* 
    for debugging reasons these todos will be done when all is ready:

    - TODO: remove hard coded graphs in the initial state 
    - TODO: wrap into an IIFE to avoid name space polution 
    - TODO: set DEBUG to false

*/


// -----------------------------------------------------------------------------
// --- SECTION_CONFIG: initial state and constants -----------------------------
// -----------------------------------------------------------------------------

let state = {
    active_tab: 0,
    scale: {
        from:  1522010124044,
        to:    1522096524044
           },
    graphs: [
     {  "category":     "meteorology",
        "station":      "23200MS",
        "station_name": "Meran - Gratsch",
        "data_type":    "air-temperature",
        "unit":         "°C",
        "period":       "600",
        "yaxis":        1,
        "color":        0 },

     {  "category":     "meteorology",
        "station":      "23200MS",
        "station_name": "Meran - Gratsch",
        "data_type":    "precipitation",
        "unit":         "mm",
        "period":       "300",
        "yaxis":        2,
        "color":        1 },
    ]    
};

let statedata = [ undefined, undefined ];

const BACKEND_URL = "http://ipchannels.integreen-life.bz.it";

const DEBUG = true;  // enable debug logging to the console
const T0 = Number(new Date());  // for debug timing


// -----------------------------------------------------------------------------
// --- SECTION_UTIL: basic utility functions -----------------------------------
// -----------------------------------------------------------------------------

const qs  = document.querySelector.bind(document);
const qsa = document.querySelectorAll.bind(document);

const get_selval = (element) => {
    if (element === null || element === undefined) {
        return undefined;
    }
    return element.options[element.selectedIndex].value;
};

const debug_log = (msg) => {
    if (DEBUG) {
        console.log("gfx " + String(Number(new Date()) - T0) + ": " + msg);
    }
};

// we cycle through these colors for the graphs, as they're being added

const colors = [
    "#CC3333",
    "#33CC33",
    "#3333CC",
    "#CCCC33",
    "#CC33CC",
    "#33CCCC" ];
let color_ix = 2;


// -----------------------------------------------------------------------------
// --- SECTION_TABS: tabbed panels ---------------------------------------------
// -----------------------------------------------------------------------------

const show_tab = ix => {

    let tabs = Array.from(qsa(".gfx_tab"));
    tabs.forEach( el => el.classList.remove("gfx_tab_active") );
    tabs[ix].classList.add("gfx_tab_active");

    let panels = Array.from(qsa("#gfx_tabbed_panels > div"));
    panels.forEach( el => el.style.display = "none" );
    panels[ix].style.display = "block";

    state.active_tab = ix;

};

const init_tabs = () => {

    let tab_links = Array.from(qsa(".gfx_tab > a"));
    tab_links.forEach( (el, ix) => {
        el.addEventListener("click", (ev) => {
            show_tab(ix);
            ev.preventDefault();
        }); 
    });

    show_tab(state.active_tab);

};


// -----------------------------------------------------------------------------
// --- SECTION_TAB_LEGEND: tabbed panel -> draw legend -------------------------
// -----------------------------------------------------------------------------

const show_legend = () => {

    // build the legend table

    let html = "";
    html += "<tr>";
    html += "<td>color</td>";
    html += "<td>category</td>";
    html += "<td>station</td>";
    html += "<td>data type</td>";
    html += "<td>period</td>";
    html += "<td>axes</td>";
    html += "<td>remove</td>";
    html += "<td>data points</td>";
    html += "</tr>";
    if (state.graphs.length === 0) {
        html += '<tr><td colspan="8">no data set selected<br>click on "add data set" to add a data set to the plot</td></tr>';
    }
    state.graphs.forEach( (graph, ix) => {
        html += "<tr>";
        html += '<td style="color: ' + colors[graph.color] + '"><b>color</b></td>';
        html += "<td>" + graph.category + "</td>";
        html += "<td>" + graph.station_name + " (" + graph.station + ")</td>";
        html += "<td>" + graph.data_type + " [" + graph.unit + "]</td>";
        html += "<td>" + graph.period + "s</td>";
        if (graph.yaxis === 1) {
            html += `<td><button class="gfx_sel" disabled>&lt;</button><button class="gfx_nsel" id="gfx_ytoggle${ix}">&gt;</button></td>`;
        } else {
            html += `<td><button class="gfx_nsel" id="gfx_ytoggle${ix}">&lt;</button><button class="gfx_sel" disabled>&gt;</button></td>`;
        }
        html += `<td><button id="gfx_remove${ix}">remove</button></td>`;
        if (statedata[ix] === undefined) {
            html += '<td class="gfx_notice">not yet loaded...</td>';
        } else {
            html += "<td>" + statedata[ix].length + "</td>";
        }
        html += "</tr>";

    });
    qs("#gfx_legend > table").innerHTML = html; 

    // add remove and left/right yaxis toggle button listeners

    state.graphs.forEach( (graph, ix) => {

        qs("#gfx_remove" + ix).addEventListener("click", () => {
            state.graphs.splice(ix, 1);    
            statedata.splice(ix, 1);
            show_legend();
            plot();
        });

        qs("#gfx_ytoggle" + ix).addEventListener("click", () => {
            if (state.graphs[ix].yaxis === 1) {
                state.graphs[ix].yaxis = 2;
            } else {
                state.graphs[ix].yaxis = 1;
            }
            show_legend();
            plot();
        });

    });

};


// -----------------------------------------------------------------------------
// --- SECTION_TAB_RANGE: tabbed panel -> select time range --------------------
// -----------------------------------------------------------------------------

const init_tab_range = () => {

    const refresh = () => {
        state.scale.from = Number(jQuery("#gfx_fromdate").datepicker( "getDate" ));
        state.scale.to   = Number(jQuery("#gfx_todate"  ).datepicker( "getDate" ));
        show_days();
        statedata.fill(undefined); 
        show_legend();
        load_data(); 
        show_tab(0);
    };

    // select date range

    jQuery("#gfx_fromdate").datepicker({ dateFormat: "yy-mm-dd",
                                         onSelect: show_days });
    jQuery("#gfx_fromdate").datepicker("setDate", "-8");

    jQuery("#gfx_todate"  ).datepicker({ dateFormat: "yy-mm-dd", 
                                         onSelect: show_days });
    jQuery("#gfx_todate"  ).datepicker("setDate", "-1");

    qs("#gfx_fromdate").addEventListener("change", show_days);
    qs("#gfx_todate"  ).addEventListener("change", show_days);

    qs("#gfx_update_range").addEventListener("click", () => {
        refresh();
    });

    // pick preset values

    qs("#gfx_range_today").addEventListener("click", () => {
        jQuery("#gfx_fromdate").datepicker("setDate", "0");
        jQuery("#gfx_todate"  ).datepicker("setDate", "1");
        refresh(); 
    });

    qs("#gfx_range_ytoday").addEventListener("click", () => {
        jQuery("#gfx_fromdate").datepicker("setDate", "-1");
        jQuery("#gfx_todate"  ).datepicker("setDate", "1");
        refresh(); 
    });

    qs("#gfx_range_week").addEventListener("click", () => {
        jQuery("#gfx_fromdate").datepicker("setDate", "-7");
        jQuery("#gfx_todate"  ).datepicker("setDate", "0");
        refresh(); 
    });
    qs("#gfx_range_month").addEventListener("click", () => {
        jQuery("#gfx_fromdate").datepicker("setDate", "-31");
        jQuery("#gfx_todate"  ).datepicker("setDate", "0");
        refresh(); 
    });




    show_days();
};

const show_days = () => {
    let diff = Math.round((Number(jQuery("#gfx_todate").datepicker( "getDate" )) - Number(jQuery("#gfx_fromdate").datepicker( "getDate" ))) / (24*3600*1000));
    let invalid = "";
    if (diff < 1 || diff > 366) {
        qs("#gfx_fromdate").style.backgroundColor = "#FFBBAA";
        qs("#gfx_todate"  ).style.backgroundColor = "#FFBBAA";
        qs("#gfx_update_range" ).style.textDecoration = "line-through";
        qs("#gfx_update_range" ).disabled = true;
        invalid = "(<b>invalid</b>, range must be between 1 and 366 days)"
    } else {
        qs("#gfx_fromdate").style.backgroundColor = "#FFFFFF";
        qs("#gfx_todate"  ).style.backgroundColor = "#FFFFFF";
        qs("#gfx_update_range" ).style.textDecoration = "";
        qs("#gfx_update_range" ).disabled = false;
        invalid = "";
    }
    qs("#gfx_days").innerHTML = "&nbsp;" + diff + " days " + invalid + "&nbsp;";
};




// -----------------------------------------------------------------------------
// --- SECTION_TAB_DATASET: tabbed panel -> add data set -----------------------
// -----------------------------------------------------------------------------

const init_tab_dataset = () => {

    qs("#gfx_selstation").style.display = "none";
    qs("#gfx_seldataset").style.display = "none";
    qs("#gfx_addset").style.display     = "none";

    qs("#gfx_selcategory").addEventListener("change", (ev) => {

        let cat = get_selval(ev.target);
        debug_log("event: #gfx_selcategory change fired with cat = " + cat);

        switch (cat) {

            case "":

                qs("#gfx_selstation").style.display = "none";
                qs("#gfx_seldataset").style.display = "none";
                qs("#gfx_addset").style.display = "none";
                break;

            case "meteorology":

                jQuery.getJSON(BACKEND_URL + "/MeteoFrontEnd/rest/get-station-details", (data) => {
                    debug_log("got station details -> length = " + data.length);
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

        let station = get_selval(ev.target);
        station = (station.split(";"))[0];

        debug_log("event: #gfx_selstation change fired with station = " + station);

        switch (station) {

            case "":

                qs("#gfx_seldataset").style.display = "none";
                qs("#gfx_addset").style.display = "none";
                break;

            default: 

                jQuery.getJSON(BACKEND_URL + "/MeteoFrontEnd/rest/get-data-types?station=" + station, (data) => {
                    debug_log("got data types -> length = " + data.length);
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

        let dataset = get_selval(ev.target);
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

        let category     = get_selval(qs("#gfx_selcategory"));
        let station      = (get_selval(qs("#gfx_selstation")).split(";"))[0];
        let station_name = (get_selval(qs("#gfx_selstation")).split(";"))[1];
        let data_type    = (get_selval(qs("#gfx_seldataset")).split(";"))[0];
        let unit         = (get_selval(qs("#gfx_seldataset")).split(";"))[1];
        let period       = (get_selval(qs("#gfx_seldataset")).split(";"))[2];

        let obj = { "category":     category,
                    "station":      station,
                    "station_name": station_name,
                    "data_type":    data_type,
                    "unit":         unit,
                    "period":       period,
                    "yaxis":        1,
                    "color":        (++color_ix) % colors.length
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
            statedata.push(undefined);
            debug_log("added graph: " + JSON.stringify(obj));
            show_legend();
            load_data();
        }

        qs("#gfx_selcategory").value = "";
        qs("#gfx_selstation").style.display = "none";
        qs("#gfx_seldataset").style.display = "none";
        qs("#gfx_addset").style.display = "none";
        show_tab(0);

    });

};


// -----------------------------------------------------------------------------
// --- SECTION_PERMALINK: stuff related to the permalink feature ---------------
// -----------------------------------------------------------------------------

const dump_state = () => {
    console.log("#" + encodeURI(JSON.stringify(state)));
};

const init_state_from_permalink = () => { 

    // get the location hash (if any)
    // and initialize state from it

    let hash = location.hash;

    if (hash !== undefined && hash !== "") {
        hash = hash.substr(1);
        try { 
            state = JSON.parse(decodeURI(hash));
            statedata = [];
            state.graphs.forEach( () => statedata.push(undefined) );
        } catch (e) {
            debug_log("permalink: cannot parse state from location.hash - ignored");
        }     
    }

};


// -----------------------------------------------------------------------------
// --- SECTION_LOAD: load data sets --------------------------------------------
// -----------------------------------------------------------------------------

const load_data = () => {

    let len = state.graphs.length;
    let todo_len = statedata.filter(el => el === undefined).length;

    debug_log("load_data() -> need to fetch data for " + todo_len + " out of " + len + " graphs");

    state.graphs.forEach( (graph, ix) => {

        if (statedata[ix] !== undefined) {
            return;
        }

        let url = BACKEND_URL;

        switch (graph.category) {

            case "meteorology":

                url += "/MeteoFrontEnd/rest/get-records-in-timeframe"; 
                url += "?station=" + graph.station;
                url += "&name="    + graph.data_type;
                url += "&period="  + graph.period;
                url += "&from="    + state.scale.from;
                url += "&to="      + state.scale.to;
                jQuery.getJSON(url, data => { 
                    statedata[ix] = data;
                    show_legend();
                    if (statedata.filter(el => el === undefined).length === 0) {
                        debug_log("load_data() -> all downloads ready");
                        plot();
                    }
                });
                break;

        }
        
    });


};


// -----------------------------------------------------------------------------
// --- SECTION_PLOT: plot data sets using flot ---------------------------------
// -----------------------------------------------------------------------------

let plot = ()  => {

    if (state.graphs.length === 0) {
        qs("#gfx_wait").style.display = "block";
        qs("#gfx_flot").style.display = "none";
        return;
    }

    qs("#gfx_wait").style.display = "none";
    qs("#gfx_flot").style.display = "block";

    // prepare data for flot

    let flot_data = [];
    statedata.forEach( (data, ix) => {
        if (data !== undefined) {
            flot_data.push(
                { "data": data.map( el => [ el.timestamp, Number(el.value) ] ),
                  "label": state.graphs[ix].station_name + " - " +
                           state.graphs[ix].data_type + " [" + 
                           state.graphs[ix].unit + "] (" + 
                           state.graphs[ix].period + "s)",
                  "color": colors[state.graphs[ix].color],
                  "yaxis": state.graphs[ix].yaxis }
            );
        }
    });

    // prepare left and right y axis labels

    let left_unit = "";
    let right_unit = "";

    state.graphs.forEach( graph => {
        if (graph.yaxis === 1) {
            if (left_unit === "" || left_unit === graph.unit) {
                left_unit = graph.unit;
            } else {
                left_unit = "various units";
            }
        } else {
            if (right_unit === "" || right_unit === graph.unit) {
                right_unit = graph.unit;
            } else {
                right_unit = "various units";
            }
        }
    });

    // plot it

    jQuery("#gfx_flot")
        .plot( 
            flot_data,
            {
                lines: { show: true },
                points: { show: true, radius: 3 },
                legend: {
                   show: true,
                   noColumns: 1,
                   position: "ne"
                },
                shadowSize: 0,
                xaxes: [ { position: "bottom",
                           mode: "time",
                           timezone: "browser",
                           timeformat: "%Y-%m-%d %H:%M:%S", 
                           minTickSize: [1, "hour"] 
                       } ],
                yaxes: [ { axisLabel: left_unit, position: "left" },
                         { axisLabel: right_unit, position: "right" } ],
                grid: { hoverable: true, clickable: true }
            }
        );

};


// -----------------------------------------------------------------------------
// --- SECTION_INIT: initialization --------------------------------------------
// -----------------------------------------------------------------------------

init_tabs();
init_tab_range();
init_tab_dataset();
init_state_from_permalink();
show_legend();
load_data();

window.addEventListener("resize", plot );


