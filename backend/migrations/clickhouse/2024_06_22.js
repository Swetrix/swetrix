const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Added 'meta' column
  `ALTER TABLE
      ${dbName}.analytics
    ADD COLUMN
      meta Nested
      (
        key String,
        value String
      )
    AFTER ct
  `,
]

queriesRunner(queries)
