const fs = require('fs')
const { execSync } = require('child_process')

const args = process.argv.slice(2)

function parseArgs(args) {
  const parsedArgs = {}
  let i = 0
  while (i < args.length) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const value = args[i + 1]
      parsedArgs[key] = value
      i += 2
    } else {
      i += 1
    }
  }
  return parsedArgs
}

function getSecretsFromEnvFile(envFile) {
  const kvPairs = {}

  const fileContents = fs.readFileSync(envFile, 'utf8')
  const lines = fileContents.split('\n')
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue
    }
    const [key, value] = trimmedLine.split('=', 2)
    if (!value) {
      continue
    }
    const strippedValue = value.replace(/["']/g, '')
    kvPairs[key] = strippedValue
  }

  return kvPairs
}

function flyDeploy(secrets) {
  const buildSecrets = []
  for (const [key, value] of Object.entries(secrets)) {
    buildSecrets.push(`--build-secret=${key}=${value}`)
    console.log(`Set .env variable ${key}`)
  }

  // Removing first 2 args: --env-file and the .env file path
  args.splice(0, 2)

  const command = [
    'flyctl',
    'deploy',
    ...args,
    ...buildSecrets,
  ]

  console.log(`Running command: ${command.join(' ')}`)
  execSync(command.join(' '), { stdio: 'inherit' })
}

const parsedArgs = parseArgs(args)
const envValues = getSecretsFromEnvFile(parsedArgs['env-file'])
flyDeploy(envValues)
