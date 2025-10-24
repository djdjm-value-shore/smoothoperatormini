#!/bin/sh
set -e

# Substitute PORT environment variable in nginx config
# Railway provides PORT, default to 80 for local development
export PORT=${PORT:-80}

echo "=== Starting SmoothOperator Web Service ==="
echo "PORT: $PORT"
echo "Processing nginx config template..."

# Use envsubst to replace ${PORT} in the config file
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Generated nginx config:"
cat /etc/nginx/conf.d/default.conf | head -10

echo "Starting nginx on port $PORT..."

# Start nginx in foreground
exec nginx -g 'daemon off;'
