# ─────────────────────────────────────────────
# Stage: dev
# Used by docker-compose (target: dev) with
# ./frontend/src volume-mounted for Vite HMR.
# ─────────────────────────────────────────────
FROM node:20-alpine AS dev

WORKDIR /app

# NPM_TOKEN is required to install private @ecoonline packages.
# Written inline and removed so the token is not baked into the final layer.
# Pass via: docker compose up --build  (reads NPM_TOKEN from root .env)
ARG NPM_TOKEN

# Install deps first for cache efficiency
COPY package.json package-lock.json ./
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && \
    npm ci && \
    rm -f .npmrc

# Source code is volume-mounted in dev; copy here
# so the image is self-contained if used standalone.
COPY src/ src/
COPY index.html .
COPY vite.config.ts tsconfig.json tailwind.config.js postcss.config.js ./

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ─────────────────────────────────────────────
# Stage: build
# Compiles React app into static assets.
# ─────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

ARG NPM_TOKEN
# VITE_API_BASE_URL is baked into the JS bundle at build time.
# Set to the backend's public URL in Railway (e.g. https://macc-production.up.railway.app/api/v1).
# Defaults to /api/v1 (relative) for local docker-compose where nginx proxies.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# VITE_DEV_TOKEN is baked into the JS bundle at build time.
# Set to a long-lived JWT in Railway service variables.
ARG VITE_DEV_TOKEN
ENV VITE_DEV_TOKEN=$VITE_DEV_TOKEN

COPY package.json package-lock.json ./
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && \
    npm ci && \
    rm -f .npmrc

COPY src/ src/
COPY index.html .
COPY vite.config.ts tsconfig.json tailwind.config.js postcss.config.js ./

RUN npm run build

# ─────────────────────────────────────────────
# Stage: prod
# Default target — used by Railway.
# Serves built assets via nginx with SPA
# routing fallback and API proxy.
# ─────────────────────────────────────────────
FROM nginx:alpine AS prod

# Copy built static assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config template and a custom entrypoint that scopes envsubst
# to only our variables (PORT, BACKEND_URL), leaving nginx's own $vars intact.
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Defaults — Railway overrides PORT; docker-compose overrides BACKEND_URL
ENV PORT=80
ENV BACKEND_URL=backend:8000

EXPOSE 80
CMD ["/docker-entrypoint.sh"]
