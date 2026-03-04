const { queriesRunner, dbName } = require('./setup')

const queries = [
  `ALTER TABLE ${dbName}.user ADD COLUMN IF NOT EXISTS twoFactorAuthenticationSecret Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.user ADD COLUMN IF NOT EXISTS twoFactorRecoveryCode Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.user ADD COLUMN IF NOT EXISTS isTwoFactorAuthenticationEnabled Int8 DEFAULT 0`,
]

async function run() {
  try {
    await queriesRunner(queries)
    console.log('[INFO] Selfhosted 2FA migration finished')
  } catch (reason) {
    console.error('[ERROR] 2FA migration failed:', reason)
  }
}

run()
