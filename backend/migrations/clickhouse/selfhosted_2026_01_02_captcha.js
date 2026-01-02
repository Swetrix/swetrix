const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Add CAPTCHA fields to project table
  `ALTER TABLE ${dbName}.project ADD COLUMN IF NOT EXISTS isCaptchaProject Int8 DEFAULT 0;`,
  `ALTER TABLE ${dbName}.project ADD COLUMN IF NOT EXISTS captchaSecretKey Nullable(String) CODEC(ZSTD(3));`,
  `ALTER TABLE ${dbName}.project ADD COLUMN IF NOT EXISTS captchaDifficulty UInt8 DEFAULT 4;`,

  // Create CAPTCHA analytics table (same structure as in initialise_database.js)
  `CREATE TABLE IF NOT EXISTS ${dbName}.captcha
  (
    pid FixedString(12),
    dv LowCardinality(Nullable(String)),
    br LowCardinality(Nullable(String)),
    os Nullable(String) CODEC(ZSTD(3)),
    cc Nullable(FixedString(2)),
    manuallyPassed UInt8,
    created DateTime('UTC') CODEC(Delta(4), LZ4)
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created)
  ORDER BY (pid, created);`,
]

queriesRunner(queries)
