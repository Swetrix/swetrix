const { clickhouse, queriesRunner, dbName } = require('./setup')

const OLD_SESSIONS_TABLE = 'sessions_by_visitor_day'
const STATE_TABLE = 'sessions_sid_migration_state'

const ADD_SID_COLUMN_QUERIES = [
  `ALTER TABLE ${dbName}.events ADD COLUMN IF NOT EXISTS sid Nullable(UInt64) AFTER psid`,
  `ALTER TABLE ${dbName}.customEV ADD COLUMN IF NOT EXISTS sid Nullable(UInt64) AFTER psid`,
  `ALTER TABLE ${dbName}.errors ADD COLUMN IF NOT EXISTS sid Nullable(UInt64) AFTER psid`,
]

const BACKFILL_QUERIES = [
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

  `RENAME TABLE ${dbName}.sessions TO ${dbName}.${OLD_SESSIONS_TABLE}, ${dbName}.sessions_v2 TO ${dbName}.sessions`,
]

const tableExists = async (table) => {
  const resultSet = await clickhouse.query({
    query: `SELECT count() AS total
            FROM system.tables
            WHERE database = {database:String} AND name = {table:String}`,
    query_params: { database: dbName, table },
    format: 'JSONEachRow',
  })
  const [row] = await resultSet.json()

  return Number(row.total) > 0
}

const readMigrationStart = async () => {
  if (!(await tableExists(STATE_TABLE))) {
    return null
  }

  const resultSet = await clickhouse.query({
    // The aliases must not reuse the startedAt column name — ClickHouse would
    // resolve the later references to the alias instead of the column.
    query: `SELECT
              count() AS total,
              toUnixTimestamp(min(startedAt)) AS startedAtTs,
              toString(min(startedAt)) AS startedAtText
            FROM ${dbName}.${STATE_TABLE}`,
    format: 'JSONEachRow',
  })
  const [row] = await resultSet.json()

  return Number(row.total) > 0 ? row : null
}

// The replay at the end has to cover every row written to the old table from
// the moment the backfill started, so the watermark is taken before it — and
// persisted, because a retry that resumes after the rename must reuse the
// original timestamp instead of a fresh now().
const captureMigrationStart = async () => {
  // An attempt that died before the rename already recorded one — keep it, the
  // backfill it started may still have missed rows written after that point.
  const existing = await readMigrationStart()

  if (existing) {
    return existing
  }

  await queriesRunner([
    `CREATE TABLE IF NOT EXISTS ${dbName}.${STATE_TABLE}
    (
      startedAt DateTime('UTC')
    )
    ENGINE = MergeTree()
    ORDER BY startedAt;`,

    `INSERT INTO ${dbName}.${STATE_TABLE} (startedAt) SELECT now()`,
  ])

  return readMigrationStart()
}

// ReplacingMergeTree dedupes on (pid, sid) and keeps the row with the greatest
// lastSeen, so replaying rows the backfill already copied is harmless — the
// watermark only exists to keep the amount of replayed data sane.
const buildReplayQuery = (migrationStart) => {
  const conditions = [
    // lastSeen is stamped on the API host and inserted asynchronously, so a row
    // can land after the timestamp it carries. The extra hour absorbs that lag
    // and any clock skew between the API hosts and ClickHouse.
    migrationStart &&
      `lastSeen >= toDateTime({startedAt:UInt32}) - INTERVAL 1 HOUR`,
    'firstSeen <= lastSeen',
    'lastSeen > toDateTime(0)',
  ].filter(Boolean)

  return `INSERT INTO ${dbName}.sessions (sid, psid, pid, profileId, firstSeen, lastSeen)
   SELECT psid AS sid, psid, pid, profileId, firstSeen, lastSeen
   FROM ${dbName}.${OLD_SESSIONS_TABLE}
   WHERE ${conditions.join('\n     AND ')}`
}

const run = async () => {
  // The rename is the point of no return: once it lands, sessions is the new
  // table and the old one is frozen. Re-running the backfill from there would
  // fail on the existing rename target and copy the new table back over itself,
  // so a resumed attempt only replays the tail.
  const renamed = await tableExists(OLD_SESSIONS_TABLE)

  await queriesRunner(ADD_SID_COLUMN_QUERIES)

  let migrationStart

  if (renamed) {
    if (!(await tableExists('sessions'))) {
      throw new Error(
        `${dbName}.${OLD_SESSIONS_TABLE} exists but ${dbName}.sessions does not — the rename left the database half-migrated. Restore ${dbName}.sessions manually before rerunning.`,
      )
    }

    if (await tableExists('sessions_v2')) {
      console.warn(
        `${dbName}.sessions_v2 is left over from an earlier attempt and is not used any more — drop it once this migration is verified.`,
      )
    }

    migrationStart = await readMigrationStart()

    if (migrationStart) {
      console.log(
        `Resuming after the rename, replaying ${dbName}.${OLD_SESSIONS_TABLE} from ${migrationStart.startedAtText} UTC.`,
      )
    } else {
      console.warn(
        `Resuming after the rename, but no ${dbName}.${STATE_TABLE} watermark was recorded. Replaying ${dbName}.${OLD_SESSIONS_TABLE} in full — slower, but the overlap is deduped.`,
      )
    }
  } else {
    migrationStart = await captureMigrationStart()
    await queriesRunner(BACKFILL_QUERIES)
  }

  // The backfill runs while the old code is still writing to the old table, so
  // anything recorded between the INSERT and the RENAME would be lost. Replay
  // everything the old table received from the watermark onwards.
  await queriesRunner(
    [buildReplayQuery(migrationStart)],
    true,
    migrationStart
      ? { query_params: { startedAt: migrationStart.startedAtTs } }
      : {},
  )
}

// Drop ${dbName}.sessions_sid_migration_state once the migration is verified.
run()
