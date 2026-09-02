# Multi-stage production build for AdhocX NestJS API
FROM node:20-alpine AS base
RUN npm install -g pnpm turbo
WORKDIR /app

# Dependencies Stage
FROM base AS dependencies
COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml* ./
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# Build Stage
FROM dependencies AS builder
COPY . .
RUN pnpm --filter @adhocx/contracts build
RUN pnpm --filter @adhocx/api build

# Production Runner Stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/config /app/packages/config
COPY --from=builder /app/packages/contracts /app/packages/contracts
COPY --from=builder /app/apps/api /app/apps/api
COPY --from=builder /app/node_modules /app/node_modules

WORKDIR /app/apps/api
EXPOSE 3000

CMD ["node", "dist/main.js"]
