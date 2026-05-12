# Usar Node.js oficial como base
FROM node:22-alpine AS builder

WORKDIR /app

# Dependencias primero (caché de capas)
COPY package*.json ./
RUN npm ci

# Código fuente
COPY tsconfig.json ./
COPY server.ts ./
COPY lib/ lib/
COPY public/ public/

# Build a JS
RUN npx tsc

# ── Imagen de producción ────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist/ ./
COPY --from=builder /app/public/ ./public/
COPY prisma/ ./prisma/

EXPOSE 3001

CMD ["node", "server.js"]
