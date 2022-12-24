const { queriesRunner, dbName } = require('./setup')

const queries = [
  `DROP TABLE IF EXISTS ${dbName}.analytics_temp`,
  `CREATE TABLE IF NOT EXISTS ${dbName}.analytics_temp
  (
    sId Nullable(String),
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
    lt Nullable(UInt16),
    cc Nullable(FixedString(2)),
    sdur Nullable(UInt32), 
    unique UInt8,
    created DateTime
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  `INSERT INTO ${dbName}.analytics_temp (sId, pid, pg, dv, br, os, lc, ref, so, me, ca, lt, cc, sdur, unique, created)
  SELECT NULL, pid, pg, dv, br, os, lc, ref, so, me, ca, lt, cc, NULL, unique, created FROM ${dbName}.analytics`,

  `DROP TABLE ${dbName}.analytics`,
  `RENAME TABLE ${dbName}.analytics_temp TO ${dbName}.analytics`,
]

queriesRunner(queries)
