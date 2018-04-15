endpoint per le select "frontend"
---------------------------------

le option sono tipo->station->measurement

tipi sono nel vecchio web2.py:

baseurl = "http://ipchannels.integreen-life.bz.it"
frontends = {'Meteo':'MeteoFrontEnd',
             'Vehicle': 'VehicleFrontEnd',
             'Environment':'EnvironmentFrontEnd',
             'Parking': 'parkingFrontEnd',
             'Bluetooth':'BluetoothFrontEnd',
             'Link':'LinkFrontEnd',
             'Street': 'StreetFrontEnd',
             'Traffic': 'TrafficFrontEnd',
             }

interno:

do tipo (meteo) e ricevo station:
http://ipchannels.integreen-life.bz.it/MeteoFrontEnd/rest/get-stations 
-> ricevuo station id, es. "69440GW"

oppure piu` facilmente do tipo (meteo) e ricevo tutti i dettagli della station:
http://ipchannels.integreen-life.bz.it/MeteoFrontEnd/rest/get-station-details

una volta scelta la station (es 69440GW) prendo le grandezze disponibili

http://ipchannels.integreen-life.bz.it/MeteoFrontEnd/rest/get-data-types?station=69440GW

esterno (vecchio) - da TUTTO l'HTML renderizzato server side:

http://analytics.mobility.bz.it/data/get_stations -> NON LO FACCIAMO SERVER SIDE

esterno (nuovo) - da` SOLO i dati JSON, come l'api interna:

http://localhost:8888/data/integreen/MeteoFrontEnd/rest/get-stations-details
http://localhost:8888/data/integreen/MeteoFrontEnd/rest/get-data-types


endpoint per le data frontend
-----------------------------

esterno (vecchio):

http://analytics.mobility.bz.it/data/get_data.json?
frontend=Meteo&
station=47400MS&
unit=mm&                                        -> not used
data_type=precipitation&
data_label=precipitation+(5m)+(300)s&           -> not used
period=300& 
from=1518183630985&
to=1518788430985


interno:

http://ipchannels.integreen-life.bz.it/MeteoFrontEnd/rest/get-records-in-timeframe?station=47400MS&name=precipitation&from=1518183630985&to=1518788430985


esterno (nuovo) 

http://localhost:8888/data/integreen/ da li in poi uguale: MeteoFrontEnd/rest/get-records-in-timeframe? ...

-------------------------------

sequenza per la lettura dei dati integreen:

lista stazioni, tipi di dato fornito dalla stazione e valore per quella stazione / tipo

dubbi: get-records seconds cosa sono?

http://ipchannels.integreen-life.bz.it/MeteoFrontEnd/rest/get-station-details
http://ipchannels.integreen-life.bz.it/MeteoFrontEnd/rest/get-data-types?station=65350MS
http://ipchannels.integreen-life.bz.it/MeteoFrontEnd/rest/get-records?station=83200MS&name=atmospheric-pressure-reduced&seconds=10000
http://ipchannels.integreen-life.bz.it/MeteoFrontEnd/rest/get-records?station=83200MS&name=sunshine-duration&seconds=10000


http://ipchannels.integreen-life.bz.it/BluetoothFrontEnd/rest/get-station-details
http://ipchannels.integreen-life.bz.it/BluetoothFrontEnd/rest/get-data-types?station=siemens
http://ipchannels.integreen-life.bz.it/BluetoothFrontEnd/rest/get-records?station=siemens&name=Bluetooth%20Count%20record&seconds=18000

