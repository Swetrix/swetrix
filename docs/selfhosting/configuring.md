---
title: Configuring
slug: /selfhosting/configuring
---

:::note
The easiest way to get started with Swetrix is by [using our cloud service](https://swetrix.com). We do all the dirty work for you: hosting, maintenance, backups, worldwide CDN, etc. Using Cloud you still own the data, you can export it or delete it at any time you want. By using Swetrix Cloud you support maintenance and development of the product, which eventually makes it better.
:::

The following environment variables are available for configuration:

## Frontend (swetrix-fe)
| Variable | Default | Description |
| --- | --- | --- |
| `API_URL` | `http://localhost:8080/` | URL of the backend API |

## API
| Variable | Default | Description |
| --- | --- | --- |
| `EMAIL` | `test@test.com` | Email address to use for access to dashboard |
| `PASSWORD` | `12345678` | Password to use for access to dashboard |
| `JWT_ACCESS_TOKEN_SECRET` | `jwt-access-token-secret` | Secret for JWT access tokens |
| `JWT_REFRESH_TOKEN_SECRET` | `jwt-refresh-token-secret` | Secret for JWT refresh tokens |
| `REDIS_HOST` | `redis` | Redis host |
| `CLICKHOUSE_HOST` | `http://clickhouse` | ClickHouse host |
| `API_ORIGINS` | | A list of allowed origins (for the `Access-Control-Allow-Origin` header) |
| `API_KEY` | | An optional API key for accessing your stats via the API directly. If not set - direct API access is disabled. |
| `CLOUDFLARE_PROXY_ENABLED` | `false` | If set to `true` - Swetrix will get geolocation and IP address information from `cf-connecting-ip` and `cf-ipcountry` headers provided by Cloudflare. |

## Redis
| Variable | Default | Description |
| --- | --- | --- |
| `REDIS_PASSWORD` | `password` | Redis password |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_USER` | `default` | Redis user |

## Clickhouse
| Variable | Default | Description |
| --- | --- | --- |
| `CLICKHOUSE_DATABASE` | `analytics` | ClickHouse database |
| `CLICKHOUSE_USER` | `default` | ClickHouse user |
| `CLICKHOUSE_PORT` | `8123` | ClickHouse port |
| `CLICKHOUSE_PASSWORD` | | ClickHouse password |
