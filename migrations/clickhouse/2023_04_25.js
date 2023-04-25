const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Analytics -> LowCardinality
  `DROP TABLE IF EXISTS ${dbName}.analytics_temp`,
  `CREATE TABLE IF NOT EXISTS ${dbName}.analytics_temp
  (
    sid Nullable(String),
    pid FixedString(12),
    pg Nullable(String),
    dv LowCardinality(Nullable(String)),
    br LowCardinality(Nullable(String)),
    os LowCardinality(Nullable(String)),
    lc LowCardinality(Nullable(String)),
    ref Nullable(String),
    so Nullable(String),
    me Nullable(String),
    ca Nullable(String),
    cc LowCardinality(Nullable(FixedString(2))),
    sdur Nullable(UInt32), 
    unique UInt8,
    created DateTime
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  `INSERT INTO ${dbName}.analytics_temp (sid, pid, pg, dv, br, os, lc, ref, so, me, ca, cc, sdur, unique, created)
  SELECT sid, pid, pg, dv, br, os, lc, ref, so, me, ca, cc, sdur, unique, created FROM ${dbName}.analytics`,

  `DROP TABLE ${dbName}.analytics`,
  `RENAME TABLE ${dbName}.analytics_temp TO ${dbName}.analytics`,

  // Custom events -> LowCardinality
  `DROP TABLE IF EXISTS ${dbName}.customEV_temp`,
  `CREATE TABLE IF NOT EXISTS ${dbName}.customEV
  (
    pid FixedString(12),
    ev String,
    pg Nullable(String),
    dv LowCardinality(Nullable(String)),
    br LowCardinality(Nullable(String)),
    os LowCardinality(Nullable(String)),
    lc LowCardinality(Nullable(String)),
    ref Nullable(String),
    so Nullable(String),
    me Nullable(String),
    ca Nullable(String),
    cc LowCardinality(Nullable(FixedString(2))),
    created DateTime
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  `INSERT INTO ${dbName}.customEV (pid, ev, pg, dv, br, os, lc, ref, so, me, ca, cc, created)
  SELECT pid, ev, pg, dv, br, os, lc, ref, so, me, ca, cc, created FROM ${dbName}.customEV`,

  `DROP TABLE ${dbName}.customEV`,
  `RENAME TABLE ${dbName}.customEV_temp TO ${dbName}.customEV`,
]

queriesRunner(queries)
