# ─────────────────────────────────────────────────────────────────────────────
# Auth Service — build context must be the PROJECT ROOT so that common/ is
# accessible. On Render set "Root Directory" to the repo root and
# "Dockerfile Path" to services/auth-service/Dockerfile.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: install production dependencies ─────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY services/auth-service/package*.json ./services/auth-service/
RUN cd services/auth-service && npm ci --omit=dev

# ── Stage 2: runtime image ───────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Shared common modules (used via ../../../common/ relative paths)
COPY common/ ./common/

# Service source and pre-built node_modules
COPY services/auth-service/src/ ./services/auth-service/src/
COPY services/auth-service/package.json ./services/auth-service/
COPY --from=deps /app/services/auth-service/node_modules ./services/auth-service/node_modules

ENV NODE_ENV=production

WORKDIR /app/services/auth-service

EXPOSE 3001

# Render injects PORT; server.js reads process.env.PORT first
CMD ["node", "src/server.js"]
