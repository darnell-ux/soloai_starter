# SvelteKit (TaxNexus) production image — adapter-node standalone server.
# Multi-stage: build with full toolchain, ship a slim runtime with pruned prod deps.

# ---- builder ----------------------------------------------------------------
FROM node:20-alpine AS builder

# better-sqlite3 (Better Auth) is a native module — needs a C/C++ toolchain to compile.
RUN apk add --no-cache libc6-compat build-base python3

WORKDIR /app

# Install with a clean, lockfile-exact tree (better caching: deps before source).
COPY package.json package-lock.json ./
RUN npm ci

# Build the app. These ARGs satisfy the env validator (src/lib/server/env.bootstrap),
# which runs at build time because vite sets NODE_ENV=production.
# Only PUBLIC_* values are inlined into the client bundle — pass the REAL public origin there.
# Server-only values (STRAPI_API_URL, DATABASE_URL) are validated for FORMAT only at build
# and overridden at runtime via env_file, so placeholders here are fine and bake no secrets.
ARG PUBLIC_STRAPI_URL=https://cms.taxnexusapp.com
ARG STRAPI_API_URL=https://cms.taxnexusapp.com
ARG DATABASE_URL=mysql://placeholder:placeholder@db:3306/soloai_db
ARG BETTER_AUTH_SECRET=build_time_placeholder_secret_min_32_characters
ARG BETTER_AUTH_URL=https://taxnexusapp.com
ENV NODE_ENV=production \
    PUBLIC_STRAPI_URL=$PUBLIC_STRAPI_URL \
    STRAPI_API_URL=$STRAPI_API_URL \
    DATABASE_URL=$DATABASE_URL \
    BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET \
    BETTER_AUTH_URL=$BETTER_AUTH_URL

COPY . .
RUN npm run build

# Drop dev dependencies; keep the compiled native better-sqlite3 binary.
RUN npm prune --omit=dev

# ---- runner -----------------------------------------------------------------
FROM node:20-alpine AS runner

# Runtime needs libc6-compat for the prebuilt/compiled native module.
RUN apk add --no-cache libc6-compat

WORKDIR /app
ENV NODE_ENV=production

# adapter-node server, pruned prod deps (incl. native better-sqlite3), and manifest.
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Better Auth SQLite + JSON billing store live here; mounted to a named volume in compose.
RUN mkdir -p /app/data && chown -R node:node /app
USER node

# adapter-node listens on PORT/HOST; ORIGIN is set for CSRF behind the nginx TLS proxy.
ENV PORT=3000 HOST=0.0.0.0
EXPOSE 3000

CMD ["node", "build/index.js"]
