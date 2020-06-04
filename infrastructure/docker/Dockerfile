FROM maven:3-jdk-8-alpine

RUN mkdir -p /code

# Dev
FROM base as dev
COPY infrastructure/docker/entrypoint.sh /entrypoint.sh
ENTRYPOINT [ "/entrypoint.sh" ]

# Build
FROM base as build
ARG JENKINS_GROUP_ID=1000
ARG JENKINS_USER_ID=1000
RUN addgroup -g $JENKINS_GROUP_ID jenkins && \
    adduser -D -u $JENKINS_USER_ID -G jenkins jenkins
WORKDIR /code
COPY ./ /code
RUN mvn -B -DskipTests install
CMD [ "mvn", "-B", "tomcat:run" ]