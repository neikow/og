# Stage 1: install all workspace dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Copy workspace manifests and lockfile
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install all deps (including devDeps needed for build)
# --ignore-scripts so postinstall (native rebuild) runs after we have build tools
RUN npm ci --ignore-scripts

# Rebuild native modules for the current platform
RUN npm rebuild better-sqlite3
RUN npm rebuild @resvg/resvg-js || true


# Stage 2: build the API
FROM deps AS build-api
WORKDIR /app

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN npm run build -w apps/api


# Stage 3: build the web SPA
FROM deps AS build-web
WORKDIR /app

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN npm run build -w apps/web


# Stage 4: production runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Build-time args injected by CI (docker/build-push-action --build-arg)
ARG IMAGE_TAG=dev
ARG IMAGE_SHA=
ENV IMAGE_TAG=${IMAGE_TAG}
ENV IMAGE_SHA=${IMAGE_SHA}

# Copy compiled API
COPY --from=build-api /app/apps/api/dist ./dist

# Copy web SPA into the location serveStatic expects
COPY --from=build-web /app/apps/web/dist ./public

# Copy Drizzle migrations so the API can run them at startup
COPY --from=build-api /app/apps/api/drizzle ./drizzle

# Copy production node_modules (native modules must match this image's libc)
# We rebuild natives here to ensure they match the runner image
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Rebuild native modules inside the final image to guarantee ABI compatibility
# RUN npm rebuild better-sqlite3 --prefix /app || \
#    (cd /app && node -e "require('better-sqlite3')" 2>/dev/null || true)

EXPOSE 3000

# Data directory is expected to be mounted as a volume
VOLUME ["/app/data"]

CMD ["node", "dist/index.js"]
