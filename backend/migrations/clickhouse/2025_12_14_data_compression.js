// Migration to add compression codecs to existing tables for improved storage and query performance
// ZSTD(3) for String columns, Delta(4)+LZ4 for DateTime columns
const { queriesRunner, dbName } = require('./setup')

const COMPRESSION_QUERIES = [
  // Analytics table - String columns with ZSTD(3)
  `ALTER TABLE ${dbName}.analytics MODIFY COLUMN host Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.analytics MODIFY COLUMN pg Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.analytics MODIFY COLUMN ref Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.analytics MODIFY COLUMN so Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.analytics MODIFY COLUMN me Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.analytics MODIFY COLUMN ca Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.analytics MODIFY COLUMN te Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.analytics MODIFY COLUMN co Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.analytics MODIFY COLUMN ct Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.analytics MODIFY COLUMN brv Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.analytics MODIFY COLUMN osv Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.analytics MODIFY COLUMN profileId Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.analytics MODIFY COLUMN \`meta.key\` Array(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.analytics MODIFY COLUMN \`meta.value\` Array(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.analytics MODIFY COLUMN created DateTime('UTC') CODEC(Delta(4), LZ4)`,

  // CustomEV table
  `ALTER TABLE ${dbName}.customEV MODIFY COLUMN host Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.customEV MODIFY COLUMN pg Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.customEV MODIFY COLUMN ev String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.customEV MODIFY COLUMN ref Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.customEV MODIFY COLUMN so Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.customEV MODIFY COLUMN me Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.customEV MODIFY COLUMN ca Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.customEV MODIFY COLUMN te Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.customEV MODIFY COLUMN co Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.customEV MODIFY COLUMN ct Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.customEV MODIFY COLUMN brv Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.customEV MODIFY COLUMN osv Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.customEV MODIFY COLUMN profileId Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.customEV MODIFY COLUMN \`meta.key\` Array(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.customEV MODIFY COLUMN \`meta.value\` Array(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.customEV MODIFY COLUMN created DateTime('UTC') CODEC(Delta(4), LZ4)`,

  // Performance table
  `ALTER TABLE ${dbName}.performance MODIFY COLUMN host Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.performance MODIFY COLUMN pg Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.performance MODIFY COLUMN ct Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.performance MODIFY COLUMN brv Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.performance MODIFY COLUMN created DateTime('UTC') CODEC(Delta(4), LZ4)`,

  // Errors table - stackTrace especially benefits from compression
  `ALTER TABLE ${dbName}.errors MODIFY COLUMN host Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.errors MODIFY COLUMN pg Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.errors MODIFY COLUMN ct Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.errors MODIFY COLUMN brv Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.errors MODIFY COLUMN osv Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.errors MODIFY COLUMN profileId Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.errors MODIFY COLUMN name String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.errors MODIFY COLUMN message Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.errors MODIFY COLUMN stackTrace Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.errors MODIFY COLUMN filename Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.errors MODIFY COLUMN \`meta.key\` Array(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.errors MODIFY COLUMN \`meta.value\` Array(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.errors MODIFY COLUMN created DateTime('UTC') CODEC(Delta(4), LZ4)`,

  // Sessions table
  `ALTER TABLE ${dbName}.sessions MODIFY COLUMN profileId Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.sessions MODIFY COLUMN firstSeen DateTime('UTC') CODEC(Delta(4), LZ4)`,
  `ALTER TABLE ${dbName}.sessions MODIFY COLUMN lastSeen DateTime('UTC') CODEC(Delta(4), LZ4)`,

  // Feature flag evaluations
  `ALTER TABLE ${dbName}.feature_flag_evaluations MODIFY COLUMN flagId String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.feature_flag_evaluations MODIFY COLUMN flagKey String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.feature_flag_evaluations MODIFY COLUMN profileId String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.feature_flag_evaluations MODIFY COLUMN created DateTime('UTC') CODEC(Delta(4), LZ4)`,

  // Experiment exposures
  `ALTER TABLE ${dbName}.experiment_exposures MODIFY COLUMN experimentId String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.experiment_exposures MODIFY COLUMN variantKey String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.experiment_exposures MODIFY COLUMN profileId String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.experiment_exposures MODIFY COLUMN created DateTime('UTC') CODEC(Delta(4), LZ4)`,

  // Captcha table
  `ALTER TABLE ${dbName}.captcha MODIFY COLUMN os Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.captcha MODIFY COLUMN created DateTime('UTC') CODEC(Delta(4), LZ4)`,
]

const runCompression = async () => {
  try {
    await queriesRunner(COMPRESSION_QUERIES)
    console.log('[SUCCESS] Compression codecs applied to all tables')
  } catch (reason) {
    console.error(`[ERROR] Error applying compression: ${reason}`)
  }
}

runCompression()

module.exports = { runCompression }
