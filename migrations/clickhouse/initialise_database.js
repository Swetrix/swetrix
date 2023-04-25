// This script initialises the Swetrix cloud edition database and tables if they're absent
const { queriesRunner, dbName, databaselessQueriesRunner } = require('./setup')

const CLICKHOUSE_DB_INIT_QUERIES = [
  `CREATE DATABASE IF NOT EXISTS ${dbName}`,
]

const CLICKHOUSE_INIT_QUERIES = [
  // The traffic data table
  `CREATE TABLE IF NOT EXISTS analytics.analytics
  (
    sid Nullable(String),
    pid FixedString(12),
    pg Nullable(String),
    dv Nullable(String),
    br Nullable(String),
    os Nullable(String),
    lc Nullable(String),
    ref Nullable(String),
    so Nullable(String),
    me Nullable(String),
    ca Nullable(String),
    cc Nullable(FixedString(2)),
    sdur Nullable(UInt32), 
    unique UInt8,
    created DateTime
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  // Custom events table
  `CREATE TABLE IF NOT EXISTS analytics.customEV
  (
    pid FixedString(12),
    ev String,
    pg Nullable(String),
    dv Nullable(String),
    br Nullable(String),
    os Nullable(String),
    lc Nullable(String),
    ref Nullable(String),
    so Nullable(String),
    me Nullable(String),
    ca Nullable(String),
    cc Nullable(FixedString(2)),
    created DateTime
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  // The performance data table
  `CREATE TABLE IF NOT EXISTS analytics.performance
  (
    pid FixedString(12),
    pg Nullable(String),
    dv Nullable(String),
    br Nullable(String),
    cc Nullable(FixedString(2)),
    dns Nullable(UInt32),
    tls Nullable(UInt32),
    conn Nullable(UInt32),
    response Nullable(UInt32),
    render Nullable(UInt32),
    domLoad Nullable(UInt32),
    pageLoad Nullable(UInt32),
    ttfb Nullable(UInt32),
    created DateTime
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,
]

databaselessQueriesRunner(CLICKHOUSE_DB_INIT_QUERIES)
  .then(() => queriesRunner(CLICKHOUSE_INIT_QUERIES))
  .catch((error) => {
    console.error(`[ERROR] Error occured whilst initialising the database: ${error}`)
  })
