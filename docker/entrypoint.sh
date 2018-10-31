#!/bin/bash

mkdir -p ~/.m2
cat << EOF
<settings>
    <localRepository>$PWD/docker/tmp/.m2</localRepository>
    <servers></servers>
</settings>
EOF > ~/.m2/settings.xml

/bin/bash -c "$@"
