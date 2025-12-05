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
  // Join with analytics to get actual timestamps - use MAX(created) as lastSeen
  // Compute firstSeen by subtracting duration from lastSeen
  // profileId is null for historical data (will be populated on new events)
  `INSERT INTO ${dbName}.sessions (psid, pid, profileId, firstSeen, lastSeen, pageviews, events)
  SELECT 
    sd.psid,
    sd.pid,
    NULL as profileId,
    subtractSeconds(COALESCE(a.last_seen, now()), sd.duration) as firstSeen,
    COALESCE(a.last_seen, now()) as lastSeen,
    1 as pageviews,
    0 as events
  FROM ${dbName}.session_durations sd
  LEFT JOIN (
    SELECT pid, psid, MAX(created) as last_seen
    FROM ${dbName}.analytics
    WHERE psid IS NOT NULL
    GROUP BY pid, psid
  ) a ON sd.pid = a.pid AND sd.psid = a.psid
  WHERE (sd.pid, sd.psid) NOT IN (SELECT pid, psid FROM ${dbName}.sessions);`,

  // Drop the old session_durations table (commented out for safety - run manually after verifying migration)
  // `DROP TABLE IF EXISTS ${dbName}.session_durations;`,
]

queriesRunner(queries)
