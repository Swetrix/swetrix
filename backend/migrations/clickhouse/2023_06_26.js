const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Analytics table: added 'rg' and 'ct' columns
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
    rg LowCardinality(Nullable(String)),
    ct Nullable(String),
    sdur Nullable(UInt32), 
    unique UInt8,
    created DateTime('UTC')
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  `INSERT INTO ${dbName}.analytics_temp (sid, pid, pg, prev, dv, br, os, lc, ref, so, me, ca, cc, rg, ct, sdur, unique, created)
  SELECT sid, pid, pg, prev, dv, br, os, lc, ref, so, me, ca, cc, NULL, NULL, sdur, unique, created FROM ${dbName}.analytics`,

  `DROP TABLE ${dbName}.analytics`,
  `RENAME TABLE ${dbName}.analytics_temp TO ${dbName}.analytics`,

  // Custom events table: added 'rg' and 'ct' columns
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
    created DateTime('UTC')
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  `INSERT INTO ${dbName}.customEV_temp (pid, ev, pg, dv, br, os, lc, ref, so, me, ca, cc, rg, ct, created)
  SELECT pid, ev, pg, dv, br, os, lc, ref, so, me, ca, cc, NULL, NULL, created FROM ${dbName}.customEV`,

  `DROP TABLE ${dbName}.customEV`,
  `RENAME TABLE ${dbName}.customEV_temp TO ${dbName}.customEV`,

  // Performance table: added 'rg' and 'ct' columns
  `DROP TABLE IF EXISTS ${dbName}.performance_temp`,
  `CREATE TABLE IF NOT EXISTS ${dbName}.performance_temp
  (
    pid FixedString(12),
    pg Nullable(String),
    dv LowCardinality(Nullable(String)),
    br LowCardinality(Nullable(String)),
    cc Nullable(FixedString(2)),
    rg LowCardinality(Nullable(String)),
    ct Nullable(String),
    dns Nullable(UInt32),
    tls Nullable(UInt32),
    conn Nullable(UInt32),
    response Nullable(UInt32),
    render Nullable(UInt32),
    domLoad Nullable(UInt32),
    pageLoad Nullable(UInt32),
    ttfb Nullable(UInt32),
    created DateTime('UTC')
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,

  `INSERT INTO ${dbName}.performance_temp (pid, pg, dv, br, cc, rg, ct, dns, tls, conn, response, render, domLoad, pageLoad, ttfb, created)
  SELECT pid, pg, dv, br, cc, NULL, NULL, dns, tls, conn, response, render, domLoad, pageLoad, ttfb, created FROM ${dbName}.performance`,

  `DROP TABLE ${dbName}.performance`,
  `RENAME TABLE ${dbName}.performance_temp TO ${dbName}.performance`,
]

queriesRunner(queries)
