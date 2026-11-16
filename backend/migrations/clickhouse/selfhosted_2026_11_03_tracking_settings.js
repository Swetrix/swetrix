const { queriesRunner, dbName } = require('./setup')

queriesRunner([
  `ALTER TABLE ${dbName}.project ADD COLUMN IF NOT EXISTS trackingSettings String DEFAULT '{}';`,
])
