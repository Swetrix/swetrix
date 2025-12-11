const { queriesRunner, dbName } = require('./setup')

const queries = [
  `ALTER TABLE ${dbName}.analytics ADD COLUMN IF NOT EXISTS profileId Nullable(String) AFTER psid`,
  `ALTER TABLE ${dbName}.customEV ADD COLUMN IF NOT EXISTS profileId Nullable(String) AFTER psid`,
  `ALTER TABLE ${dbName}.errors ADD COLUMN IF NOT EXISTS profileId Nullable(String) AFTER psid`,

  // ReplacingMergeTree automatically keeps the latest row by lastSeen for each (pid, psid) pair
  `CREATE TABLE IF NOT EXISTS ${dbName}.sessions
  (
    psid UInt64,
    pid FixedString(12),
    profileId Nullable(String),
    firstSeen DateTime('UTC'),
    lastSeen DateTime('UTC')
  )
  ENGINE = ReplacingMergeTree(lastSeen)
  ORDER BY (pid, psid)
  PARTITION BY toYYYYMM(firstSeen);`,

  `INSERT INTO ${dbName}.sessions (psid, pid, profileId, firstSeen, lastSeen)
  SELECT 
    sd.psid,
    sd.pid,
    NULL as profileId,
    subtractSeconds(COALESCE(a.last_seen, now()), sd.duration) as firstSeen,
    COALESCE(a.last_seen, now()) as lastSeen
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
