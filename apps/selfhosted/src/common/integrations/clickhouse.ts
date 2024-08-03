import { createClient } from '@clickhouse/client'

const clickhouse = createClient({
  url: `${process.env.CLICKHOUSE_HOST}:${process.env.CLICKHOUSE_PORT}`,
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

    // Used for analytics & captcha stuff.
    // https://clickhouse.com/docs/en/optimize/asynchronous-inserts
    wait_for_async_insert: 0, // Return ACK (await) when row was added to the buffer, not flushed to the database
    async_insert_busy_timeout_ms: 15000, // 15 seconds; this is how long the buffer will be kept before writing stuff into the database
  },
})

export { clickhouse }
