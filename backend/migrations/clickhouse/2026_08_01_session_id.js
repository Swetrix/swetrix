const { queriesRunner, dbName } = require('./setup')

const queries = [
  `ALTER TABLE ${dbName}.events ADD COLUMN IF NOT EXISTS sid Nullable(UInt64) AFTER psid`,
  `ALTER TABLE ${dbName}.customEV ADD COLUMN IF NOT EXISTS sid Nullable(UInt64) AFTER psid`,
  `ALTER TABLE ${dbName}.errors ADD COLUMN IF NOT EXISTS sid Nullable(UInt64) AFTER psid`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.sessions_v2
  (
    sid UInt64 DEFAULT psid,
    psid UInt64,
    pid FixedString(12),
    profileId Nullable(String) CODEC(ZSTD(3)),
    firstSeen DateTime('UTC') CODEC(Delta(4), LZ4),
    lastSeen DateTime('UTC') CODEC(Delta(4), LZ4)
  )
  ENGINE = ReplacingMergeTree(lastSeen)
  ORDER BY (pid, sid)
  PARTITION BY toYYYYMM(firstSeen);`,

  `INSERT INTO ${dbName}.sessions_v2 (sid, psid, pid, profileId, firstSeen, lastSeen)
   SELECT psid AS sid, psid, pid, profileId, firstSeen, lastSeen
   FROM ${dbName}.sessions
   WHERE firstSeen <= lastSeen
     AND lastSeen > toDateTime(0)`,

  `RENAME TABLE ${dbName}.sessions TO ${dbName}.sessions_by_visitor_day, ${dbName}.sessions_v2 TO ${dbName}.sessions`,

  // The backfill above runs while the old code is still writing to the old
  // table, so anything recorded between the INSERT and the RENAME would be
  // lost. Replay the tail of the old table into the new one — ReplacingMergeTree
  // dedupes on (pid, sid) and keeps the row with the greatest lastSeen. Only the
  // last day is replayed: sessions expire after 30 minutes of inactivity, so
  // nothing older than that can have changed during the migration.
  `INSERT INTO ${dbName}.sessions (sid, psid, pid, profileId, firstSeen, lastSeen)
   SELECT psid AS sid, psid, pid, profileId, firstSeen, lastSeen
   FROM ${dbName}.sessions_by_visitor_day
   WHERE lastSeen >= now() - INTERVAL 1 DAY
     AND firstSeen <= lastSeen
     AND lastSeen > toDateTime(0)`,
]

queriesRunner(queries)
