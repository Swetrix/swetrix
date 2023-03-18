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

### 1. Install package from the Docker Hub
To install Swetrix from the Docker Hub, run the following command:
```bash
docker pull swetrix/swetrix-api
```

Alternatively you can clone our Github repository and build the image yourself:
```bash
git clone https://github.com/swetrix/swetrix-api
cd swetrix-api
docker build -t swetrix-api .
```

### 2. Configure the environment variables
Swetrix uses environment variables to configure itself. You can find the list of all available environment variables in the [configuration section](/selfhosting/configuring).

Most of the environment variables are already set by default, but you need to set the following variables:
- `EMAIL` - email address user will use to log in to the dashboard
- `PASSWORD` - password user will use to log in to the dashboard

### 3. Run the container
Once you've set up the server, you're ready to start up the server:

```bash
docker-compose up -d
```

After you run this command, the following containers will be started:
- `swetrix-api` - the main API server running on port 5005 by default
- `swetrix-fe` - the frontend server running on port 80 by default
- Redis server for caching
- Clickhouse server for analytics data and transactional stuff
- (Soon to be removed) MySQL server

After starting the main container you can access the dashboard at `http://{host}:80`.

## Updating
To update Swetrix to the latest version, run the following command:
```bash
docker pull swetrix/swetrix-api
```

Then restart the container:
```bash
docker-compose restart
```
