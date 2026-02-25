# Build stage
FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:24.13.1-slim AS builder
RUN npm install -g npm@11.10.0 \
 && npm pack tar@7.5.8 \
 && tar -xzf tar-7.5.8.tgz -C /usr/local/lib/node_modules/npm/node_modules/tar --strip-components=1 \
 && rm tar-7.5.8.tgz \
 && npm install -g minimatch@10.2.2 \
 && npm cache clean --force
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl \
 && apt-get upgrade -y \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/api-service
# Install all dependencies for building
COPY api-service/package.json api-service/package-lock.json ./
RUN npm ci --ignore-scripts
# Copy source code and build
COPY api-service/tsconfig.json ./
COPY api-service/src/ ./src/
COPY api-service/@types/ ./@types/
RUN npm run build

# Production stage
FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:24.13.1-slim AS production
RUN npm install -g npm@11.10.0 \
 && npm pack tar@7.5.8 \
 && tar -xzf tar-7.5.8.tgz -C /usr/local/lib/node_modules/npm/node_modules/tar --strip-components=1 \
 && rm tar-7.5.8.tgz \
 && npm install -g minimatch@10.2.2 \
 && npm cache clean --force
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl \
 && apt-get upgrade -y \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/api-service
# Copy package.json and install only production dependencies
COPY api-service/package.json api-service/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
# Verify minimatch version and find all instances
RUN echo "=== Global minimatch check ===" && \
    npm list -g minimatch 2>/dev/null || echo "No global minimatch found" && \
    echo "=== Local minimatch check ===" && \
    npm list minimatch 2>/dev/null || echo "No local minimatch" && \
    echo "=== Find all minimatch files ===" && \
    find /usr /opt -name "*minimatch*" 2>/dev/null | head -20 || echo "No minimatch files found"
# Copy built application from build stage
COPY --from=builder /opt/api-service/dist ./dist
EXPOSE 3000
CMD ["node", "dist/app.js"]