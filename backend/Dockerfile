#Stage 1: Build
FROM node:lts-alpine as build
WORKDIR /build
COPY package*.json .
RUN npm install --force
COPY . .
RUN npm run deploy:community
RUN node ./meta/dbip-sync.js

#Stage 2: Runtime
FROM node:lts-alpine as run
LABEL maintainer="swetrix.com <contact@swetrix.com>"

# System and security configs
ENV TZ=UTC \
    NODE_ENV=production \
    JWT_ACCESS_TOKEN_SECRET=jwt-access-token-secret \
    JWT_REFRESH_TOKEN_SECRET=jwt-refresh-token-secret

# Service connections
ENV REDIS_HOST=localhost \
    REDIS_PORT=6379 \
    CLICKHOUSE_HOST=http://localhost \
    CLICKHOUSE_USER=default \
    CLICKHOUSE_PORT=8123 \
    CLICKHOUSE_DATABASE=analytics

# Authentication mode settings
ENV OIDC_ENABLED=false \
    OIDC_ONLY_AUTH=false

# Application configs
ENV EMAIL=test@test.com \
    PASSWORD=12345678 \
    IS_PRIMARY_NODE=true

# OIDC Configuration (optional)
ENV OIDC_ISSUER='' \
    OIDC_CLIENT_ID='' \
    OIDC_CLIENT_SECRET='' \
    OIDC_CALLBACK_URL='' \
    OIDC_AUTH_URL='' \
    OIDC_TOKEN_URL='' \
    OIDC_USERINFO_URL='' \
    OIDC_SCOPE='openid email profile'

# Install and configure timezone
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    apk del tzdata

# Use non-root numeric user
USER 999
WORKDIR /app

# Copy files (updated to remove user:group ownership since we're not creating them)
COPY --from=build /build/package*.json ./
COPY --from=build /build/dist/ ./dist/
COPY --from=build /build/dbip-city-lite.mmdb ./dbip-city-lite.mmdb
COPY --from=build /build/migrations ./migrations
COPY --from=build /build/node_modules/ ./node_modules/

EXPOSE 5005
HEALTHCHECK --interval=30s --timeout=5s \
    CMD wget -nv -t1 --spider 'http://localhost:5005/ping' || exit 1

CMD [ "npm", "run", "start:prod" ]
