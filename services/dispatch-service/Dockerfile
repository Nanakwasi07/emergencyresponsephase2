# ─────────────────────────────────────────────────────────────────────────────
# Dispatch Service — includes Socket.IO; build context must be PROJECT ROOT.
# Render: Root Directory = repo root, Dockerfile Path = services/dispatch-service/Dockerfile
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS deps
WORKDIR /app

COPY services/dispatch-service/package*.json ./services/dispatch-service/
RUN cd services/dispatch-service && npm ci --omit=dev

FROM node:20-alpine
WORKDIR /app

COPY common/ ./common/
COPY services/dispatch-service/src/ ./services/dispatch-service/src/
COPY services/dispatch-service/package.json ./services/dispatch-service/
COPY --from=deps /app/services/dispatch-service/node_modules ./services/dispatch-service/node_modules

ENV NODE_ENV=production

WORKDIR /app/services/dispatch-service

# HTTP + Socket.IO both run on the same port
EXPOSE 3003

CMD ["node", "src/server.js"]
