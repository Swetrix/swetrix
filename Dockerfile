# Stage 1
FROM node:lts-alpine as build
ENV TZ=Etc/UTC \
    API_URL="https://example.com/api" \
    REACT_APP_SELFHOSTED=true \
    CHOKIDAR_USEPOLLING=true \
    GENERATE_SOURCEMAP=false \
    JQ_VERSION=1.6
RUN wget --no-check-certificate https://github.com/stedolan/jq/releases/download/jq-${JQ_VERSION}/jq-linux64 -O /tmp/jq-linux64
RUN cp /tmp/jq-linux64 /usr/bin/jq
RUN chmod +x /usr/bin/jq
RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/$TZ /etc/localtime
WORKDIR /app
COPY . .
RUN jq 'to_entries | map_values({ (.key) : ("$" + .key) }) | reduce .[] as $item ({}; . + $item)' ./src/config.json > ./src/config.tmp.json && mv ./src/config.tmp.json ./src/config.json
RUN npm install -g pnpm && pnpm install && npm run build

# Stage 2
FROM nginx:stable-alpine
ENV TZ=Etc/UTC
RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/$TZ /etc/localtime
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/deployment/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/deployment/start-nginx.sh /usr/bin/start-nginx.sh
RUN chmod +x /usr/bin/start-nginx.sh
COPY --from=build /app/build /usr/share/nginx/html
ENTRYPOINT ["/usr/bin/start-nginx.sh"]
EXPOSE 80
HEALTHCHECK CMD curl -f http://localhost/ || exit 
