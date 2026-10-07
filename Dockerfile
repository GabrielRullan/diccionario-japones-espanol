# Multi-stage Dockerfile for Google Cloud Run (Node 24 with native node:sqlite)
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Cloud Run security best practice: run as non-root user
USER node

COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node server.js ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node data ./data
COPY --chown=node:node public ./public

EXPOSE 8080

CMD ["node", "server.js"]
