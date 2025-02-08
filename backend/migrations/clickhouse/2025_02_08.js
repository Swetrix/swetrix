const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Remove uptime
  `DROP TABLE IF EXISTS ${dbName}.monitor_responses`,
]

queriesRunner(queries)
