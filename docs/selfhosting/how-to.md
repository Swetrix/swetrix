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
- Support for the x86_64 or arm64 CPU architecture on your server
- At least 2GB of RAM is recommended for the best performance

Most of the cloud providers offer Docker pre-installed on their servers, but in case it's missing, you can install it manually by following the [official Docker installation guide](https://docs.docker.com/get-docker/).
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

That repository contains a `configure.sh` script that will help you set up the environment variables. It will ask you to enter variables like email and password, and autogenerate some other necessary variables as well.

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

- `swetrix-api` - the main API server running on port `8080` by default
- `swetrix-fe` - the frontend server running on port `80` by default
- Redis server for caching
- Clickhouse server for analytics and transactional data

After starting the container you can access the dashboard at `http://{host}:80`.

## Updating

To update Swetrix to the latest version, please refer to the changelog on our [GitHub repository](https://github.com/swetrix/swetrix). Usually, Swetrix releases come with database migrations that you'll need to apply manually. So make sure to backup your database before updating and follow the changelog instructions carefully.

## Reverse proxy

If you use reverse proxy like Nginx, please set it up to pass the request IP address as the `x-real-ip` header, otherwise it may cause the problems related to API route rate limiting and analytics sessions. If the `x-real-ip` header is undefined, Swetrix will use `x-forwarded-for` or the request IP address as a backup.

If you are using Cloudflare as a proxy for your self-hosted Swetrix instance, you can set the `CLOUDFLARE_PROXY_ENABLED` environment variable to `true`. This will force Swetrix to check the `cf-connecting-ip` header for the IP address.
