# bzar: BZ Analytics for R 

bzar is an R package that contains 
a set of functions to access
[BZ Analytics](https://analytics.opendatahub.bz.it/) from R.



## Installation

### Prerequisites

You need an installation of R including the
package httr from CRAN.

In Linux (Debian), just install the packages r-base and r-cran-httr.
In macOS just install the official R package from the
[R site](https://cran.r-project.org), then open the package installer
and get httr from CRAN.

### Installing the package

Download the bzar directory from this repository and save it locally.

In the R prompt, install the bzar package from the local source:

```
install.packages("/path/to/bzar", repos = NULL, type="source")
``` 

and load it:

```
library(bzar)
```

### Removing the package

Should you ever want to remove bzar from your R installation, run:

```
remove.packages("bzar")
``` 

## Usage

Load the package using

```
library(bzar)
```

The main function is ```bzar.get_data()``` and serves to fetch the
time series data.

Here is a sample invocation that fetches air temperature for the station
in Rabbi (code T0076) im May 2020, requesting the smallest sample period
available:

```
data = bzar.get_data("Weather", "T0076", "air_temperature", "2020-05-01T00:00:00+0200", "2020-06-01T00:00:00+0200", 1)
```

data is a data frame with columns time and value:
```
> data
                    time value
1    2020-04-30 22:00:00   5.4
2    2020-04-30 22:15:00   5.3
3    2020-04-30 22:30:00   5.2
4    2020-04-30 22:45:00     5
5    2020-04-30 23:00:00   4.9
[...]
2972 2020-05-31 20:45:00   9.7
2973 2020-05-31 21:00:00   9.5
2974 2020-05-31 21:15:00   9.5
2975 2020-05-31 21:30:00   9.4
2976 2020-05-31 21:45:00   9.3
```

that can be plotted with:

```
plot(data$time, data$value)
```

To see what station types (like "Weather") are available, use:

```
bzar.get_station_types()
```

Given a station type, to get the list of available station names and codes (like "T0076") use:

```
bzar.get_stations("Weather")
```

Given a station, to get the list of available data sets (like "air_temperature") use:

```
bzar.get_data_sets("Weather", "T0076") 
```

Man pages for each function are available in the R help browser by invoking:

```
??bzar
```
