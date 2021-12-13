<img src="https://swetrix.com/assets/logo_blue.svg" alt="" height="100" />

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

#### Security

`JWT_SECRET`=SOME_SECRET_TOKEN

#### MySQL Database

`MYSQL_HOST`=localhost  
`MYSQL_USER`=root
`MYSQL_ROOT_PASSWORD`=password  
`MYSQL_DATABASE`=analytics

#### Redis Database

`REDIS_HOST`=localhost  
`REDIS_PORT`=6379
`REDIS_USER`=default
`REDIS_PASSWORD`=password

#### Clickhouse Database

`CLICKHOUSE_HOST`=http://localhost  
`CLICKHOUSE_USER`=default  
`CLICKHOUSE_PORT`=8123  
`CLICKHOUSE_PASSWORD`=password  
`CLICKHOUSE_DATABASE`=analytics

#### Swetrix Admin Account

`EMAIL`=test@test.com
`PASSWORD`=12345678

### Running Swetrix-API behind a Reverse Proxy

Make sure to set up your reverse proxy to pass the request IP address as an `x-forwarded-for` header, otherwise it may cause the issues related to API routes rate-limiting and analytics sessions.  
The API depends on several Cloudflare headers (`cf-ipcountry` and `cf-connecting-ip` as a backup), so ideally you should use it too.  
The production swetrix.com API is covered by the Cloudflare proxying.
