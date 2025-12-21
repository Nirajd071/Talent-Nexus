# ================================================
# HireSphere - Multi-Stage Dockerfile
# ================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ================================================
# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies
RUN apk add --no-cache tini wget

# Create non-root user for security
RUN addgroup -g 1001 -S hiresphere && \
    adduser -S hiresphere -u 1001 -G hiresphere

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p uploads && chown -R hiresphere:hiresphere uploads

# Set ownership
RUN chown -R hiresphere:hiresphere /app

# Switch to non-root user
USER hiresphere

# Expose port
EXPOSE 5000

# Environment variables (can be overridden)
ENV NODE_ENV=production
ENV PORT=5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/index.cjs"]
