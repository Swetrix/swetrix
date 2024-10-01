const { queriesRunner, dbName } = require('./setup')

const queries = [
  `DROP TABLE IF EXISTS ${dbName}.captcha_temp`,
  `CREATE TABLE IF NOT EXISTS ${dbName}.captcha_temp
  (
    pid FixedString(12),
    dv LowCardinality(Nullable(String)),
    br LowCardinality(Nullable(String)),
    os Nullable(String),
    cc Nullable(FixedString(2)),
    manuallyPassed UInt8,
    created DateTime
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created)`,

  `INSERT INTO ${dbName}.captcha_temp (pid, dv, br, os, cc, manuallyPassed, created)
  SELECT pid, dv, br, os, cc, manuallyPassed, created FROM ${dbName}.captcha`,

  `DROP TABLE ${dbName}.captcha`,
  `RENAME TABLE ${dbName}.captcha_temp TO ${dbName}.captcha`,
]

queriesRunner(queries)
