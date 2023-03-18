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
| `CLIENT_URL` | `https://swetrix.com/` | URL of the frontend |
| `TWO_FACTOR_AUTHENTICATION_APP_NAME` | `Swetrix` | Name of the 2FA app |
| `REDIS_HOST` | `redis` | Redis host |
| `MYSQL_HOST` | `mariadb` | MySQL host |
| `CLICKHOUSE_HOST` | `http://clickhouse` | ClickHouse host |
| `API_ORIGINS` | `` | A list of allowed origins (for the `Access-Control-Allow-Origin` header) |
| `SMTP_MOCK` | `true` | Whether to use a mock SMTP server (should be set to `true` as the selfhosted does ignores SMTP auth yet) |
| `TG_BOT_TOKEN` | `` | Telegram bot token (for integrations & login notifications) |

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
| `CLICKHOUSE_PASSWORD` | `password` | ClickHouse password |

## MariaDB (soon to be removed)
| Variable | Default | Description |
| --- | --- | --- |
| `MYSQL_ROOT_PASSWORD` | `password` | MySQL root password |
| `MYSQL_DATABASE` | `analytics` | MySQL database |
| `MYSQL_USER` | `swetrix` | MySQL user |
| `MYSQL_PASSWORD` | `password` | MySQL password |