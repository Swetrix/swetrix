#Stage 1
FROM node:lts-alpine as build
WORKDIR /build
COPY . .
RUN npm i -g pnpm && pnpm i && npm run deploy:selfhosted

#Stage 2
FROM node:lts-alpine as run
ENV TZ=UTC \
    JWT_ACCESS_TOKEN_SECRET=jwt-access-token-secret \
    JWT_REFRESH_TOKEN_SECRET=jwt-refresh-token-secret \
    REDIS_HOST=localhost \
    REDIS_USER=default \
    REDIS_PASSWORD=password \
    REDIS_PORT=6379 \
    CLICKHOUSE_HOST=http://localhost \
    CLICKHOUSE_USER=default \
    CLICKHOUSE_PORT=8123 \
    CLICKHOUSE_PASSWORD=password \
    CLICKHOUSE_DATABASE=analytics \
    API_ORIGINS=\
    EMAIL=test@test.com \
    PASSWORD=12345678
RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/$TZ /etc/localtime
WORKDIR /app
COPY --from=build /build/package*.json ./
COPY --from=build /build/dist/ ./dist/
COPY --from=build /build/node_modules/ ./node_modules/
CMD [ "npm", "run", "start:prod" ]
EXPOSE 5005
HEALTHCHECK CMD wget -nv -t1 --spider 'http://localhost:5005/ping' || exit 1