# it.bz.opendatahub.analytics

This is a web application hosted on https://analytics.opendatahub.bz.it to show
data from the [Open Data Hub](https://opendatahub.bz.it) in various forms. It is
also possible to download data to process it with your preferred tool on your
machine.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents** 

- [Local development](#local-development)
- [Docker environment (optional)](#docker-environment-optional)
  - [Installation](#installation)
  - [Start and stop the containers](#start-and-stop-the-containers)
  - [Running commands inside the container](#running-commands-inside-the-container)
  - [Map style](#map-style)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Local development

Run the application inside the `src/main/webapp` folder with `python3 -m
http.server 8999` and then check `localhost:8999` for results. Make sure to use
the port `8999`, if you want to test authentication with our Keycloak test
server, since the callback has been set to `localhost:8999`.

## Docker environment (optional)

For the project a Docker environment is already prepared and ready to use with all necessary prerequisites.

These Docker containers are the same as used by the continuous integration servers.

### Installation

Install [Docker](https://docs.docker.com/install/) (with Docker Compose) locally on your machine.

### Start and stop the containers

Before start working you have to start the Docker containers:

```
docker-compose up --build --detach
```

After finished working you can stop the Docker containers:

```
docker-compose stop
```

### Running commands inside the container

When the containers are running, you can execute any command inside the
environment. Just replace the dots `...` in the following example with the
command you wish to execute:

```bash
docker-compose exec app /bin/bash -c "..."
```

### Map style
Default map style uses openstreetmap. To use the
[Thunderforest](https://www.thunderforest.com) map style, you can add your
Thunderforest API key to the configuration file in src/main/webapp/config.js

## License

The code in this project is licensed under the GNU AFFERO GENERAL PUBLIC LICENSE
Version 3 license. See the [LICENSE.md](LICENSE.md) file for more information.
