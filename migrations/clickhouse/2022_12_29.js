const { queriesRunner, dbName } = require('./setup')

const queries = [
  `DROP COLUMN analytics.lt`,
  `CREATE TABLE IF NOT EXISTS ${dbName}.performance
  (
    pid FixedString(12),
    pg Nullable(String),
    dv Nullable(String),
    br Nullable(String),
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
  ORDER BY (pid, created);`
]

queriesRunner(queries)
