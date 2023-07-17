<!--
SPDX-FileCopyrightText: NOI Techpark <digital@noi.bz.it>

SPDX-License-Identifier: CC0-1.0
-->

# it.bz.opendatahub.analytics

[![REUSE Compliance](https://github.com/noi-techpark/it.bz.opendatahub.analytics/actions/workflows/reuse.yml/badge.svg)](https://github.com/noi-techpark/odh-docs/wiki/REUSE#badges)
[![CI/CD](https://github.com/noi-techpark/it.bz.opendatahub.analytics/actions/workflows/main.yml/badge.svg)](https://github.com/noi-techpark/it.bz.opendatahub.analytics/actions/workflows/main.yml)

This is a web application hosted on https://analytics.opendatahub.com to show
data from the [Open Data Hub](https://opendatahub.com) in various forms. It is
also possible to download data to process it with your preferred tool on your
machine.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents** 

- [it.bz.opendatahub.analytics](#itbzopendatahubanalytics)
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

## REUSE

This project is [REUSE](https://reuse.software) compliant, more information about the usage of REUSE in NOI Techpark repositories can be found [here](https://github.com/noi-techpark/odh-docs/wiki/Guidelines-for-developers-and-licenses#guidelines-for-contributors-and-new-developers).

Since the CI for this project checks for REUSE compliance you might find it useful to use a pre-commit hook checking for REUSE compliance locally. The [pre-commit-config](.pre-commit-config.yaml) file in the repository root is already configured to check for REUSE compliance with help of the [pre-commit](https://pre-commit.com) tool.

Install the tool by running:
```bash
pip install pre-commit
```
Then install the pre-commit hook via the config file by running:
```bash
pre-commit install
```
