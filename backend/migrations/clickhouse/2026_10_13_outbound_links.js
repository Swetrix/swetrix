const { queriesRunner, dbName } = require('./setup')

queriesRunner([
  `ALTER TABLE ${dbName}.events ADD COLUMN IF NOT EXISTS outbound_url Nullable(String) CODEC(ZSTD(3)) AFTER event_name`,
])
