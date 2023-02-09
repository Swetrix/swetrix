const { queriesRunner, dbName } = require('./setup')

const queries = [
  `DROP TABLE IF EXISTS ${dbName}.customEV_temp`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.customEV_temp
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

  `INSERT INTO ${dbName}.customEV_temp (pid, ev, pg, dv, br, os, lc, ref, so, me, ca, cc, created)
  SELECT pid, ev, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, created FROM ${dbName}.customEV`,

  `DROP TABLE ${dbName}.customEV`,

  `RENAME TABLE ${dbName}.customEV_temp TO ${dbName}.customEV`,
]

queriesRunner(queries)
