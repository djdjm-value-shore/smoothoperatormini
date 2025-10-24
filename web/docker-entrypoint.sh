#!/bin/sh
set -e

# Substitute PORT environment variable in nginx config
# Railway provides PORT, default to 80 for local development
export PORT=${PORT:-80}

# Use envsubst to replace ${PORT} in the config file
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx in foreground
exec nginx -g 'daemon off;'
