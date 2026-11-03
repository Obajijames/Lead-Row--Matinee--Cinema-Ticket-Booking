# Dockerfile for Lead Row Express Backend
# Multi-stage build for pnpm monorepo deployment

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Stage 1: Install dependencies
FROM base AS dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/seat-map/package.json ./packages/seat-map/

RUN pnpm install --frozen-lockfile

# Stage 2: Generate Prisma Client & Compile TypeScript
FROM dependencies AS builder
COPY apps/server ./apps/server
COPY tsconfig.base.json ./

WORKDIR /app/apps/server
RUN npx prisma generate
RUN pnpm build

# Stage 3: Minimal production runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy node modules and built assets
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY pnpm-workspace.yaml package.json ./

WORKDIR /app/apps/server

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

