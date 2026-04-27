const { queriesRunner, dbName } = require('./setup')

const queries = [
  `ALTER TABLE ${dbName}.analytics ADD COLUMN IF NOT EXISTS importID Nullable(UInt8) AFTER \`meta.value\``,
  `ALTER TABLE ${dbName}.customEV ADD COLUMN IF NOT EXISTS importID Nullable(UInt8) AFTER \`meta.value\``,
]

queriesRunner(queries)
