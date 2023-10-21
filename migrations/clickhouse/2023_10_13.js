const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Custom events table: added 'meta.key' and 'meta.value' columns
  `DROP TABLE IF EXISTS ${dbName}.customEV_temp`,
  `CREATE TABLE IF NOT EXISTS ${dbName}.customEV_temp
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
    cc Nullable(FixedString(2)),
    rg LowCardinality(Nullable(String)),
    ct Nullable(String),
    meta Nested
    (
      key String,
      value String
    ),
    created DateTime('UTC')
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  `INSERT INTO ${dbName}.customEV_temp (pid, ev, pg, dv, br, os, lc, ref, so, me, ca, cc, rg, ct, meta.key, meta.value, created)
  SELECT pid, ev, pg, dv, br, os, lc, ref, so, me, ca, cc, rg, ct, [], [], created FROM ${dbName}.customEV`,

  `DROP TABLE ${dbName}.customEV`,
  `RENAME TABLE ${dbName}.customEV_temp TO ${dbName}.customEV`,
]

queriesRunner(queries)
