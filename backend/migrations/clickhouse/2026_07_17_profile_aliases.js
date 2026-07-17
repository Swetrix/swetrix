const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Profile aliases table: maps anonymous (anon_) profile IDs to identified (usr_)
  // profile IDs created via the identify API. Resolved at query time with
  // argMin(userProfileId, created) so the first identification wins.
  `CREATE TABLE IF NOT EXISTS ${dbName}.profile_aliases
  (
    pid FixedString(12),
    anonProfileId String CODEC(ZSTD(3)),
    userProfileId String CODEC(ZSTD(3)),
    created DateTime('UTC') CODEC(Delta(4), LZ4)
  )
  ENGINE = ReplacingMergeTree()
  ORDER BY (pid, anonProfileId, userProfileId);`,
]

queriesRunner(queries)
