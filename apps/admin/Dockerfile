# ==============================================================================
# AdhocX Production Admin Control Panel Dockerfile (Next.js Standalone)
# ==============================================================================

# Stage 1: Base image
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@10.17.1 turbo
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS dependencies
COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml* ./
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY apps/admin/package.json apps/admin/
RUN pnpm install --frozen-lockfile

# Stage 3: Build contracts & Next.js standalone
FROM dependencies AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @adhocx/contracts build
RUN pnpm --filter @adhocx/admin build

# Stage 4: Production Runner (Non-Root Next.js Standalone Runner)
FROM node:20-alpine AS runner
RUN apk add --no-cache curl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output and static assets
COPY --from=builder /app/apps/admin/public ./apps/admin/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static

USER nextjs

EXPOSE 3001

HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3001/ || exit 1

CMD ["node", "apps/admin/server.js"]
