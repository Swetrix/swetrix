const { queriesRunner, dbName } = require('./setup')

const queries = [
  `CREATE TABLE IF NOT EXISTS ${dbName}.captcha
  (
    pid FixedString(12),
    dv Nullable(String),
    br Nullable(String),
    os Nullable(String),
    cc Nullable(FixedString(2)),
    manuallyPassed UInt8,
    created DateTime
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,
]

queriesRunner(queries)
