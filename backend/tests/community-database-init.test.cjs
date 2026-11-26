const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')

function runInitialiser(t, failure, script = 'initialise_selfhosted.js') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'swetrix-init-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  for (const filename of [
    'initialise_database.js',
    'initialise_selfhosted.js',
    'selfhosted_2026_11_04_admin_idempotency.js',
  ]) {
    fs.copyFileSync(
      path.resolve(__dirname, '../migrations/clickhouse', filename),
      path.join(directory, filename),
    )
  }
  fs.writeFileSync(
    path.join(directory, 'setup.js'),
    `
    let batch = 0
    exports.dbName = 'analytics'
    exports.databaselessQueriesRunner = async () => {
      console.log('create-database')
      if (${JSON.stringify(failure)} === 'database') throw new Error('Database unavailable')
    }
    exports.queriesRunner = async () => {
      const phase = ++batch === 1 ? 'shared-tables' : 'community-tables'
      console.log(phase)
      if (${JSON.stringify(failure)} === phase) throw new Error('Schema query failed')
    }
  `,
  )
  return spawnSync(process.execPath, [path.join(directory, script)], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 5000,
  })
}

test('initializes the shared schema once before the Community Edition tables', (t) => {
  const result = runInitialiser(t, null)
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(result.stdout.trim().split('\n'), [
    'create-database',
    'shared-tables',
    'community-tables',
  ])
})

for (const [failure, phases] of [
  ['database', ['create-database']],
  ['shared-tables', ['create-database', 'shared-tables']],
  [
    'community-tables',
    ['create-database', 'shared-tables', 'community-tables'],
  ],
]) {
  test(`fails the startup command when ${failure} initialization fails`, (t) => {
    const result = runInitialiser(t, failure)
    assert.equal(result.status, 1)
    assert.deepEqual(result.stdout.trim().split('\n'), phases)
    assert.match(
      result.stderr,
      /Error occurred whilst initialising the database/,
    )
  })
}

test('the standalone shared initializer creates the schema once', (t) => {
  const result = runInitialiser(t, null, 'initialise_database.js')
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(result.stdout.trim().split('\n'), [
    'create-database',
    'shared-tables',
  ])
})

test('the standalone shared initializer returns failure to migration scripts', (t) => {
  const result = runInitialiser(t, 'shared-tables', 'initialise_database.js')
  assert.equal(result.status, 1)
})
