# Stage 1
FROM node:lts-alpine as build
ENV TZ=Etc/UTC \
    REACT_APP_SELFHOSTED=true \
    CHOKIDAR_USEPOLLING=true \
    GENERATE_SOURCEMAP=false
RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/$TZ /etc/localtime
WORKDIR /app
COPY . .
RUN chmod +x ./deployment/50-substitute-env-variables.sh
RUN npm install -g pnpm && pnpm install && npm run build

# Stage 2
FROM nginx:stable-alpine
ENV TZ=Etc/UTC
RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/$TZ /etc/localtime
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/build /usr/share/nginx/html
COPY --from=build /app/deployment/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/deployment/50-substitute-env-variables.sh /docker-entrypoint.d/
EXPOSE 80
HEALTHCHECK CMD curl -f http://localhost/ || exit 
