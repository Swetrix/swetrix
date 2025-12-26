// This script initialises the Swetrix cloud edition database and tables if they're absent
const { queriesRunner, dbName, databaselessQueriesRunner } = require('./setup')

const CLICKHOUSE_DB_INIT_QUERIES = [`CREATE DATABASE IF NOT EXISTS ${dbName}`]

const CLICKHOUSE_INIT_QUERIES = [
  // The traffic data table
  `CREATE TABLE IF NOT EXISTS ${dbName}.analytics
  (
    psid Nullable(UInt64),
    profileId Nullable(String) CODEC(ZSTD(3)),
    pid FixedString(12),
    host Nullable(String) CODEC(ZSTD(3)),
    pg Nullable(String) CODEC(ZSTD(3)),
    dv LowCardinality(Nullable(String)),
    br LowCardinality(Nullable(String)),
    brv Nullable(String) CODEC(ZSTD(3)),
    os LowCardinality(Nullable(String)),
    osv Nullable(String) CODEC(ZSTD(3)),
    lc LowCardinality(Nullable(String)),
    ref Nullable(String) CODEC(ZSTD(3)),
    so Nullable(String) CODEC(ZSTD(3)),
    me Nullable(String) CODEC(ZSTD(3)),
    ca Nullable(String) CODEC(ZSTD(3)),
    te Nullable(String) CODEC(ZSTD(3)),
    co Nullable(String) CODEC(ZSTD(3)),
    cc Nullable(FixedString(2)),
    rg LowCardinality(Nullable(String)),
    rgc LowCardinality(Nullable(String)),
    ct Nullable(String) CODEC(ZSTD(3)),
    meta Nested
    (
      key String CODEC(ZSTD(3)),
      value String CODEC(ZSTD(3))
    ),
    created DateTime('UTC') CODEC(Delta(4), LZ4)
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  // Custom events table
  `CREATE TABLE IF NOT EXISTS ${dbName}.customEV
  (
    psid Nullable(UInt64),
    profileId Nullable(String) CODEC(ZSTD(3)),
    pid FixedString(12),
    host Nullable(String) CODEC(ZSTD(3)),
    ev String CODEC(ZSTD(3)),
    pg Nullable(String) CODEC(ZSTD(3)),
    dv LowCardinality(Nullable(String)),
    br LowCardinality(Nullable(String)),
    brv Nullable(String) CODEC(ZSTD(3)),
    os LowCardinality(Nullable(String)),
    osv Nullable(String) CODEC(ZSTD(3)),
    lc LowCardinality(Nullable(String)),
    ref Nullable(String) CODEC(ZSTD(3)),
    so Nullable(String) CODEC(ZSTD(3)),
    me Nullable(String) CODEC(ZSTD(3)),
    ca Nullable(String) CODEC(ZSTD(3)),
    te Nullable(String) CODEC(ZSTD(3)),
    co Nullable(String) CODEC(ZSTD(3)),
    cc Nullable(FixedString(2)),
    rg LowCardinality(Nullable(String)),
    rgc LowCardinality(Nullable(String)),
    ct Nullable(String) CODEC(ZSTD(3)),
    meta Nested
    (
      key String CODEC(ZSTD(3)),
      value String CODEC(ZSTD(3))
    ),
    created DateTime('UTC') CODEC(Delta(4), LZ4)
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  // The performance data table
  `CREATE TABLE IF NOT EXISTS ${dbName}.performance
  (
    pid FixedString(12),
    host Nullable(String) CODEC(ZSTD(3)),
    pg Nullable(String) CODEC(ZSTD(3)),
    dv LowCardinality(Nullable(String)),
    br LowCardinality(Nullable(String)),
    brv Nullable(String) CODEC(ZSTD(3)),
    cc Nullable(FixedString(2)),
    rg LowCardinality(Nullable(String)),
    rgc LowCardinality(Nullable(String)),
    ct Nullable(String) CODEC(ZSTD(3)),
    dns Nullable(UInt32),
    tls Nullable(UInt32),
    conn Nullable(UInt32),
    response Nullable(UInt32),
    render Nullable(UInt32),
    domLoad Nullable(UInt32),
    pageLoad Nullable(UInt32),
    ttfb Nullable(UInt32),
    created DateTime('UTC') CODEC(Delta(4), LZ4)
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  // Error events table
  `CREATE TABLE IF NOT EXISTS ${dbName}.errors
  (
    psid Nullable(UInt64),
    profileId Nullable(String) CODEC(ZSTD(3)),
    eid FixedString(32),
    pid FixedString(12),
    host Nullable(String) CODEC(ZSTD(3)),
    pg Nullable(String) CODEC(ZSTD(3)),
    dv LowCardinality(Nullable(String)),
    br LowCardinality(Nullable(String)),
    brv Nullable(String) CODEC(ZSTD(3)),
    os LowCardinality(Nullable(String)),
    osv Nullable(String) CODEC(ZSTD(3)),
    lc LowCardinality(Nullable(String)),
    cc LowCardinality(Nullable(FixedString(2))),
    rg LowCardinality(Nullable(String)),
    rgc LowCardinality(Nullable(String)),
    ct Nullable(String) CODEC(ZSTD(3)),
    name String CODEC(ZSTD(3)),
    message Nullable(String) CODEC(ZSTD(3)),
    stackTrace Nullable(String) CODEC(ZSTD(3)),
    meta Nested
    (
      key String CODEC(ZSTD(3)),
      value String CODEC(ZSTD(3))
    ),
    lineno Nullable(UInt32),
    colno Nullable(UInt32),
    filename Nullable(String) CODEC(ZSTD(3)),
    created DateTime('UTC') CODEC(Delta(4), LZ4)
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

  // Sessions table with ReplacingMergeTree for tracking session state
  `CREATE TABLE IF NOT EXISTS ${dbName}.sessions
  (
    psid UInt64,
    pid FixedString(12),
    profileId Nullable(String) CODEC(ZSTD(3)),
    firstSeen DateTime('UTC') CODEC(Delta(4), LZ4),
    lastSeen DateTime('UTC') CODEC(Delta(4), LZ4),
    pageviews UInt32 DEFAULT 1,
    events UInt32 DEFAULT 0
  )
  ENGINE = ReplacingMergeTree(lastSeen)
  ORDER BY (pid, psid)
  PARTITION BY toYYYYMM(firstSeen);`,

  // Feature flag evaluations table
  `CREATE TABLE IF NOT EXISTS ${dbName}.feature_flag_evaluations
  (
    pid FixedString(12),
    flagId String CODEC(ZSTD(3)),
    flagKey String CODEC(ZSTD(3)),
    result UInt8,
    profileId String CODEC(ZSTD(3)),
    created DateTime('UTC') CODEC(Delta(4), LZ4)
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, flagId, created)
  TTL created + INTERVAL 1 YEAR;`,

  // Experiment exposures table for tracking which variant each user sees
  `CREATE TABLE IF NOT EXISTS ${dbName}.experiment_exposures
  (
    pid FixedString(12),
    experimentId String CODEC(ZSTD(3)),
    variantKey String CODEC(ZSTD(3)),
    profileId String CODEC(ZSTD(3)),
    created DateTime('UTC') CODEC(Delta(4), LZ4)
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, experimentId, created)
  TTL created + INTERVAL 1 YEAR;`,

  // The CAPTCHA data table
  `CREATE TABLE IF NOT EXISTS ${dbName}.captcha
  (
    pid FixedString(12),
    dv LowCardinality(Nullable(String)),
    br LowCardinality(Nullable(String)),
    os Nullable(String) CODEC(ZSTD(3)),
    cc Nullable(FixedString(2)),
    manuallyPassed UInt8,
    created DateTime('UTC') CODEC(Delta(4), LZ4)
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  // Revenue table for storing payment/transaction data from payment providers
  `CREATE TABLE IF NOT EXISTS ${dbName}.revenue
  (
    pid FixedString(12),
    transaction_id String CODEC(ZSTD(3)),
    provider LowCardinality(String),
    type LowCardinality(String),
    status LowCardinality(String),
    amount Decimal64(4),
    original_amount Decimal64(4),
    original_currency LowCardinality(String),
    currency LowCardinality(String),
    profile_id Nullable(String) CODEC(ZSTD(3)),
    session_id Nullable(String) CODEC(ZSTD(3)),
    product_id Nullable(String) CODEC(ZSTD(3)),
    product_name Nullable(String) CODEC(ZSTD(3)),
    metadata String DEFAULT '{}' CODEC(ZSTD(3)),
    created DateTime('UTC') CODEC(Delta(4), LZ4),
    synced_at DateTime('UTC') CODEC(Delta(4), LZ4)
  )
  ENGINE = ReplacingMergeTree(synced_at)
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, transaction_id);`,
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
