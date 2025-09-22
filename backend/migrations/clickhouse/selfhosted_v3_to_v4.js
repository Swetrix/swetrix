const childProcess = require('child_process')
const path = require('path')
const { queriesRunner, dbName } = require('./setup')

function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(__dirname, scriptPath)
    console.log('[INFO] Running script: ' + fullPath)

    const process = childProcess.fork(fullPath)
    let invoked = false

    // listen for errors as they may prevent the exit event from firing
    process.on('error', function (err) {
      if (invoked) return
      invoked = true
      reject(err)
    })

    // execute the callback once the process has finished running
    process.on('exit', function (code) {
      if (invoked) return
      invoked = true
      const err = code === 0 ? null : new Error('exit code ' + code)
      err ? reject(err) : resolve()
    })
  })
}

const queries = [
  `CREATE TABLE IF NOT EXISTS ${dbName}.user
  (
    id FixedString(36),
    email String,
    password String,
    timezone String,
    timeFormat String,
    showLiveVisitorsInTitle Int8,
    onboardingStep String,
    hasCompletedOnboarding Int8,
    apiKey Nullable(String)
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,

  `DROP TABLE IF EXISTS ${dbName}.sfuser`,

  `ALTER TABLE ${dbName}.project ADD COLUMN adminId Nullable(String) AFTER passwordHash`,

  `CREATE TABLE IF NOT EXISTS ${dbName}.project_share
  (
    id FixedString(36),
    userId FixedString(36),
    projectId FixedString(12),
    role String,
    confirmed Int8,
    created DateTime,
    updated DateTime
  )
  ENGINE = MergeTree()
  PRIMARY KEY id;`,
]

async function runMigrations() {
  try {
    await queriesRunner(queries)
    await runScript('./2025_01_09.js')
    await runScript('./2025_02_08.js')
    await runScript('./2025_04_16.js')
    await runScript('./2025_05_17.js')
    await runScript('./2025_05_23.js')

    console.log('[INFO] SWETRIX CE V4 - MIGRATIONS FINISHED')
  } catch (reason) {
    console.error('Error running migration:', reason)
  }
}

runMigrations()
