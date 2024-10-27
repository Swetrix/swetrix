const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Drop manuallyPassed column from captcha table
  `ALTER TABLE ${dbName}.captcha DROP COLUMN IF EXISTS manuallyPassed;`,
]

queriesRunner(queries)
