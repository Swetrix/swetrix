const { queriesRunner, dbName } = require('./setup')

const queries = [
  `ALTER TABLE ${dbName}.feature_flag ADD COLUMN IF NOT EXISTS scheduledChange Nullable(String) AFTER experimentId;`,
  `ALTER TABLE ${dbName}.feature_flag ADD COLUMN IF NOT EXISTS killSwitchActive Int8 DEFAULT 0 AFTER scheduledChange;`,
  `ALTER TABLE ${dbName}.feature_flag ADD COLUMN IF NOT EXISTS killSwitchValue Int8 DEFAULT 0 AFTER killSwitchActive;`,
  `ALTER TABLE ${dbName}.feature_flag ADD COLUMN IF NOT EXISTS killedAt Nullable(DateTime('UTC')) AFTER killSwitchValue;`,
  `ALTER TABLE ${dbName}.feature_flag ADD COLUMN IF NOT EXISTS targetingUpdatedAt Nullable(DateTime('UTC')) AFTER killedAt;`,
  `ALTER TABLE ${dbName}.feature_flag ADD COLUMN IF NOT EXISTS updated DateTime('UTC') DEFAULT created AFTER created;`,
  `ALTER TABLE ${dbName}.feature_flag UPDATE targetingUpdatedAt = created WHERE targetingUpdatedAt IS NULL;`,
]

queriesRunner(queries)
