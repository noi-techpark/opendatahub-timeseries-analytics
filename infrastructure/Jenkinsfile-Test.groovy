pipeline {
    agent any

    environment {
        DOCKER_PROJECT_NAME = "opendatahub-analytics"
        DOCKER_IMAGE = '755952719952.dkr.ecr.eu-west-1.amazonaws.com/opendatahub-analytics'
        DOCKER_TAG = "test-$BUILD_NUMBER"

		SERVER_PORT = "1080"
        LOG_APPLICATION_NAME = "opendatahub-analytics"

        ENDPOINT_URL = "https://analytics.opendatahub.testingmachine.eu"
        THUNDERFOREST_MAPS = credentials('thunderforest_api_key')
    }

    stages {
        stage('Configure') {
            steps {
                sh """
                    jq '.endpoints[0].url="${ENDPOINT_URL}"' src/main/webapp/WEB-INF/config.json > tmpFile && mv tmpFile src/main/webapp/WEB-INF/config.json
                    sed -i -e "s/\\(var thunderforest_api_key =\\).*/\\1'${THUNDERFOREST_MAPS}'/g" src/main/webapp/config.js
                """

            }
        }
        stage('Test') {
            steps {
                sh '''
                    docker network create authentication || true
                    docker-compose --no-ansi build --pull --build-arg JENKINS_USER_ID=$(id -u jenkins) --build-arg JENKINS_GROUP_ID=$(id -g jenkins)
                    docker-compose --no-ansi run --rm --no-deps -u $(id -u jenkins):$(id -g jenkins) app mvn -B clean test
                '''
            }
        }
        stage('Build') {
            steps {
                sh '''
                    aws ecr get-login --region eu-west-1 --no-include-email | bash
                    docker-compose --no-ansi -f infrastructure/docker-compose.build.yml build --pull
                    docker-compose --no-ansi -f infrastructure/docker-compose.build.yml push
                '''
            }
        }
        stage('Deploy') {
            steps {
               sshagent(['jenkins-ssh-key']) {
                    sh """
                        (cd infrastructure/ansible && ansible-galaxy install -f -r requirements.yml)
                        (cd infrastructure/ansible && ansible-playbook --limit=test deploy.yml --extra-vars "release_name=${BUILD_NUMBER}")
                    """
                }
            }
        }
    }
}
