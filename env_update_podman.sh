#!/bin/bash

# Get the github user from the argument
GITHUB_USER=$1;

echo "GitHub User: $GITHUB_USER";

# function to check if the site name is valid and has the first letter uppercase
is_FACILITY_name_valid() {
    [[ "$1" =~ ^[A-Z] ]]
}


add_to_file() {
    local file="$1"
    local entry="$2"
    if ! grep -q "^${entry}$" "$file"; then
        echo "$entry" | tee -a "$file" > /dev/null
        echo "Added $entry to $file"
    else
        echo "$entry already exists in $file"
    fi
}


# Ask the name of the site or plant
while true; do
    read -p "Please enter the name of the facility or plant (example: Langres or Andance): " FACILITY_NAME
    if [ -z "${FACILITY_NAME}" ]; then
        echo "The site name should not be empty. Please try again."
    elif ! is_FACILITY_name_valid "$FACILITY_NAME"; then
        echo "The site name should start with an uppercase letter. Please try again."
    else
        break
    fi
done

# Function to check for uppercase characters
contains_uppercase() {
    [[ "$1" =~ [A-Z] ]]
}

# Prompt for plant trigram
while true; do
    read -p "Please enter your plant trigram (example: lan): " PLANT_TRIGRAM
    if contains_uppercase "$PLANT_TRIGRAM"; then
        echo "The plant trigram should not contain uppercase characters. Please try again."
    else
        break
    fi
    if [ -z "${PLANT_TRIGRAM}" ]
    then
        echo "The plant trigram should not be empty. Please try again."
    fi
done

read -p "What Timezone to use? (default Europe/Paris) " TIMEZONE
if [ -z "${TIMEZONE}" ]
  then
    TIMEZONE="Europe/Paris"
fi


while true; do
    read -p "Is there a proxy in your network ? (yes/no) " PROXY_ANSWER;
    if [ "${PROXY_ANSWER}" == "yes" ] || [ "${PROXY_ANSWER}" == "no" ]; then 
      break;
    else
        echo "Please answer yes or no";
    fi
done

if [ "${PROXY_ANSWER}" == "yes" ]
  then
    read -p "Please enter your proxy address(default will be 'http://10.0.0.1'): " PROXY_ADDRESS
      if [ -z "${PROXY_ADDRESS}" ]
        then
        PROXY_ADDRESS="http://10.0.0.1"
      fi
    read -p "Please enter your proxy port(default will be '80'): " PROXY_PORT
      if [ -z "${PROXY_PORT}" ]
        then
        PROXY_PORT="80"
      fi
    PROXY_ENV="${PROXY_ADDRESS}:${PROXY_PORT}"
    PROXY_podmanFILE="ENV http_proxy=\'${PROXY_ADDRESS}:${PROXY_PORT}\'"
    sed -i "3s|.*|$PROXY_podmanFILE|" podman/podmanfile/podmanfile
fi


APP_CONTEXT_SH="dev"

sed -i "s|^APP_ENV=prod.*|APP_ENV=dev|" .env;
sed -i "s|^# MAILER_DSN=.*|MAILER_DSN=smtp://smtp.corp.ponet:25?verify_peer=0|" .env;
sed -i "s|^# MAILER_SENDER_EMAIL=.* |MAILER_SENDER_EMAIL=${PLANT_TRIGRAM}.docauposte@opmobility.com|" .env;

add_to_file ".env" "HOSTNAME=${HOSTNAME}";
add_to_file ".env" "PLANT_TRIGRAM=${PLANT_TRIGRAM}";
add_to_file ".env" "GITHUB_USER=${GITHUB_USER}";
add_to_file ".env" "FACILITY_NAME=${FACILITY_NAME}";

set -a
APP_CONTEXT=${APP_CONTEXT_SH}
PROXY_ENV=${PROXY_ENV}
APP_TIMEZONE=${TIMEZONE}
GITHUB_USER=${GITHUB_USER}
set +a

# Create app.yml file to use the template and the good variables
envsubst < ./template.yml > ./dap.yml;


podman play kube --replace ./dap.yml

# Wait until the container is listed as running
until [ "$(podman ps -q -f name=web-docauposte)" ]; do
  echo "Waiting for container web-docauposte to start..."
  sleep 1
done

# Wait until the webpack compiled successfully
until podman logs --since 10s --tail 10 web-docauposte 2>&1 | grep -q "webpack compiled successfully"; do
  echo "Waiting for the webpack to be compiled" 
  sleep 10
done

echo "Webpack compiled successfully";

podman play kube --down ./dap.yml

sleep 30;

sed -i "s|APP_ENV=dev.*|APP_ENV=prod|" .env;

APP_CONTEXT_SH="prod";

set -a
APP_CONTEXT=${APP_CONTEXT_SH}
PROXY_ENV=${PROXY_ENV}
APP_TIMEZONE=${TIMEZONE}
GITHUB_USER=${GITHUB_USER}
set +a

# Create app.yml file to use the template and the good variables
envsubst < ./template.yml > ./dap.yml;



cat > src/Kernel.php <<EOL
<?php

namespace App;

use Symfony\Bundle\FrameworkBundle\Kernel\MicroKernelTrait;
use Symfony\Component\HttpKernel\Kernel as BaseKernel;

class Kernel extends BaseKernel
{
    use MicroKernelTrait;

    public function boot(): void
    {
        parent::boot();
        date_default_timezone_set('${TIMEZONE}');
    }
}
EOL