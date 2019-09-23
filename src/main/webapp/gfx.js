/*
    bz analytics
    graphics web ui / javascript

    (C) 2018 IDM Suedtirol - Alto Adige
    (C) 2019 NOI Techpark Suedtirol/Alto Adige

    see vendor/ for third pary libraries needed by this code

    author: chris@1006.org  
*/

'use strict';


(() => {

/*
    TOC
    -----------------------------------------------------------------
    SECTION_CONFIG:         initial state and constants
    SECTION_UTIL:           basic utility functions
    SECTION_RANGE:          select time range
    SECTION_TABS:           tabbed panels
    SECTION_TAB_LEGEND:     tabbed panel -> draw legend
    SECTION_TAB_DATASET:    tabbed panel -> add data set
    SECTION_PERMALINK:      stuff related to the permalink feature
    SECTION_HEIGHT:         stuff related to the plot height feature
    SECTION_AUTO_REFRESH:   stuff related to the auto refresh button
    SECTION_LOAD:           load data sets
    SECTION_PLOT:           plot data sets using flot
    SECTION_INIT:           initialization
*/


// -----------------------------------------------------------------------------
// --- SECTION_CONFIG: initial state and constants -----------------------------
// -----------------------------------------------------------------------------

let state = {
    active_tab: 0,
    height: "400px",
    auto_refresh: false,
    scale: {
        from:  0,
        to:    0
           },
    graphs: []
};

let statedata = [];
let statedata_status = [];

const CAT_CONFIG_URL = "layers-config.json";

let   CAT_BACKENDS = {};    // leave empty, automatic from config

const DEBUG = false;            // enable debug logging to the console
const T0 = Number(new Date());  // for debug timing


// -----------------------------------------------------------------------------
// --- SECTION_UTIL: basic utility functions -----------------------------------
// -----------------------------------------------------------------------------

// just shortcuts
const qs  = document.querySelector.bind(document);
const qsa = document.querySelectorAll.bind(document);
const get_selval = (element) => {
    if (element === null || element === undefined) {
        return undefined;
    }
    return element.options[element.selectedIndex].value;
};

// (european) date time string
const format_time = () => {
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
};

// debug log with timing info
const debug_log = (msg) => {
    if (DEBUG) {
        console.log("gfx " + String(Number(new Date()) - T0) + ": " + msg);
    }
};

// CSV export
const get_csv = (ix) => {
    const pad0 = (instr) => {
        let str = String(instr);
        while (str.length < 2) {
            str = "0" + str;
        }
        return str;
    };
    const date_to_str = (d) => {
        return d.getFullYear()
        + "-"
        + pad0((d.getMonth() + 1))
        + "-"
        + pad0(d.getDate())
        + " " 
        + pad0(d.getHours())
        + ":" 
        + pad0(d.getMinutes())
        + ":" 
        + pad0(d.getSeconds());
    };
    if (statedata[ix] === undefined || statedata_status[ix] !== 200) {
        return;
    }
    return "time stamp," + (state.graphs[ix].station_name + " " + state.graphs[ix].data_type + " " + state.graphs[ix].unit).replace(/,/g, ";") + "\n" + 
    statedata[ix].map( el => date_to_str(new Date(el.timestamp)) + "," + el.value ).join("\n");
};

// we cycle through these colors for the graphs, as they're being added
const colors = [
    "#2288EE",
    "#22EE88",
    "#8822EE",
    "#88EE22",
    "#EE2288",
    "#EE8822",
    "#88EEEE",
    "#EE88EE",
    "#EEEE88",
    "#228888",
    "#882288",
    "#888822"
    ];
let color_ix = 0;


// -----------------------------------------------------------------------------
// --- SECTION_RANGE: select time range ----------------------------------------
// -----------------------------------------------------------------------------

const init_range = () => {

    const refresh = () => {
        state.scale.from = Number(jQuery("#gfx_fromdate").datepicker( "getDate" ));
        state.scale.to   = Number(jQuery("#gfx_todate"  ).datepicker( "getDate" ));
        show_days();
        statedata.fill(undefined); 
        statedata_status.fill(undefined); 
        show_legend();
        load_data(); 
        show_tab(0);
        refresh_permalink();
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
    refresh();
};

const show_days = () => {
    let diff = Math.round((Number(jQuery("#gfx_todate").datepicker( "getDate" )) - Number(jQuery("#gfx_fromdate").datepicker( "getDate" ))) / (24*3600*1000));
    let invalid = "";
    if (diff < 1 || diff > 366) {
        qs("#gfx_fromdate").style.backgroundColor = "#FFBBAA";
        qs("#gfx_todate"  ).style.backgroundColor = "#FFBBAA";
        qs("#gfx_update_range" ).style.textDecoration = "line-through";
        qs("#gfx_update_range" ).disabled = true;
        invalid = " - <b>invalid</b>, range must be between 1 and 366 days"
    } else {
        qs("#gfx_fromdate").style.backgroundColor = "#FFFFFF";
        qs("#gfx_todate"  ).style.backgroundColor = "#FFFFFF";
        qs("#gfx_update_range" ).style.textDecoration = "";
        qs("#gfx_update_range" ).disabled = false;
        invalid = "";
    }
    qs("#gfx_days").innerHTML = "&nbsp;<span class=\"gfx_hi\">" + diff + " days</span>" + invalid + "&nbsp;";
};


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
    html += "<td>COLOR</td>";
    html += "<td>CATEGORY</td>";
    html += "<td>STATION</td>";
    html += "<td>DATA TYPE</td>";
    html += "<td>PERIOD</td>";
    html += "<td>DATA POINTS</td>";
    html += "<td>Y-AXIS</td>";
    html += "<td>CSV D/L</td>";
    html += "<td>REMOVE</td>";
    html += "</tr>";
    if (state.graphs.length === 0) {
        html += '<tr><td colspan="9">no dataset selected</td></tr>';
    }
    state.graphs.forEach( (graph, ix) => {
        html += "<tr>";
        html += '<td style="text-align: center"><div style="display: inline-block; width: 20px; height: 9px; background-color: ' + colors[graph.color] + '"></div></td>';
        html += "<td>" + graph.category + "</td>";
        html += "<td>" + graph.station_name + " (" + graph.station + ")</td>";
        html += "<td>" + graph.data_type + " [" + graph.unit + "]</td>";
        html += "<td>" + graph.period + "s</td>";
        if (statedata[ix] === undefined) {
            html += '<td class="gfx_notice">loading&hellip;</td>';
        } else if (statedata[ix].length === 0 && statedata_status[ix] !== 200) {
            html += '<td class="gfx_status_error">download failed (status ' + statedata_status[ix]+ ')</td>';
        } else if (statedata[ix].length === 0 && statedata_status[ix] === 200) {
            html += '<td class="gfx_status_error">no data available or missing authentication (status ' + statedata_status[ix]+ ')</td>';
        } else {
            html += "<td>" + statedata[ix].length + "</td>";
        }
        if (graph.yaxis === 1) {
            html += `<td><button class="gfx_sel" disabled>&lt;</button>&nbsp;<button class="gfx_nsel" id="gfx_ytoggle${ix}">&gt;</button></td>`;
        } else {
            html += `<td><button class="gfx_nsel" id="gfx_ytoggle${ix}">&lt;</button>&nbsp;<button class="gfx_sel" disabled>&gt;</button></td>`;
        }
        html += `<td><button id="gfx_prepcsv${ix}">prepare CSV</button></td>`;
        html += `<td><input style="width: 10px;" type="image" id="gfx_remove${ix}" src="icons/04_other_icons/remove.svg" alt="remove"></td>`;
        html += "</tr>";

    });
    qs("#gfx_legend > table").innerHTML = html; 

    // add listeners for buttons: left/right yaxis toggle, prepare CSV and remove graph

    state.graphs.forEach( (graph, ix) => {

        qs("#gfx_ytoggle" + ix).addEventListener("click", () => {
            if (state.graphs[ix].yaxis === 1) {
                state.graphs[ix].yaxis = 2;
            } else {
                state.graphs[ix].yaxis = 1;
            }
            show_legend();
            plot();
            refresh_permalink();
        });

        qs("#gfx_prepcsv" + ix).addEventListener("click", () => {
            qs("#gfx_prepcsv" + ix).parentElement.innerHTML = "<a href=\"data:text/csv," + encodeURIComponent(get_csv(ix))+ "\" download>download.csv</a>"
        });

        qs("#gfx_remove" + ix).addEventListener("click", () => {
            state.graphs.splice(ix, 1);    
            statedata.splice(ix, 1);
            statedata_status.splice(ix, 1);
            show_legend();
            plot();
            refresh_permalink();
        });

    });

};



// -----------------------------------------------------------------------------
// --- SECTION_TAB_DATASET: tabbed panel -> add data set -----------------------
// -----------------------------------------------------------------------------

const init_tab_dataset = () => {

    qs("#gfx_selstation").style.display = "none";
    qs("#gfx_seldataset").style.display = "none";
    qs("#gfx_addset").style.display     = "none";

    // initialize category select box ( gfx_selcategory ) and create global category -> backend URL hash
    jQuery.getJSON(CAT_CONFIG_URL, (data) => {
        let opt = `<option value="">Select category...</option>`;
        data
            .filter( cat => cat.format === "integreen" )
            .forEach( cat => { 
                opt += `<option value="${cat.id}">&rarr; ${cat.id}</option>\n`;
                CAT_BACKENDS[cat.id] = cat.base_url;
            }); 
        qs("#gfx_selcategory").innerHTML = opt;
     });

    qs("#gfx_selcategory").addEventListener("change", (ev) => {

        let cat = get_selval(ev.target);
        debug_log("event: #gfx_selcategory change fired with cat = " + cat);

        switch (cat) {

            case "":

                qs("#gfx_selstation").style.display = "none";
                qs("#gfx_seldataset").style.display = "none";
                qs("#gfx_addset").style.display = "none";
                break;

            default:

                jQuery.getJSON(CAT_BACKENDS[cat] + "get-station-details", (data) => {
                    debug_log("got station details -> length = " + data.length);
                    let opt = `<option value="">Select station...</option>`;
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
        let cat = get_selval(qs("#gfx_selcategory"));

        debug_log("event: #gfx_selstation change fired with station = " + station);

        switch (station) {

            case "":

                qs("#gfx_seldataset").style.display = "none";
                qs("#gfx_addset").style.display = "none";
                break;

            default: 

                jQuery.getJSON(CAT_BACKENDS[cat] + "get-data-types?station=" + station, (data) => {
                    debug_log("got data types -> length = " + data.length);
                    let opt = `<option value="">Select dataset...</option>`;
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
                    "color":        color_ix % colors.length
                  };
        color_ix++;

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
            statedata_status.push(undefined);
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

const refresh_permalink = () => {
    qs("#gfx_perma").href = location.origin + location.pathname + "#" + encodeURI(JSON.stringify(state));
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
            statedata_status = [];
            state.graphs.forEach( () => { statedata.push(undefined); statedata_status.push(undefined) } );
        } catch (e) {
            debug_log("permalink: cannot parse state from location.hash - ignored");
        }     
    }

};


// -----------------------------------------------------------------------------
// --- SECTION_HEIGHT: stuff related to the plot height feature ----------------
// -----------------------------------------------------------------------------

const init_plot_height = () => {

    qs("#gfx_plot").style.height = state.height;

    Array.from(qsa("#gfx_hpx > option")).forEach(node => {
        if (node.value === state.height) {
            node.selected = true;
        }
    });

    qs("#gfx_hpx").addEventListener("change", () => {
        let v = qs("#gfx_hpx").value;
        qs("#gfx_plot").style.height = v;
        state.height = v;
        plot();
        refresh_permalink();
    });
};


// -----------------------------------------------------------------------------
// --- SECTION_AUTO_REFRESH: stuff related to the auto refresh button ----------
// -----------------------------------------------------------------------------

const LIVE_PERIOD = 300 * 1000;

const init_auto_refresh = () => {
    qs("#gfx_live").addEventListener("click", () => {
        state.auto_refresh = !state.auto_refresh;
        show_auto_refresh_button();
    });
    show_auto_refresh_button();
    setTimeout(auto_refresh, LIVE_PERIOD);
};

const show_auto_refresh_button = () => {
    if (state.auto_refresh) {
        qs("#gfx_live").innerHTML = "auto refresh on";
        qs("#gfx_live").classList.add("gfx_sel");
        qs("#gfx_live").classList.remove("gfx_nsel");
    } else {
        qs("#gfx_live").innerHTML = "auto refresh off";
        qs("#gfx_live").classList.add("gfx_nsel");
        qs("#gfx_live").classList.remove("gfx_sel");
    }
};

const auto_refresh = () => {
    // auto_refresh only if auto_refresh is enabled and no download is being done right now
    let todo_len = statedata.filter(el => el === undefined).length;
    if (state.auto_refresh && todo_len === 0) {
        debug_log("auto_refresh"); 
        statedata.fill(undefined);
        statedata_status.fill(undefined);
        show_legend();
        load_data();
    }
    setTimeout(auto_refresh, LIVE_PERIOD);
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

        let url = "";

        switch (graph.category) {

            default:

                url += CAT_BACKENDS[graph.category] + "get-records-in-timeframe"; 
                url += "?station=" + graph.station;
                url += "&name="    + graph.data_type;
                url += "&period="  + graph.period;
                url += "&from="    + state.scale.from;
                url += "&to="      + state.scale.to;
                /*
                jQuery.getJSON(url, data => { 
                    statedata[ix] = data;
                    show_legend();
                    if (statedata.filter(el => el === undefined).length === 0) {
                        debug_log("load_data() -> all downloads ready");
                        plot();
                        refresh_permalink();
                    }
                });
                */
                jQuery.getJSON(url)
                    .done(data => { 
                        // download succeeded
                        statedata[ix]           = data;
                        statedata_status[ix]    = 200;
                        show_legend();
                        if (statedata.filter(el => el === undefined).length === 0) {
                            debug_log("load_data() -> all downloads ready");
                            plot();
                            refresh_permalink();
                        }
                    })
                    .fail( data => {
                        // download failed
                        statedata[ix]           = [];
                        statedata_status[ix]    = data.status;
                        qs("#gfx_error_log").textContent = format_time() + " -> " + data.responseText;
                        show_legend();
                        if (statedata.filter(el => el === undefined).length === 0) {
                            debug_log("load_data() -> all downloads ready");
                            plot();
                            refresh_permalink();
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

    jQuery("#gfx_data_cursor_pane").remove();
    jQuery("#gfx_data_cursor_mark").remove();

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
    jQuery("#gfx_flot").bind("plotclick", (e, pos, ele) => {
        jQuery("#gfx_data_cursor_pane").remove();
        jQuery("#gfx_data_cursor_mark").remove();
        if (ele) {
            jQuery("body").append("<div id=\"gfx_data_cursor_pane\"></div>");
            qs("#gfx_data_cursor_pane").innerHTML = ele.series.label           + "<br>" +
                                               new Date(ele.datapoint[0]) + "<br>" +
                                               "value: " + ele.datapoint[1];
            let pane_width = parseInt(getComputedStyle(qs("#gfx_data_cursor_pane")).width);
            let body_width = parseInt(getComputedStyle(qs("body")).width);
            let x = Math.round(ele.pageX);
            if (x > 0.5 * body_width) {
                x -= pane_width + 16;
            } 
            qs("#gfx_data_cursor_pane").style.left = Math.round(x) + "px";
            qs("#gfx_data_cursor_pane").style.top  = Math.round(ele.pageY + 10) + "px";

            jQuery("body").append("<div id=\"gfx_data_cursor_mark\"></div>");
            qs("#gfx_data_cursor_mark").style.left = (Math.round(ele.pageX) - 4) + "px";
            qs("#gfx_data_cursor_mark").style.top  = (Math.round(ele.pageY) - 4) + "px";


        } 
    });

};


// -----------------------------------------------------------------------------
// --- SECTION_INIT: initialization --------------------------------------------
// -----------------------------------------------------------------------------

init_tabs();
init_range();
init_tab_dataset();
init_state_from_permalink();
init_plot_height();
init_auto_refresh();
show_legend();

// the initial call to load_data() must wait for the category backend URLs
// (loaded by init_tab_dataset()) to become available:
let conditionally_load_data = () => {
    if (Object.keys(CAT_BACKENDS).length === 0) {   
        setTimeout(conditionally_load_data, 100);
        return;
    }
    load_data();
};
conditionally_load_data();

// call plot() when the chart is resized
window.addEventListener("resize", plot);


})();
