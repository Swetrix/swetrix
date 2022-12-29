const { queriesRunner, dbName } = require('./setup')

const queries = [
  `DROP COLUMN ${dbName}.lt`,
]

queriesRunner(queries)
