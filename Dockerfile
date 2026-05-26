# =============================================================================
# Stage 1: Build the Vite + React application
# =============================================================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency manifests and install (layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the production bundle
RUN npm run build

# =============================================================================
# Stage 2: Serve the static bundle with Nginx
# =============================================================================
FROM nginx:stable-alpine AS runner

# Install curl for health checks (BusyBox wget lacks --spider flag)
RUN apk add --no-cache curl

# Copy the built assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Remove the default nginx config and copy our custom one
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Port exposed by the container
EXPOSE 80

# Health check (basic — verifies the server responds)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl --fail --silent http://localhost:80/ > /dev/null || exit 1

# Run nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
