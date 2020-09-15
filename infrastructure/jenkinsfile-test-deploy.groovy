pipeline {
    agent any

    options {
        ansiColor('xterm')
    }

    environment {
        AWS_ACCESS_KEY_ID = credentials('aws_secret_key_id')
        AWS_SECRET_ACCESS_KEY = credentials('aws_secret_access_key')

        LOG_APPLICATION_NAME = "opendatahub-analytics"

        ENDPOINT_URL = "https://analytics.opendatahub.testingmachine.eu"
        THUNDERFOREST_MAP_API_KEY = credentials('thunderforest_api_key')
        ODH_MOBILITY_API_URI = "https://mobility.api.opendatahub.testingmachine.eu"

        KEYCLOAK_AUTHORIZATION_URI = "https://auth.opendatahub.testingmachine.eu/auth"
        KEYCLOAK_REALM = "noi"
        KEYCLOAK_CLIENT_ID = "odh-mobility-analytics"
        KEYCLOAK_REDIRECT_URI = "https://analytics.opendatahub.testingmachine.eu/"
        KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI = "https://analytics.opendatahub.testingmachine.eu/callback.html"
    }

    stages {
        stage('Configure') {
            steps {
                sh """
                    rm -rf .env

                    echo 'LOG_APPLICATION_NAME=${LOG_APPLICATION_NAME}' >> .env                    
                    echo "ENDPOINT_URL=${ENDPOINT_URL}" >> .env
                    echo "THUNDERFOREST_MAP_API_KEY=${THUNDERFOREST_MAP_API_KEY}" >> .env
                    echo "ODH_MOBILITY_API_URI=${ODH_MOBILITY_API_URI}" >> .env

                    echo "KEYCLOAK_AUTHORIZATION_URI=${KEYCLOAK_AUTHORIZATION_URI}" >> .env
                    echo "KEYCLOAK_REALM=${KEYCLOAK_REALM}" >> .env
                    echo "KEYCLOAK_CLIENT_ID=${KEYCLOAK_CLIENT_ID}" >> .env
                    echo "KEYCLOAK_REDIRECT_URI=${KEYCLOAK_REDIRECT_URI}" >> .env
                    echo "KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI=${KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI}" >> .env

                    cd infrastructure
                    ./dotenv-sed.sh
                """

            }
        }
        stage('Test') {
            steps {
                sh """
                    cd src/main/webapp
                    test -f index.html
                    test -f dotenv.js
                """
            }
        }
        stage('Upload') {
            steps {
                s3Upload(bucket: 'odh.analytics-test', acl: 'PublicRead', file: './src/main/webapp')
            }
        }
    }
}
