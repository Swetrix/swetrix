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
- A server with Docker installed
- Support for the x86_64 CPU architecture on your server

Most of the cloud providers offer Docker pre-installed on their servers, but in case it's missing, you can install it manually by following the [official Docker installation guide](https://docs.docker.com/get-docker/).
We've tested self-hosting Swetrix using [Hetzner Cloud](https://hetzner.cloud/?ref=xIW4H6LVD01I) (affiliate link), but any other cloud provider should work just fine.

## Installation

### 1. Install the self-hosting repository
To self-host Swetrix, download the [self-hosting repository](https://github.com/swetrix/selfhosting) from GitHub.
```bash
git clone https://github.com/swetrix/selfhosting
cd selfhosting
```

That repository contains a `docker-compose.yml` file with all the necessary configuration to run Swetrix, you'll need to configure it later.

The repository also contains various configuration files to ease the setup process (for example, `nginx` config files).

### 2. Configure the environment variables
Swetrix uses environment variables to configure itself. You can find the list of all available environment variables in the [configuration section](/selfhosting/configuring).

Most of the environment variables are already set by default, but you need to set the following variables:
- `EMAIL` - email address user will use to log in to the dashboard
- `PASSWORD` - password user will use to log in to the dashboard
- `JWT_ACCESS_TOKEN_SECRET` - secret for JWT access tokens, basically a random string of 60 characters.
- `JWT_REFRESH_TOKEN_SECRET` - secret for JWT refresh tokens, also a random 60 chars string, but this one should be different from the access token secret.
- `API_URL` - URL (or an IP address) of the machine you're hosting Swetrix on.

### 3. Run the container
Before running the following command, make sure that you have Docker installed on your server. You may refer to the [Digital Ocean docker installation guide](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-20-04) for more information.

Once you've set up the server, you're ready to start up the server:

```bash
docker compose up -d
```

After you run this command, the following containers will be started:
- `swetrix-api` - the main API server running on port 8080 by default
- `swetrix-fe` - the frontend server running on port 80 by default
- Redis server for caching
- Clickhouse server for analytics data and transactional stuff

After starting the container you can access the dashboard at `http://{host}:80`.

## Updating
To update Swetrix to the latest version you have to pull Swetrix images from the Docker Hub and restart the container.

First, pull the Swetrix API image:
```bash
docker pull swetrix/swetrix-api
```

Next, pull the Swetrix frontend image:
```bash
docker pull swetrix/swetrix-fe
```

And then restart the container:
```bash
docker compose restart
```

## Reverse proxy
It's best to make sure your reverse proxy is set up to pass the request IP address as the `x-real-ip` header, otherwise it may cause the problems related to API route rate limiting and analytics sessions. If the `x-real-ip` header is undefined, Swetrix will use `x-forwarded-for` as a backup.

If you are using Cloudflare as a proxy for your self-hosted Swetrix instance, you can set the `CLOUDFLARE_PROXY_ENABLED` environment variable to `true`. This will allow the Swetrix API to retrieve geolocation and IP address information from the headers provided by Cloudflare (`cf-ipcountry` and `cf-connecting-ip`).
