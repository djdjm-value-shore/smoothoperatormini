# Multi-stage Dockerfile for SmoothOperator Web
# Optimized for minimal size

# ============================================
# Stage 1: Build React application with Vite
# ============================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files for dependency caching
COPY package.json package-lock.json* ./

# Install dependencies (use npm ci for reproducible builds)
RUN npm ci --silent

# Copy source code
COPY . .

# Build arguments for Vite environment variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build production bundle
RUN npm run build

# ============================================
# Stage 2: Production - Nginx server
# ============================================
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (Railway provides $PORT dynamically)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:${PORT:-80}/ || exit 1

# Start nginx with PORT substitution
# Railway provides $PORT, default to 80 for local
CMD sh -c "envsubst '\$PORT' < /etc/nginx/conf.d/default.conf > /tmp/nginx.conf && cat /tmp/nginx.conf > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
