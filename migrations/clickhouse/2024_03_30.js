const { queriesRunner, dbName } = require('./setup')

const queries = [
  `CREATE TABLE IF NOT EXISTS ${dbName}.errors
  (
    psid Nullable(UInt64),
    pid FixedString(12),
    pg Nullable(String),
    dv LowCardinality(Nullable(String)),
    br LowCardinality(Nullable(String)),
    os LowCardinality(Nullable(String)),
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
]

queriesRunner(queries)
