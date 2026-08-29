# Multi-stage Dockerfile per RiveStream Stremio Addon

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copia i descrittori delle dipendenze
COPY package*.json tsconfig.json ./

# Installa tutte le dipendenze per la compilazione
RUN npm ci

# Copia il codice sorgente
COPY src/ ./src/
COPY public/ ./public/

# Compila il TypeScript e copia le cartelle data/public
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=7033

# Installa solo le dipendenze di produzione
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copia i file compilati e le risorse statiche
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Crea la directory di cache
RUN mkdir -p /app/cache/channels && chown -R node:node /app

USER node

EXPOSE 7033

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:7002/health || exit 1

CMD ["node", "dist/index.js"]
