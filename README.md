<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" /></a>
</p>

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment
### The beployment process has been tested on Debian, but should work well on other APT-based OS as well
Install MySQL, Clickhouse and Redis databases:
```bash
sudo apt-get install apt-transport-https ca-certificates dirmngr
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv E0C56BD4

echo "deb https://repo.clickhouse.tech/deb/stable/ main/" | sudo tee /etc/apt/sources.list.d/clickhouse.list

sudo apt -y update
sudo apt -y upgrade
sudo apt -y install mariadb-server redis-server clickhouse-server clickhouse-client

sudo service clickhouse-server start
```

MySQL DB setup:
```bash
mysql -uroot

# Inside the MySQL shell:
ALTER USER 'root'@'localhost' IDENTIFIED BY 'root_password';
flush privileges;
exit;

# Logging into the MySQL again
mysql -uroot -proot_password

create database analytics;
```

Clickhouse DB setup:
```bash
create database analytics;

use analytics;

CREATE TABLE analytics.analytics
(
    `id` UUID,
    `pid` FixedString(12),
    `ev` String,
    `pg` Nullable(String),
    `dv` Nullable(String),
    `br` Nullable(String),
    `os` Nullable(String),
    `lc` Nullable(String),
    `ref` Nullable(String),
    `so` Nullable(String),
    `me` Nullable(String),
    `ca` Nullable(String),
    `lt` Nullable(UInt16),
    `cc` Nullable(FixedString(2)),
    `unique` UInt8,
    `created` DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created)
ORDER BY (id, created, pid);
```

For Redis please run `redis-cli` to test if it's working well.\

NodeJS (v14 LTS) & NPM (and PM2) installation:
```bash
curl -sL https://deb.nodesource.com/setup_14.x | sudo bash -
sudo apt -y install nodejs gcc g++ make

npm i -g pm2
```

Copy the API source code (or `dist` build only, don't forget to copy `.env` into `dist` folder) into the `/root/swetrix/api`:
```bash
# Run on the server
mkdir /root/swetrix/api

# Run this command in the local machine in context of the API directory:
scp -rp ./* ./.env.example ./.eslintrc.js ./.prettierrc  root@SERVER_IP_ADDRESS:/root/swetrix/api
```
Make sure to set up `.env` variables

Install API's dependencies, create a build (please, make sure the `common/templates` **are included** into the `dist` build):
```bash
cd /root/swetrix/api
npm i
npm run build
```

Set up NGINX ( https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-debian-10 )\
