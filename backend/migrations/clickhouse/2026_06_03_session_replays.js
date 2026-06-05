const { queriesRunner, dbName } = require('./setup')

const queries = [
  `CREATE TABLE IF NOT EXISTS ${dbName}.session_replay_chunks
  (
    pid FixedString(12),
    psid UInt64,
    replayId String CODEC(ZSTD(3)),
    chunkIndex UInt32,
    objectKey String CODEC(ZSTD(3)),
    privacyMode LowCardinality(String),
    eventCount UInt32,
    uncompressedBytes UInt32,
    compressedBytes UInt32,
    firstEventTimestamp Nullable(UInt64),
    lastEventTimestamp Nullable(UInt64),
    created DateTime('UTC') CODEC(Delta(4), LZ4),
    expiresAt DateTime('UTC') CODEC(Delta(4), LZ4)
  )
  ENGINE = ReplacingMergeTree(created)
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, psid, replayId, chunkIndex);`,
]

queriesRunner(queries)
