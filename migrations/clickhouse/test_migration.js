const { queriesRunner, dbName } = require('./setup')

const queries = [
  `SELECT * FROM ${dbName}.analytics LIMIT 10`,
]

queriesRunner(queries)
