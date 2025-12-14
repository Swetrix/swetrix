// Migration to add compression codecs to selfhosted-specific tables
// ZSTD(3) for String columns, Delta(4)+LZ4 for DateTime columns
const { queriesRunner, dbName } = require('./setup')

const COMPRESSION_QUERIES = [
  // User table
  `ALTER TABLE ${dbName}.user MODIFY COLUMN email String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.user MODIFY COLUMN password String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.user MODIFY COLUMN timezone String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.user MODIFY COLUMN timeFormat String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.user MODIFY COLUMN onboardingStep String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.user MODIFY COLUMN apiKey Nullable(String) CODEC(ZSTD(3))`,

  // Project table
  `ALTER TABLE ${dbName}.project MODIFY COLUMN name String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.project MODIFY COLUMN origins Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.project MODIFY COLUMN ipBlacklist Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.project MODIFY COLUMN countryBlacklist Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.project MODIFY COLUMN botsProtectionLevel String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.project MODIFY COLUMN passwordHash Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.project MODIFY COLUMN adminId Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.project MODIFY COLUMN created DateTime CODEC(Delta(4), LZ4)`,

  // Refresh token table
  `ALTER TABLE ${dbName}.refresh_token MODIFY COLUMN userId String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.refresh_token MODIFY COLUMN refreshToken String CODEC(ZSTD(3))`,

  // Funnel table
  `ALTER TABLE ${dbName}.funnel MODIFY COLUMN id String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.funnel MODIFY COLUMN name String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.funnel MODIFY COLUMN steps String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.funnel MODIFY COLUMN created DateTime CODEC(Delta(4), LZ4)`,

  // Project views table
  `ALTER TABLE ${dbName}.project_views MODIFY COLUMN name String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.project_views MODIFY COLUMN type String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.project_views MODIFY COLUMN filters Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.project_views MODIFY COLUMN createdAt DateTime CODEC(Delta(4), LZ4)`,
  `ALTER TABLE ${dbName}.project_views MODIFY COLUMN updatedAt DateTime CODEC(Delta(4), LZ4)`,

  // Projects views custom events table
  `ALTER TABLE ${dbName}.projects_views_custom_events MODIFY COLUMN customEventName String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.projects_views_custom_events MODIFY COLUMN metaKey Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.projects_views_custom_events MODIFY COLUMN metaValue Nullable(String) CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.projects_views_custom_events MODIFY COLUMN metricKey String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.projects_views_custom_events MODIFY COLUMN metaValueType String CODEC(ZSTD(3))`,

  // Project share table
  `ALTER TABLE ${dbName}.project_share MODIFY COLUMN role String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.project_share MODIFY COLUMN created DateTime CODEC(Delta(4), LZ4)`,
  `ALTER TABLE ${dbName}.project_share MODIFY COLUMN updated DateTime CODEC(Delta(4), LZ4)`,

  // Annotation table
  `ALTER TABLE ${dbName}.annotation MODIFY COLUMN text String CODEC(ZSTD(3))`,
  `ALTER TABLE ${dbName}.annotation MODIFY COLUMN created DateTime CODEC(Delta(4), LZ4)`,
]

const runCompression = async () => {
  try {
    await queriesRunner(COMPRESSION_QUERIES)
    console.log('[SUCCESS] Compression codecs applied to selfhosted tables')
  } catch (reason) {
    console.error(`[ERROR] Error applying compression: ${reason}`)
  }
}

runCompression()

module.exports = { runCompression }
