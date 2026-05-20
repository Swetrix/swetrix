const { queriesRunner, dbName } = require('./setup')

const queries = [
  `ALTER TABLE ${dbName}.project ADD COLUMN IF NOT EXISTS captchaDifficultyMode String DEFAULT 'manual' CODEC(ZSTD(3));`,
]

queriesRunner(queries)
