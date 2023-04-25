const { faker } = require('@faker-js/faker')
const _ = require('lodash')
const chalk = require('chalk')

const {
  queriesRunner, dbName,
} = require('../../migrations/clickhouse/setup')

const PID_SIZE = 12
const DEFAULT_ROW_COUNT = 10

const OS = ['Windows', 'Linux', 'Mac']
const UTM_SOURCES = ['organic', 'paid', 'referral']
const UTM_MEDIUMS = ['email', 'social', 'search']
const UTM_CAMPAIGNS = ['winter_sale', 'spring_sale', 'summer_sale', 'fall_sale']
const PAGES = ['/', '/signup', '/login', '/news', '/some-interesting-page.html']
const URLS = _.map(_.times(36, _.constant(null)), faker.internet.url)
const DEVICES = ['desktop', 'mobile', 'tablet', 'wearable']
const BROWSERS = ['Chrome', 'Firefox', 'Safari', 'Opera', 'Edge', 'IE']

const generateData = async (pid, rowCount, beginDate, endDate) => {
  const records = []

  console.info(
    chalk.cyan(`[INFO] Generating ${rowCount} records for ${pid}...`)
  )

  for (let i = 0; i < rowCount; ++i) {
    const record = [
      'NULL', // sid
      pid,
      faker.helpers.arrayElement(PAGES), // pg
      faker.helpers.arrayElement(DEVICES), // dv
      faker.helpers.arrayElement(BROWSERS), // br
      faker.helpers.arrayElement(OS), // os
      _.toLower(faker.address.countryCode()), // lc
      faker.helpers.arrayElement(URLS), // ref
      faker.helpers.arrayElement(UTM_SOURCES), // so
      faker.helpers.arrayElement(UTM_MEDIUMS), // me
      faker.helpers.arrayElement(UTM_CAMPAIGNS), // ca
      faker.address.countryCode(), // cc
      faker.datatype.number({ min: 0, max: 10000 }), // sdur
      faker.datatype.number({ min: 0, max: 9 }) === 0 ? 1 : 0, // unique; 10% chance of unique record
      _.split(faker.date.between(beginDate, endDate).toISOString().replace('T', ' ').replace('Z', ''), '.')[0], // created; format the date string
    ]
    records.push(record)
  }

  console.info(
    chalk.cyan(`[INFO] Inserting the records into Clickhouse "${dbName}" database...`)
  )

  const processedRecords = records.map(record => `(${record.map(item => `'${item}'`).join(',')})`).join(',')
  const insertQuery = `INSERT INTO ${dbName}.analytics (*) VALUES ${processedRecords}`

  try {
    const result = await queriesRunner([insertQuery], false)

    if (!result) {
      throw new Error()
    }

    console.log(
      chalk.green(`[SUCCESS] Successfully inserted ${rowCount} records for ${pid}!`)
    )
  } catch {
    console.error(
      chalk.red('[ERROR] Error occured whilst inserting the records')
    )
  }
}

// TODO: ADD SUPPORT FOR --type <analytics | custom_events | performance> ARGUMENT TO GENERATE DATA FOR DIFFERENT TABLES
const main = () => {
  const args = process.argv.slice(2)
  const argMap = {}

  if (_.includes(args, '--help')) {
    console.log(
      chalk.cyan('Usage: node generate-dummy-data.js --pid <pid> --beginDate <YYYY-MM-DD!HH:mm:ss> --endDate <YYYY-MM-DD!HH:mm:ss> --rows <number of rows>')
    )
    console.log(
      chalk.green('Example: node generate-dummy-data.js --pid STEzHcB1rALV --beginDate 2021-01-01!00:00:00 --endDate 2021-01-31!23:59:59 --rows 1000')
    )
    return
  }

  args.forEach((arg, index) => {
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const value = args[index + 1]
      argMap[key] = value
    }
  })

  const {
    pid, beginDate, endDate, rows,
  } = argMap

  const rowCount = parseInt(rows) || DEFAULT_ROW_COUNT

  if (_.isEmpty(argMap)) {
    console.error(
      chalk.red('[ERROR] No arguments specified')
    )
    console.log(
      chalk.cyan('Usage: node generate-dummy-data.js --pid <pid> --beginDate <YYYY-MM-DD!HH:mm:ss> --endDate <YYYY-MM-DD!HH:mm:ss> --rows <number of rows>')
    )
    console.log(
      chalk.green('Example: node generate-dummy-data.js --pid STEzHcB1rALV --beginDate 2021-01-01!00:00:00 --endDate 2021-01-31!23:59:59 --rows 1000')
    )
    return
  }

  if (!pid) {
    console.error(
      chalk.red('[ERROR] No pid specified')
    )
    return
  }

  if (pid.length !== PID_SIZE) {
    console.error(
      chalk.red(`[ERROR] Invalid pid specified, it must be ${PID_SIZE} characters long`)
    )
    return
  }

  if (!beginDate) {
    console.error(
      chalk.red('[ERROR] No begin date specified, it must be in the format YYYY-MM-DD@HH:mm:ss')
    )
    return
  }

  if (!endDate) {
    console.error(
      chalk.red('[ERROR] No end date specified, it must be in the format YYYY-MM-DD@HH:mm:ss')
    )
    return
  }

  generateData(pid, rowCount, _.join(_.split(beginDate, '@'), ' '), _.join(_.split(endDate, '@'), ' '))
}

main()
