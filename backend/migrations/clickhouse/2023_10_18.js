const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Analytics table: added psid column
  `DROP TABLE IF EXISTS ${dbName}.analytics_temp`,
  `CREATE TABLE IF NOT EXISTS ${dbName}.analytics_temp
  (
    psid Nullable(UInt64),
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
    rg LowCardinality(Nullable(String)),
    ct Nullable(String),
    sdur Nullable(UInt32), 
    unique UInt8,
    created DateTime('UTC')
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  `INSERT INTO ${dbName}.analytics_temp (psid, sid, pid, pg, prev, dv, br, os, lc, ref, so, me, ca, cc, rg, ct, sdur, unique, created)
  SELECT NULL, sid, pid, pg, prev, dv, br, os, lc, ref, so, me, ca, cc, rg, ct, sdur, unique, created FROM ${dbName}.analytics`,

  `DROP TABLE ${dbName}.analytics`,
  `RENAME TABLE ${dbName}.analytics_temp TO ${dbName}.analytics`,

  // Custom events table: added psid column
  `DROP TABLE IF EXISTS ${dbName}.customEV_temp`,
  `CREATE TABLE IF NOT EXISTS ${dbName}.customEV_temp
  (
    psid Nullable(UInt64),
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

  `INSERT INTO ${dbName}.customEV_temp (psid, pid, ev, pg, dv, br, os, lc, ref, so, me, ca, cc, rg, ct, meta.key, meta.value, created)
  SELECT NULL, pid, ev, pg, dv, br, os, lc, ref, so, me, ca, cc, rg, ct, meta.key, meta.value, created FROM ${dbName}.customEV`,

  `DROP TABLE ${dbName}.customEV`,
  `RENAME TABLE ${dbName}.customEV_temp TO ${dbName}.customEV`,
]

queriesRunner(queries)
