const { createClient } = require('@clickhouse/client')
require('dotenv').config({
  quiet: true,
})

const chalk = {
  green: text => `\x1b[32m${text}\x1b[0m`,
  red: text => `\x1b[31m${text}\x1b[0m`,
  purple: text => `\x1b[35m${text}\x1b[0m`,
}

const clickhouse = createClient({
  url: `${process.env.CLICKHOUSE_HOST}:${process.env.CLICKHOUSE_PORT}`,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
  database: process.env.CLICKHOUSE_DATABASE,
  request_timeout: 24 * 60 * 60 * 1000,
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
  url: `${process.env.CLICKHOUSE_HOST}:${process.env.CLICKHOUSE_PORT}`,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
  request_timeout: 24 * 60 * 60 * 1000,
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

const databaselessQueriesRunner = async (queries, log = true) => {
  for (const query of queries) {
    if (!query) continue

    try {
      if (log) {
        console.log(chalk.purple('Running query:'), query)
      }
      await clickhouseNoDatabase.command({
        query,
      })
      if (log) {
        console.log(chalk.green('Query OK'))
      }
    } catch (error) {
      if (log) {
        console.error(chalk.red('Query ERROR: '), query)
        console.error(error)
      }
      throw error
    }
  }
}

/**
 * @typedef {import('@clickhouse/client').CommandParams} CommandParams
 *
 * @param {string[]} queries
 * @param {boolean} log
 * @param {Omit<CommandParams, 'query'>} params
 * @returns
 */
const queriesRunner = async (queries, log = true, params = {}) => {
  for (const query of queries) {
    if (!query) continue

    try {
      if (log) {
        console.log(chalk.purple('Running query:'), query)
      }
      await clickhouse.command({
        ...params,
        query,
      })

      if (log) {
        console.log(chalk.green('Query OK'))
      }
    } catch (error) {
      if (log) {
        console.error(chalk.red('Query ERROR'))
        console.error(error)
      }
      throw error
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
