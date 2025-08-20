# Multi-stage Dockerfile for NestJS Booking Microservice

# Base stage with Node.js
FROM node:18-alpine AS base
WORKDIR /app

# Install build dependencies for native modules like argon2
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development
# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Expose ports for all services
EXPOSE 5000 5001 3001

# Default development command (will be overridden by docker-compose)
CMD ["npm", "run", "dev"]

# Production build stage
FROM base AS build
# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Install runtime dependencies for native modules
RUN apk add --no-cache python3 make g++

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from build stage
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER nestjs

# Expose ports
EXPOSE 5000 5001 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/apps/booking-microservice/main.js --health-check || exit 1

# Default production command (will be overridden by docker-compose)
CMD ["npm", "run", "start:prod"]