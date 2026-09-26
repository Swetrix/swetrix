const { queriesRunner, dbName } = require('./setup')

queriesRunner([
  `ALTER TABLE ${dbName}.events ADD COLUMN IF NOT EXISTS title Nullable(String) CODEC(ZSTD(3)) AFTER pg`,
])
