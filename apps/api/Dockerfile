# ==============================================================================
# AdhocX Production API Dockerfile (Hardened Multi-Stage Build)
# ==============================================================================

# Stage 1: Base image with core toolchain
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl dumb-init
RUN npm install -g pnpm@10.17.1 turbo
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS dependencies
COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml* ./
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/api/prisma/schema.prisma apps/api/prisma/
RUN pnpm install --frozen-lockfile

# Stage 3: Build contracts, generate Prisma client, and compile NestJS API
FROM dependencies AS builder
COPY . .
RUN pnpm --filter @adhocx/contracts build
RUN cd apps/api && npx prisma generate
RUN pnpm --filter @adhocx/api build

# Stage 4: Production Runner (Lean, Secure, Non-Root)
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init openssl curl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create application user & group
USER node

# Copy compiled artifacts and production dependencies
COPY --chown=node:node --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --chown=node:node --from=builder /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --chown=node:node --from=builder /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --chown=node:node --from=builder /app/apps/api/package.json ./apps/api/package.json

WORKDIR /app/apps/api

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/main.js"]
