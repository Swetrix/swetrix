const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Create new session_durations table
  `CREATE TABLE IF NOT EXISTS ${dbName}.session_durations
  (
    psid UInt64,
    pid FixedString(12),
    duration UInt32
  )
  ENGINE = MergeTree()
  ORDER BY (pid, psid);`,

  // Copy existing session durations to new table
  `INSERT INTO ${dbName}.session_durations (psid, pid, duration)
  SELECT 
    psid,
    pid,
    sdur as duration
  FROM ${dbName}.analytics
  WHERE
    sdur IS NOT NULL
    AND psid IS NOT NULL
    AND unique = 1;`,

  // Remove sdur column from analytics table
  `ALTER TABLE ${dbName}.analytics DROP COLUMN IF EXISTS sdur;`,
]

queriesRunner(queries)
