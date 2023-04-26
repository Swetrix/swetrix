const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Added 'prev' column
  `DROP TABLE IF EXISTS ${dbName}.analytics_temp`,
  `CREATE TABLE IF NOT EXISTS ${dbName}.analytics_temp
  (
    sid Nullable(String),
    pid FixedString(12),
    pg Nullable(String),
    prev Nullable(String),
    dv LowCardinality(Nullable(String)),
    br LowCardinality(Nullable(String)),
    os LowCardinality(Nullable(String)),
    lc LowCardinality(Nullable(String)),
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

  `INSERT INTO ${dbName}.analytics_temp (sid, pid, pg, prev, dv, br, os, lc, ref, so, me, ca, cc, sdur, unique, created)
  SELECT sid, pid, pg, NULL, dv, br, os, lc, ref, so, me, ca, cc, sdur, unique, created FROM ${dbName}.analytics`,

  `DROP TABLE ${dbName}.analytics`,
  `RENAME TABLE ${dbName}.analytics_temp TO ${dbName}.analytics`,
]

queriesRunner(queries)
