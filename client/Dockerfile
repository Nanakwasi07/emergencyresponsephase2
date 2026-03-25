# ─────────────────────────────────────────────────────────────────────────────
# React Client — multi-stage build with nginx.
# Build context: client/ directory.
# Render: Root Directory = client/, Dockerfile Path = Dockerfile.
#
# Required Render build-time env vars (set in Render dashboard):
#   VITE_AUTH_URL      e.g. https://emergency-auth.onrender.com
#   VITE_INCIDENT_URL  e.g. https://emergency-incident.onrender.com
#   VITE_DISPATCH_URL  e.g. https://emergency-dispatch.onrender.com
#   VITE_ANALYTICS_URL e.g. https://emergency-analytics.onrender.com
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: build Vite app ───────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Receive API base URLs as build args so Vite can bake them in
ARG VITE_AUTH_URL
ARG VITE_INCIDENT_URL
ARG VITE_DISPATCH_URL
ARG VITE_ANALYTICS_URL

ENV VITE_AUTH_URL=$VITE_AUTH_URL
ENV VITE_INCIDENT_URL=$VITE_INCIDENT_URL
ENV VITE_DISPATCH_URL=$VITE_DISPATCH_URL
ENV VITE_ANALYTICS_URL=$VITE_ANALYTICS_URL

COPY . .
RUN npm run build

# ── Stage 2: serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
