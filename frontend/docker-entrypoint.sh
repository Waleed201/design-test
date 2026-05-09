#!/bin/sh
# Substitute BACKEND_URL into the nginx config at container startup,
# then exec nginx so it becomes PID 1 (required for Cloud Run signal handling).

set -e

: "${BACKEND_URL:=http://localhost:5000}"

envsubst '${BACKEND_URL}' < /etc/nginx/templates/nginx.conf.template \
    > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
