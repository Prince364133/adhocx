# ==============================================================================
# AdhocX Production Mobile Client Dockerfile (Flutter Web + Nginx Alpine)
# ==============================================================================

# Stage 1: Build Flutter Web release assets
FROM ghcr.io/cirruslabs/flutter:3.29.0 AS builder
WORKDIR /app

# Accept API URL build argument
ARG NEXT_PUBLIC_API_URL=http://localhost:7001/api/v1
ENV API_BASE_URL=$NEXT_PUBLIC_API_URL

# Copy Flutter dependencies definitions
COPY apps/mobile/pubspec.yaml apps/mobile/pubspec.lock* ./
RUN flutter pub get

# Copy mobile source files and compile web release
COPY apps/mobile ./
RUN flutter build web --release --no-tree-shake-icons

# Stage 2: Serve web bundle via lightweight Nginx Alpine
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Clean default nginx files
RUN rm -rf ./*

# Copy built Flutter web bundle
COPY --from=builder /app/build/web ./

# Embed custom Nginx configuration supporting SPA routing and WASM
RUN printf 'server {\n\
    listen 80;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml application/wasm;\n\
    gzip_vary on;\n\
\n\
    location /healthz {\n\
        access_log off;\n\
        return 200 "healthy\\n";\n\
    }\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html =404;\n\
        add_header Cache-Control "no-cache, must-revalidate";\n\
    }\n\
\n\
    location ~* \\.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg|wasm)$ {\n\
        expires 6M;\n\
        access_log off;\n\
        add_header Cache-Control "public, max-age=15552000, immutable";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=20s --timeout=3s --retries=3 \
    CMD wget -q --spider http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
