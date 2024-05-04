const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Error events table
  `CREATE TABLE IF NOT EXISTS ${dbName}.errors
  (
    eid FixedString(32),
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

  // Error events status table
  `CREATE TABLE IF NOT EXISTS ${dbName}.error_statuses (
    eid FixedString(32),
    pid FixedString(12),
    status Enum8('active', 'regressed', 'resolved'),
    updated DateTime('UTC') DEFAULT now()
  )
  ENGINE = ReplacingMergeTree()
  PRIMARY KEY (eid, pid);`,
]

queriesRunner(queries)
