# ─────────────────────────────────────────────────────────────────────────────
# Incident Service — build context must be the PROJECT ROOT.
# Render: Root Directory = repo root, Dockerfile Path = services/incident-service/Dockerfile
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS deps
WORKDIR /app

COPY services/incident-service/package*.json ./services/incident-service/
RUN cd services/incident-service && npm ci --omit=dev

FROM node:20-alpine
WORKDIR /app

COPY common/ ./common/
COPY services/incident-service/src/ ./services/incident-service/src/
COPY services/incident-service/package.json ./services/incident-service/
COPY --from=deps /app/services/incident-service/node_modules ./services/incident-service/node_modules

ENV NODE_ENV=production

WORKDIR /app/services/incident-service

EXPOSE 3002

CMD ["node", "src/server.js"]
