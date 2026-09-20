# ==============================================================================
# AdhocX Production Marketing & SEO Portal Dockerfile (Astro Static + Nginx Alpine)
# ==============================================================================

# Stage 1: Build static assets
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@10.17.1 turbo
WORKDIR /app

# Copy root workspace config and manifests
COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml* ./
COPY apps/marketing/package.json apps/marketing/
RUN pnpm install --frozen-lockfile

# Copy marketing source code and compile
COPY apps/marketing ./apps/marketing
RUN pnpm --filter @adhocx/marketing build

# Stage 2: Serve static bundle via ultra-light Nginx Alpine
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Clean default nginx files
RUN rm -rf ./*

# Copy built static output
COPY --from=builder /app/apps/marketing/dist ./

# Embed custom optimized Nginx server configuration
RUN printf 'server {\n\
    listen 80;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;\n\
    gzip_vary on;\n\
\n\
    location /healthz {\n\
        access_log off;\n\
        return 200 "healthy\\n";\n\
    }\n\
\n\
    location / {\n\
        try_files $uri $uri/ $uri.html /index.html =404;\n\
    }\n\
\n\
    error_page 404 /404.html;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=20s --timeout=3s --retries=3 \
    CMD wget -q --spider http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
