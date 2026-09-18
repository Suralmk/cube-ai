# ==========================================
# Stage 1: Build & Dependencies
# ==========================================
FROM node:22-alpine AS builder

# Enable Corepack and PNPM (matching lockfile v9)
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy dependency definitions
COPY package.json pnpm-lock.yaml .npmrc ./

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy application source and build configurations
COPY tsconfig.json tsconfig.build.json nest-cli.json drizzle.config.ts ./
COPY src/ ./src/
COPY drizzle/ ./drizzle/
COPY scripts/ ./scripts/

# Compile NestJS application to /app/dist
RUN pnpm run build

# Remove development dependencies to keep production image minimal
RUN pnpm prune --prod

# ==========================================
# Stage 2: Production Runtime
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000

# Install curl for health check
RUN apk --no-cache add curl

# Copy production dependencies and build artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Create storage directory and set non-root ownership
RUN mkdir -p /app/storage && chown -R node:node /app

# Switch to non-root user
USER node

EXPOSE 8000

# Health check matching the application's liveness endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health/live || exit 1

CMD ["node", "dist/main"]
