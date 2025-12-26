# Swetrix Admin CLI

An interactive CLI tool for managing Swetrix.

## Prerequisites

- Node.js >= 22
- Access to the Swetrix MySQL and ClickHouse databases
- Environment variables configured (either in `admin/.env` or `backend/.env`)

## Installation

```bash
cd admin
npm install
```

## Configuration

The CLI reads database configuration from environment variables. You can either:

1. Create an `.env` file in the `admin/` directory
2. Or rely on the existing `backend/.env` file (it will be auto-loaded)

Required environment variables:

```env
# MySQL
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_ROOT_PASSWORD=your_password
MYSQL_DATABASE=analytics

# ClickHouse
CLICKHOUSE_HOST=http://localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
CLICKHOUSE_DATABASE=analytics
```

## Usage

Run the CLI using:

```bash
npm run dev
```

Or build and run:

```bash
npm run build
node dist/index.js
```
