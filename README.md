<img src="https://swetrix.com/assets/logo_blue.svg" alt="" height="100" />

[![Dockerhub pulls](https://img.shields.io/docker/pulls/swetrix/swetrix-api.svg?style=flat)](https://hub.docker.com/r/swetrix/swetrix-api)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/swetrix/swetrix-api/issues)

# Swetrix Analytics API

## Development

```bash
# install dependencies with package manager of your choice
$ npm install

# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Selfhosted Deployment

### Prerequisites

To run Swetrix-API on your own servers you need to setup 3 databases.

> Why we need three databases?
>
> - MYSQL for projects, users and tokens
> - Clickhouse for Analytics and Custom Events
> - Redis for Caching

We recommend using the Docker-Compose file we provided.

Setup MySQL, Clickhouse and Redis databases as Docker Containers.
Then fill out the Environment Variables below accordingly.

### Environment Variables

Below you will find the Environment Variables that are required to run the API. The values next to them are their default values. You can change them to your own values or just not set them if they suit you anyway. (e.g. Ports, Username, etc.)

_(current versions at the time of publication August 1, 2022)_

[Environment variables example](.env.example)

### Running Swetrix-API behind a Reverse Proxy

Make sure to set up your reverse proxy to pass the request IP address as an `x-forwarded-for` header, otherwise it may cause the issues related to API routes rate-limiting and analytics sessions.\
The API depends on several Cloudflare headers (`cf-ipcountry` and `cf-connecting-ip` as a backup), so ideally you should use it too.\
The production swetrix.com API is covered by the Cloudflare proxying.

## Donate
You can support the project by donating us at https://ko-fi.com/andriir \
We can only run our services by once again asking for your financial support!
