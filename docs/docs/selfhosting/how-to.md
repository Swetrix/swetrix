---
title: How to self-host Swetrix
slug: /selfhosting/how-to
---

Swetrix supports self-hosting via Docker. You can run Swetrix on your own server or on a cloud provider of your choice. It's easy to set up and maintain, no need to be a Docker expert.

:::note
The easiest way to get started with Swetrix is by [using our cloud service](https://swetrix.com). We do all the dirty work for you: hosting, maintenance, backups, worldwide CDN, etc. Using Cloud you still own the data, you can export it or delete it at any time you want. By using Swetrix Cloud you support maintenance and development of the product, which eventually makes it better.
:::

## Prerequisites

To self-host Swetrix you need to have the following:

- A server with Docker and Docker Compose installed
- Support for the x86_64 or arm64 CPU architecture on your server
- At least 2GB of RAM is recommended for the best performance

Most of the cloud providers offer Docker pre-installed on their servers, but in case it's missing, you can install it manually by following the [official Docker installation guide](https://docs.docker.com/engine/install/ubuntu/).
We've tested self-hosting Swetrix using [Hetzner Cloud](https://hetzner.cloud), but any other cloud provider should work just fine.

## Installation

### 1. Install the self-hosting repository

To self-host Swetrix, download the [self-hosting repository](https://github.com/swetrix/selfhosting) from GitHub.

```bash
git clone https://github.com/swetrix/selfhosting
cd selfhosting
```

That repository contains a `compose.yaml` file with all the necessary configuration to run Swetrix, you'll need to configure it later.

The repository also contains various configuration files to ease the setup process (for example, `nginx` or `clickhouse` config files).

### 2. Configure the environment variables

That repository contains a `configure.sh` script that will help you set up the environment variables. It will help you configure and autogenerate some necessary variables.

This script will also check if you have Docker and Docker Compose installed, and if you don't, it will try to install them for you.

The script will save the environment variables to a `.env` file in the repository directory. You can later change them manually if needed.

```bash
./configure.sh
```

You can always manually edit these `.env` variables later. Please refer to the [configuration section](/selfhosting/configuring) for more information.

### 3. Run the container

Once all the environment variables are set, you can start the containers by running the following command:

```bash
docker compose up -d
```

After you run this command, the following containers will be started:
- swetrix-fe - the frontend server (internal port 3000)
- swetrix-api - the main API server (internal port 5005)
- nginx-proxy - routes requests to the frontend and API (port 80 by default)
- Redis server for caching
- Clickhouse server for analytics and transactional data

After starting the container you can access the dashboard at `http://{host}:80` (or your configured reverse-proxy domain).

## Updating

To update Swetrix to the latest version, please refer to the changelog on our GitHub repository.
Usually, Swetrix releases come with database migrations that you'll need to apply manually. So make sure to backup your database before updating and follow the changelog instructions carefully.

## Reverse proxy & Swetrix v5 routing

Swetrix v5 routes API requests through the web entrypoint. Instead of exposing 2 different services (web & backend) to the internet, you only expose one (the web endpoint) and route API requests internally.
The default routing is:
- Frontend: /
- API: /backend/ (proxied to swetrix-api)

### Nginx proxy (default)

The self-hosting repository includes an nginx-proxy service and an nginx/config file. The nginx-proxy container listens on port 80 and forwards:
/ → swetrix (frontend, port 3000)
/backend/ → swetrix-api (API, port 5005)
If you use another reverse proxy in front of Swetrix (for example for TLS termination), keep exposing only the nginx-proxy service and forward traffic to it.

### Traefik (alternative to nginx-proxy)

If you are already using Traefik, you can omit the nginx-proxy service and route requests directly to the Swetrix containers by path.
swetrix-fe labels:
  - traefik.enable=true
  - traefik.http.routers.swetrix_fe.rule=Host(`analytics.example.com`) && PathPrefix(`/`)
  - traefik.http.routers.swetrix_fe.entrypoints=https
  - traefik.http.routers.swetrix_fe.tls=true
  - traefik.http.routers.swetrix_fe.priority=1
  - traefik.http.services.swetrix_fe.loadbalancer.server.port=3000

swetrix-api labels:
  - traefik.enable=true
  - traefik.http.routers.swetrix_be.rule=Host(`analytics.example.com`) && PathPrefix(`/backend`)
  - traefik.http.routers.swetrix_be.entrypoints=https
  - traefik.http.routers.swetrix_be.tls=true
  - traefik.http.routers.swetrix_be.priority=100
  - traefik.http.middlewares.swetrix_be_strip.stripprefix.prefixes=/backend
  - traefik.http.routers.swetrix_be.middlewares=swetrix_be_strip
  - traefik.http.services.swetrix_be.loadbalancer.server.port=3001

## Client IP headers

If you are using proxy for your self-hosted Swetrix instance, you should set the CLIENT_IP_HEADER environment variable. For example, if your proxy is Cloudflare, then you should set CLIENT_IP_HEADER to cf-connecting-ip.
If you are using Traefik (or another reverse proxy) and are not behind Cloudflare, CLIENT_IP_HEADER=x-forwarded-for is usually the correct value.
