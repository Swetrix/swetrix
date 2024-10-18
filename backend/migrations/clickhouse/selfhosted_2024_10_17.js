const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Added 'botsProtectionLevel' column
  `ALTER TABLE ${dbName}.project ADD COLUMN botsProtectionLevel String DEFAULT 'basic' AFTER isPasswordProtected;`,
]

queriesRunner(queries)
