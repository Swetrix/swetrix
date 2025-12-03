const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Add profileId column to analytics table
  `ALTER TABLE ${dbName}.analytics ADD COLUMN IF NOT EXISTS profileId Nullable(String) AFTER psid`,

  // Add profileId column to customEV table
  `ALTER TABLE ${dbName}.customEV ADD COLUMN IF NOT EXISTS profileId Nullable(String) AFTER psid`,

  // Add profileId column to errors table
  `ALTER TABLE ${dbName}.errors ADD COLUMN IF NOT EXISTS profileId Nullable(String) AFTER psid`,

  // Create sessions table with ReplacingMergeTree for tracking session state
  // ReplacingMergeTree automatically keeps the latest row by lastSeen for each (pid, psid) pair
  `CREATE TABLE IF NOT EXISTS ${dbName}.sessions
  (
    psid UInt64,
    pid FixedString(12),
    profileId Nullable(String),
    firstSeen DateTime('UTC'),
    lastSeen DateTime('UTC'),
    pageviews UInt32 DEFAULT 1,
    events UInt32 DEFAULT 0
  )
  ENGINE = ReplacingMergeTree(lastSeen)
  ORDER BY (pid, psid)
  PARTITION BY toYYYYMM(firstSeen);`,

  // Migrate data from old session_durations table to new sessions table
  // We compute firstSeen as (lastSeen - duration) and set lastSeen to now()
  // profileId is null for historical data (will be populated on new events)
  `INSERT INTO ${dbName}.sessions (psid, pid, profileId, firstSeen, lastSeen, pageviews, events)
  SELECT 
    psid,
    pid,
    NULL as profileId,
    subtractSeconds(now(), duration) as firstSeen,
    now() as lastSeen,
    1 as pageviews,
    0 as events
  FROM ${dbName}.session_durations
  WHERE (pid, psid) NOT IN (SELECT pid, psid FROM ${dbName}.sessions);`,

  // Drop the old session_durations table (commented out for safety - run manually after verifying migration)
  // `DROP TABLE IF EXISTS ${dbName}.session_durations;`,
]

queriesRunner(queries)
