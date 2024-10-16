const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Dropping 'sid' column
  `ALTER TABLE ${dbName}.analytics DROP COLUMN sid`,
]

queriesRunner(queries)
