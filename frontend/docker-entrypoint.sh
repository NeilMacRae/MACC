#!/bin/sh
set -e

# Substitute only our own variables into the nginx template.
# Using explicit var list prevents nginx's own $uri/$host/$remote_addr etc.
# from being clobbered by envsubst.
envsubst '${PORT} ${BACKEND_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
