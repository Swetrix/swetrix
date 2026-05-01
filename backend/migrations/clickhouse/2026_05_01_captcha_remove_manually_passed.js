const { queriesRunner, dbName } = require('./setup')

const queries = [
  `ALTER TABLE ${dbName}.captcha DROP COLUMN IF EXISTS manuallyPassed;`,
]

queriesRunner(queries)
