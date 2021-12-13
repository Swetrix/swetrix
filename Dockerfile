# Stage 1
FROM node:lts-alpine as build
ARG API_URL
ENV TZ=Etc/UTC \
    REACT_APP_API_URL=${API_URL} \
    REACT_APP_SELFHOSTED=true \
    CHOKIDAR_USEPOLLING=true \
    GENERATE_SOURCEMAP=false
RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/$TZ /etc/localtime
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install && npm run build

# Stage 2
FROM nginx:stable-alpine
ENV TZ=Etc/UTC
RUN rm -rf /usr/share/nginx/html/*
RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/$TZ /etc/localtime
COPY --from=build /app/deployment/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD curl -f http://localhost/ || exit 1