const { ClickHouse } = require('clickhouse')
const _ = require('lodash')
const chalk = require('chalk')
require('dotenv').config()

const clickhouse = new ClickHouse({
  url: process.env.CLICKHOUSE_HOST,
  port: _.toNumber(process.env.CLICKHOUSE_PORT),
  debug: false,
  basicAuth: {
    username: process.env.CLICKHOUSE_USER,
    password: process.env.CLICKHOUSE_PASSWORD,
  },
  isUseGzip: false,
  format: 'json',
  raw: false,
  config: {
    session_timeout: 60,
    output_format_json_quote_64bit_integers: 0,
    enable_http_compression: 0,
    database: process.env.CLICKHOUSE_DATABASE,
  },
})

const clickhouseNoDatabase = new ClickHouse({
  url: process.env.CLICKHOUSE_HOST,
  port: _.toNumber(process.env.CLICKHOUSE_PORT),
  debug: false,
  basicAuth: {
    username: process.env.CLICKHOUSE_USER,
    password: process.env.CLICKHOUSE_PASSWORD,
  },
  isUseGzip: false,
  format: 'json',
  raw: false,
  config: {
    session_timeout: 60,
    output_format_json_quote_64bit_integers: 0,
    enable_http_compression: 0,
  },
})

const databaselessQueriesRunner = async (queries) => {
  let failed = false
  for (const query of queries) {
    if (failed) {
      return
    }

    if (query) {
      try {
        await clickhouseNoDatabase.query(query).toPromise()
        console.log(chalk.green('Query OK: '), query)
      } catch (error) {
        console.error(chalk.red('Query ERROR: '), query)
        console.error(error)
        failed = true
      }
    }
  }
}

const queriesRunner = async (queries, log = true) => {
  let failed = false

  for (const query of queries) {
    if (failed) {
      return false
    }

    if (query) {
      try {
        await clickhouse.query(query).toPromise()

        if (log) {
          console.log(chalk.green('Query OK: '), query)
        }
      } catch (error) {
        if (log) {
          console.error(chalk.red('Query ERROR: '), query)
          console.error(error)
        }
        failed = true
      }
    }
  }

  return true
}

const dbName = process.env.CLICKHOUSE_DATABASE

module.exports = {
  clickhouse,
  queriesRunner,
  databaselessQueriesRunner,
  dbName,
}
