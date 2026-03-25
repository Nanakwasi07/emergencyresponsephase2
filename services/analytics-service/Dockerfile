# ─────────────────────────────────────────────────────────────────────────────
# Analytics Service — build context must be PROJECT ROOT.
# Render: Root Directory = repo root, Dockerfile Path = services/analytics-service/Dockerfile
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS deps
WORKDIR /app

COPY services/analytics-service/package*.json ./services/analytics-service/
RUN cd services/analytics-service && npm ci --omit=dev

FROM node:20-alpine
WORKDIR /app

COPY common/ ./common/
COPY services/analytics-service/src/ ./services/analytics-service/src/
COPY services/analytics-service/package.json ./services/analytics-service/
COPY --from=deps /app/services/analytics-service/node_modules ./services/analytics-service/node_modules

ENV NODE_ENV=production

WORKDIR /app/services/analytics-service

EXPOSE 3004

CMD ["node", "src/server.js"]
