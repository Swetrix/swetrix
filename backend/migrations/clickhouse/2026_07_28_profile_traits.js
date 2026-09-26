const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Traits (arbitrary key/value metadata - email, plan, ...) attached to
  // identified profiles via the identify API. One row per key so traits merge
  // across calls without a read-modify-write cycle; the latest value of each
  // key wins and an empty value means the trait was removed.
  `CREATE TABLE IF NOT EXISTS ${dbName}.profile_traits
  (
    pid FixedString(12),
    profileId String CODEC(ZSTD(3)),
    key String CODEC(ZSTD(3)),
    value String CODEC(ZSTD(3)),
    created DateTime64(3, 'UTC') CODEC(Delta(4), LZ4)
  )
  ENGINE = ReplacingMergeTree(created)
  ORDER BY (pid, profileId, key);`,
]

queriesRunner(queries)
