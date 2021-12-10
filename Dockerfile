# Stage 1
FROM node:lts-alpine as build
ENV TZ=Etc/UTC
RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/$TZ /etc/localtime
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install && npm run build

# Stage 2
FROM nginx:stable-alpine
RUN rm -rf /usr/share/nginx/html/*
ENV TZ=Etc/UTC
RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/$TZ /etc/localtime
COPY --from=build /app/deployment/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD curl -f http://localhost/ || exit 1