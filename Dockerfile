# Multi-stage Dockerfile for Google Cloud Run
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Cloud Run security best practice: run as non-root user
USER node

COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node server.js ./
COPY --chown=node:node data ./data
COPY --chown=node:node public ./public

EXPOSE 8080

CMD ["node", "server.js"]
