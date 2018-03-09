    'use strict';

    let current_from;
    let current_to;
    let current_period;

    let plot = (from, delta)  => {

        if (delta < 3600000) {
            delta = 3600000;
        }

        let to = from + delta;

        current_from = from;
        current_to = to;
        current_period = delta;

        console.log(current_from);
        console.log(current_to);
        console.log(current_period);

        $("#placeholder").hide();
        $("#waiting").show();

        // Meran/Gratsch air temperature

        let tempurl = "http://analytics.mobility.bz.it/data/get_data.json?frontend=Meteo&station=23200MS&data_type=air-temperature&period=600&from=" + from + "&to=" + to + "";
        let precurl = "http://analytics.mobility.bz.it/data/get_data.json?frontend=Meteo&station=23200MS&data_type=precipitation&period=300&from=" + from + "&to=" + to + "";

        let tempdata = undefined;
        let precdata = undefined;

        let plot = () => {

        if (tempdata == undefined || precdata == undefined) {
            return;
        }

        $("#waiting").hide();
        $("#placeholder").show();

        let temp = tempdata.series[0].data.map( el => [ el[0], Number(el[1]) ] ); 
        let prec = precdata.series[0].data.map( el => [ el[0], Number(el[1]) ] ); 

        console.log(temp.length);
        console.log(prec.length);

        if (temp.length === 0 && prec.length === 0) {
            $("#placeholder").hide();
            return;
        }



        $("#placeholder")
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
                     minTickSize: [1, "hour"] /*,
                     min: (new Date(1996, 0, 1)).getTime(),
                     max: (new Date(2000, 0, 1)).getTime() */
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


        $.getJSON(tempurl, data => { 
            tempdata = data;
            plot();
        });

        $.getJSON(precurl, data => { 
            precdata = data;
            plot();
        });


    };
