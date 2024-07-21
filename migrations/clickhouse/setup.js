/* eslint-disable @typescript-eslint/no-var-requires */

const { createClient } = require('@clickhouse/client')
const chalk = require('chalk')
require('dotenv').config()

const clickhouse = createClient({
  host: `${process.env.CLICKHOUSE_HOST}:${process.env.CLICKHOUSE_PORT}`,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
  database: process.env.CLICKHOUSE_DATABASE,
  request_timeout: 60000, // 1 minute
  clickhouse_settings: {
    connect_timeout: 60000,
    date_time_output_format: 'iso',
    max_download_buffer_size: (10 * 1024 * 1024).toString(),
    max_download_threads: 32,
    max_execution_time: 60000,
    output_format_json_quote_64bit_integers: 0,
    enable_http_compression: 0,
    log_queries: 0,
  },
})

const clickhouseNoDatabase = createClient({
  host: `${process.env.CLICKHOUSE_HOST}:${process.env.CLICKHOUSE_PORT}`,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
  request_timeout: 60000, // 1 minute
  clickhouse_settings: {
    connect_timeout: 60000,
    date_time_output_format: 'iso',
    max_download_buffer_size: (10 * 1024 * 1024).toString(),
    max_download_threads: 32,
    max_execution_time: 60000,
    output_format_json_quote_64bit_integers: 0,
    enable_http_compression: 0,
    log_queries: 0,
  },
})

const databaselessQueriesRunner = async queries => {
  let failed = false
  for (const query of queries) {
    if (failed) {
      return
    }

    if (query) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await clickhouseNoDatabase.query({
          query,
        })
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
        // eslint-disable-next-line no-await-in-loop
        await clickhouse.query({
          query,
        })

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

const dbName = process.env.CLICKHOUSE_DATABASE || 'analytics'

module.exports = {
  clickhouse,
  queriesRunner,
  databaselessQueriesRunner,
  dbName,
}
