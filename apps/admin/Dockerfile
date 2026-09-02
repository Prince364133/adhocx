# Multi-stage production build for AdhocX Admin Web (Next.js)
FROM node:20-alpine AS base
RUN npm install -g pnpm turbo
WORKDIR /app

# Dependencies Stage
FROM base AS dependencies
COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml* ./
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY apps/admin/package.json apps/admin/
RUN pnpm install --frozen-lockfile

# Build Stage
FROM dependencies AS builder
COPY . .
RUN pnpm --filter @adhocx/contracts build
RUN pnpm --filter @adhocx/admin build

# Production Runner Stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/apps/admin/public ./apps/admin/public
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static

EXPOSE 3001

CMD ["node", "apps/admin/server.js"]
