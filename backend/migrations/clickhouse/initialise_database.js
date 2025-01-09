// This script initialises the Swetrix cloud edition database and tables if they're absent
const { queriesRunner, dbName, databaselessQueriesRunner } = require('./setup')

const CLICKHOUSE_DB_INIT_QUERIES = [`CREATE DATABASE IF NOT EXISTS ${dbName}`]

const CLICKHOUSE_INIT_QUERIES = [
  // The traffic data table
  `CREATE TABLE IF NOT EXISTS ${dbName}.analytics
  (
    psid Nullable(UInt64),
    pid FixedString(12),
    hostname Nullable(String),
    pg Nullable(String),
    dv LowCardinality(Nullable(String)),
    br LowCardinality(Nullable(String)),
    brv Nullable(String),
    os LowCardinality(Nullable(String)),
    osv Nullable(String),
    lc LowCardinality(Nullable(String)),
    ref Nullable(String),
    so Nullable(String),
    me Nullable(String),
    ca Nullable(String),
    te Nullable(String),
    co Nullable(String),
    cc Nullable(FixedString(2)),
    rg LowCardinality(Nullable(String)),
    ct Nullable(String),
    meta Nested
    (
      key String,
      value String
    ),
    created DateTime('UTC')
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  // Session duration table
  `CREATE TABLE IF NOT EXISTS ${dbName}.session_durations
  (
    psid UInt64,
    pid FixedString(12),
    duration UInt32
  )
  ENGINE = MergeTree()
  ORDER BY (pid, psid);`,

  // Custom events table
  `CREATE TABLE IF NOT EXISTS ${dbName}.customEV
  (
    psid Nullable(UInt64),
    pid FixedString(12),
    hostname Nullable(String),
    ev String,
    pg Nullable(String),
    dv LowCardinality(Nullable(String)),
    br LowCardinality(Nullable(String)),
    brv Nullable(String),
    os LowCardinality(Nullable(String)),
    osv Nullable(String),
    lc LowCardinality(Nullable(String)),
    ref Nullable(String),
    so Nullable(String),
    me Nullable(String),
    ca Nullable(String),
    te Nullable(String),
    co Nullable(String),
    cc Nullable(FixedString(2)),
    rg LowCardinality(Nullable(String)),
    ct Nullable(String),
    meta Nested
    (
      key String,
      value String
    ),
    created DateTime('UTC')
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  // The performance data table
  `CREATE TABLE IF NOT EXISTS ${dbName}.performance
  (
    pid FixedString(12),
    hostname Nullable(String),
    pg Nullable(String),
    dv LowCardinality(Nullable(String)),
    br LowCardinality(Nullable(String)),
    brv Nullable(String),
    cc Nullable(FixedString(2)),
    rg LowCardinality(Nullable(String)),
    ct Nullable(String),
    dns Nullable(UInt32),
    tls Nullable(UInt32),
    conn Nullable(UInt32),
    response Nullable(UInt32),
    render Nullable(UInt32),
    domLoad Nullable(UInt32),
    pageLoad Nullable(UInt32),
    ttfb Nullable(UInt32),
    created DateTime('UTC')
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  // Error events table
  `CREATE TABLE IF NOT EXISTS ${dbName}.errors
  (
    eid FixedString(32),
    pid FixedString(12),
    hostname Nullable(String),
    pg Nullable(String),
    dv LowCardinality(Nullable(String)),
    br LowCardinality(Nullable(String)),
    brv Nullable(String),
    os LowCardinality(Nullable(String)),
    osv Nullable(String),
    lc LowCardinality(Nullable(String)),
    cc LowCardinality(Nullable(FixedString(2))),
    rg LowCardinality(Nullable(String)),
    ct Nullable(String),
    name String,
    message Nullable(String),
    lineno Nullable(UInt32),
    colno Nullable(UInt32),
    filename Nullable(String),
    created DateTime('UTC')
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  // Error events status table
  `CREATE TABLE IF NOT EXISTS ${dbName}.error_statuses (
    eid FixedString(32),
    pid FixedString(12),
    status Enum8('active', 'regressed', 'resolved'),
    updated DateTime('UTC') DEFAULT now()
  )
  ENGINE = ReplacingMergeTree()
  PRIMARY KEY (eid, pid);`,

  // The CAPTCHA data table
  `CREATE TABLE IF NOT EXISTS ${dbName}.captcha
  (
    pid FixedString(12),
    dv LowCardinality(Nullable(String)),
    br LowCardinality(Nullable(String)),
    os Nullable(String),
    cc Nullable(FixedString(2)),
    manuallyPassed UInt8,
    created DateTime('UTC')
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.monitor_responses
  (
    monitorId UInt64,         
    region LowCardinality(Nullable(String)),
    responseTime UInt32,
    timestamp UInt32,              
    statusCode UInt32,
    created DateTime('UTC') DEFAULT now()
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (monitorId, created);`,
]

const initialiseDatabase = async () => {
  try {
    await databaselessQueriesRunner(CLICKHOUSE_DB_INIT_QUERIES)
    await queriesRunner(CLICKHOUSE_INIT_QUERIES)
  } catch (reason) {
    console.error(
      `[ERROR] Error occured whilst initialising the database: ${reason}`,
    )
  }
}

initialiseDatabase()

module.exports = {
  initialiseDatabase,
}
