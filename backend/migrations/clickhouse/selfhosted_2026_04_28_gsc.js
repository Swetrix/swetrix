// This migration adds Google Search Console integration columns and brandKeywords to the project table
const { queriesRunner, dbName } = require('./setup')

const queries = [
  `ALTER TABLE ${dbName}.project ADD COLUMN IF NOT EXISTS gscPropertyUri Nullable(String) DEFAULT NULL CODEC(ZSTD(3));`,
  `ALTER TABLE ${dbName}.project ADD COLUMN IF NOT EXISTS gscAccessTokenEnc Nullable(String) DEFAULT NULL CODEC(ZSTD(3));`,
  `ALTER TABLE ${dbName}.project ADD COLUMN IF NOT EXISTS gscRefreshTokenEnc Nullable(String) DEFAULT NULL CODEC(ZSTD(3));`,
  `ALTER TABLE ${dbName}.project ADD COLUMN IF NOT EXISTS gscTokenExpiry Nullable(Int64) DEFAULT NULL;`,
  `ALTER TABLE ${dbName}.project ADD COLUMN IF NOT EXISTS gscScope Nullable(String) DEFAULT NULL CODEC(ZSTD(3));`,
  `ALTER TABLE ${dbName}.project ADD COLUMN IF NOT EXISTS gscAccountEmail Nullable(String) DEFAULT NULL CODEC(ZSTD(3));`,
  `ALTER TABLE ${dbName}.project ADD COLUMN IF NOT EXISTS brandKeywords Nullable(String) DEFAULT NULL CODEC(ZSTD(3));`,
]

queriesRunner(queries)
