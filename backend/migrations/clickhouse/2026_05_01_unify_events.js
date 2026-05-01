const { queriesRunner, dbName } = require('./setup')

const queries = [
  `CREATE TABLE IF NOT EXISTS ${dbName}.events
  (
    type LowCardinality(String),
    pid FixedString(12),
    psid Nullable(UInt64),
    profileId Nullable(String) CODEC(ZSTD(3)),
    host Nullable(String) CODEC(ZSTD(3)),
    pg Nullable(String) CODEC(ZSTD(3)),
    dv LowCardinality(Nullable(String)),
    br LowCardinality(Nullable(String)),
    brv Nullable(String) CODEC(ZSTD(3)),
    os LowCardinality(Nullable(String)),
    osv Nullable(String) CODEC(ZSTD(3)),
    lc LowCardinality(Nullable(String)),
    ref Nullable(String) CODEC(ZSTD(3)),
    so Nullable(String) CODEC(ZSTD(3)),
    me Nullable(String) CODEC(ZSTD(3)),
    ca Nullable(String) CODEC(ZSTD(3)),
    te Nullable(String) CODEC(ZSTD(3)),
    co Nullable(String) CODEC(ZSTD(3)),
    cc Nullable(FixedString(2)),
    rg LowCardinality(Nullable(String)),
    rgc LowCardinality(Nullable(String)),
    ct Nullable(String) CODEC(ZSTD(3)),
    isp LowCardinality(Nullable(String)),
    og Nullable(String) CODEC(ZSTD(3)),
    ut LowCardinality(Nullable(String)),
    ctp LowCardinality(Nullable(String)),
    \`meta.key\` Array(String) CODEC(ZSTD(3)),
    \`meta.value\` Array(String) CODEC(ZSTD(3)),
    importID Nullable(UInt8),
    event_name Nullable(String) CODEC(ZSTD(3)),
    eid Nullable(FixedString(32)),
    error_name Nullable(String) CODEC(ZSTD(3)),
    error_message Nullable(String) CODEC(ZSTD(3)),
    stackTrace Nullable(String) CODEC(ZSTD(3)),
    lineno Nullable(UInt32),
    colno Nullable(UInt32),
    error_filename Nullable(String) CODEC(ZSTD(3)),
    dns Nullable(UInt32),
    tls Nullable(UInt32),
    conn Nullable(UInt32),
    response Nullable(UInt32),
    render Nullable(UInt32),
    domLoad Nullable(UInt32),
    pageLoad Nullable(UInt32),
    ttfb Nullable(UInt32),
    created DateTime('UTC') CODEC(Delta(4), LZ4)
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, type, created);`,

  `INSERT INTO ${dbName}.events
    (type, pid, psid, profileId, host, pg, dv, br, brv, os, osv, lc, ref, so, me, ca, te, co, cc, rg, rgc, ct, isp, og, ut, ctp, \`meta.key\`, \`meta.value\`, importID, created)
  SELECT
    'pageview', pid, psid, profileId, host, pg, dv, br, brv, os, osv, lc, ref, so, me, ca, te, co, cc, rg, rgc, ct, isp, og, ut, ctp, \`meta.key\`, \`meta.value\`, importID, created
  FROM ${dbName}.analytics;`,

  `INSERT INTO ${dbName}.events
    (type, pid, psid, profileId, host, pg, dv, br, brv, os, osv, lc, ref, so, me, ca, te, co, cc, rg, rgc, ct, isp, og, ut, ctp, \`meta.key\`, \`meta.value\`, importID, event_name, created)
  SELECT
    'custom_event', pid, psid, profileId, host, pg, dv, br, brv, os, osv, lc, ref, so, me, ca, te, co, cc, rg, rgc, ct, isp, og, ut, ctp, \`meta.key\`, \`meta.value\`, importID, ev, created
  FROM ${dbName}.customEV;`,

  `INSERT INTO ${dbName}.events
    (type, pid, psid, profileId, host, pg, dv, br, brv, os, osv, lc, cc, rg, rgc, ct, isp, og, ut, ctp, \`meta.key\`, \`meta.value\`, eid, error_name, error_message, stackTrace, lineno, colno, error_filename, created)
  SELECT
    'error', pid, psid, profileId, host, pg, dv, br, brv, os, osv, lc, cc, rg, rgc, ct, isp, og, ut, ctp, \`meta.key\`, \`meta.value\`, eid, name, message, stackTrace, lineno, colno, filename, created
  FROM ${dbName}.errors;`,

  `INSERT INTO ${dbName}.events
    (type, pid, host, pg, dv, br, brv, cc, rg, rgc, ct, isp, og, ut, ctp, dns, tls, conn, response, render, domLoad, pageLoad, ttfb, created)
  SELECT
    'performance', pid, host, pg, dv, br, brv, cc, rg, rgc, ct, isp, og, ut, ctp, dns, tls, conn, response, render, domLoad, pageLoad, ttfb, created
  FROM ${dbName}.performance;`,

  `INSERT INTO ${dbName}.events
    (type, pid, dv, br, os, cc, created)
  SELECT
    'captcha', pid, dv, br, os, cc, created
  FROM ${dbName}.captcha;`,

  `DROP TABLE IF EXISTS ${dbName}.analytics;`,
  `DROP TABLE IF EXISTS ${dbName}.customEV;`,
  `DROP TABLE IF EXISTS ${dbName}.errors;`,
  `DROP TABLE IF EXISTS ${dbName}.performance;`,
  `DROP TABLE IF EXISTS ${dbName}.captcha;`,
]

queriesRunner(queries)
