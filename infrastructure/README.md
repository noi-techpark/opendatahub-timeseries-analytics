# Infrastructure for it.bz.opendatahub.analytics

The Mobility Analytics [analytics.opendatahub.bz.it](https://analytics.opendatahub.bz.it) consists of a S3 bucket on AWS that hosts the static web application.

## Servers

### Production Environment
#### Web frontend
- S3 Bucket to host the static webpage `odh.analytics-prod`
- URL = https://analytics.opendatahub.bz.it
- ALIASES = analytics.mobility.bz.it
- The domain (managed by TT Digital) points to proxy.opendatahub.bz.it, which redirects it to the S3 bucket

### Testing Environment
#### Web frontend
- S3 Bucket to host the static webpage `odh.analytics-test`
- URL = https://analytics.opendatahub.testingmachine.eu
- The domain (managed by TT Digital) points to proxy.opendatahub.bz.it, which redirects it to the S3 bucket

## External resources

### Thunderbird Map Tiles
We use Thunderbird Map Tiles from http://www.thunderforest.com, if the
corresponding API key has been given, otherwise the standard OSM Tiles
(https://www.openstreetmap.org) are used. See env variable `THUNDERFOREST_MAP_API_KEY`.

## Continuous Deployment
See https://github.com/noi-techpark/it.bz.opendatahub.analytics/actions

- On testing the static web app will be automatically deployed on each push to the main branch
- On production the static web app will be manually deployed from the prod branch

## Continous Integration
See https://github.com/noi-techpark/it.bz.opendatahub.analytics/actions

- The CI pipeline runs on every branch including pull requests and gives feedback to the Github repo

## Repositories
- https://github.com/noi-techpark/mobility-analytics
