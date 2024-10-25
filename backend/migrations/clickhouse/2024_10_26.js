const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Remove prev column from analytics table
  `ALTER TABLE ${dbName}.analytics DROP COLUMN IF EXISTS prev;`,
]

queriesRunner(queries)
