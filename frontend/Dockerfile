# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:16-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build:prod

# ── Stage 2: serve ───────────────────────────────────────────────────────────
FROM nginx:1.25-alpine

# gettext provides envsubst
RUN apk add --no-cache gettext

# Copy built Angular app
COPY --from=builder /app/dist/certificate-engine /usr/share/nginx/html

# Copy nginx template (rendered at startup by entrypoint)
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

# Copy and mark entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Cloud Run serves on 8080 by default
EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
