pipeline {
    agent any

    stages {
        stage('Test') {
            steps {
                sh """
                    cd src/main/webapp
                    test -f index.html
                    test -f dotenv.js
                """
            }
        }
    }
}
