# it.bz.opendatahub.analytics

This is a web application to show data from the [Open Data
Hub](https://opendatahub.bz.it) in various forms. It is also possible to
download data to process it with your preferred tool on your machine.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents** 

- [Local development](#local-development)
- [Docker environment (optional)](#docker-environment-optional)
  - [Installation](#installation)
  - [Start and stop the containers](#start-and-stop-the-containers)
  - [Running commands inside the container](#running-commands-inside-the-container)
  - [Map style](#map-style)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Local development

Run the application with `python3 -m http.server` and then check `localhost:8000` for results.

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

When the containers are running, you can execute any command inside the environment. Just replace the dots `...` in the following example with the command you wish to execute:

```bash
docker-compose exec java /bin/bash -c "..."
```

Some examples are:

```bash
docker-compose exec java /bin/bash -c "mvn clean install"

# or

docker-compose exec java /bin/bash -c "mvn clean test"
```

### Map style
Default map style uses openstreetmap. To use the [Thunderforest](https://www.thunderforest.com) map style, you can add your Thunderforest API key to the configuration file in src/main/webapp/config.js
