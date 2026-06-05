#Stage 1: Build
FROM mcr.microsoft.com/playwright:v1.60.0-noble AS build
WORKDIR /build
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package*.json ./
COPY scripts/patch-rrvideo.js ./scripts/patch-rrvideo.js
RUN npm ci --force
COPY . .
RUN npm run deploy:community
RUN node ./meta/dbip-free-sync.js
RUN npm prune --omit=dev --force

#Stage 2: Runtime
FROM mcr.microsoft.com/playwright:v1.60.0-noble AS run
LABEL maintainer="swetrix.com <contact@swetrix.com>"

ENV TZ=UTC \
    NODE_ENV=production \
    NPM_CONFIG_OMIT=dev

ENV REDIS_HOST=localhost \
    REDIS_PORT=6379 \
    CLICKHOUSE_HOST=http://localhost \
    CLICKHOUSE_USER=default \
    CLICKHOUSE_PORT=8123 \
    CLICKHOUSE_DATABASE=analytics

ENV OIDC_ENABLED=false \
    OIDC_ONLY_AUTH=false

ENV IS_PRIMARY_NODE=true

ENV OIDC_CLIENT_ID='' \
    OIDC_DISCOVERY_URL='' \
    OIDC_CLIENT_SECRET=''

# Install video tooling and configure timezone
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ffmpeg tzdata && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    rm -rf /var/lib/apt/lists/*

# Use non-root numeric user
USER 999
WORKDIR /app

# Copy files (updated to remove user:group ownership since we're not creating them)
COPY --from=build /build/package*.json ./
COPY --from=build /build/dist/ ./dist/
COPY --from=build /build/ip-geolocation-db.mmdb ./ip-geolocation-db.mmdb
COPY --from=build /build/migrations ./migrations
COPY --from=build /build/node_modules/ ./node_modules/

EXPOSE 5005
HEALTHCHECK --interval=30s --timeout=5s \
    CMD wget -nv -t1 --spider 'http://localhost:5005/ping' || exit 1

CMD [ "npm", "run", "start:prod" ]
