# ==============================================================================
# AdhocX Production Marketing Web App (High-Performance Nginx Alpine)
# ==============================================================================

FROM nginx:1.27-alpine

# Remove default Nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY apps/marketing/nginx.conf /etc/nginx/conf.d/default.conf

# Copy marketing website assets
COPY apps/marketing/*.html /usr/share/nginx/html/
COPY apps/marketing/styles /usr/share/nginx/html/styles
COPY apps/marketing/scripts /usr/share/nginx/html/scripts

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q --spider http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
