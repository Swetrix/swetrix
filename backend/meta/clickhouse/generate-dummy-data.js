const { faker } = require('@faker-js/faker')
const _ = require('lodash')

const { clickhouse, dbName } = require('../../migrations/clickhouse/setup')

const PID_SIZE = 12
const DEFAULT_ROW_COUNT = 10
const MODES = ['analytics', 'custom_events', 'performance', 'captcha']
const DEFAULT_MODE = 'analytics'

const OS = ['Windows', 'Linux', 'Mac']
const UTM_SOURCES = ['organic', 'paid', 'referral']
const UTM_MEDIUMS = ['email', 'social', 'search']
const UTM_CAMPAIGNS = ['winter_sale', 'spring_sale', 'summer_sale', 'fall_sale']
const PAGES = ['/', '/signup', '/login', '/news', '/some-interesting-page.html']
const URLS = Array.from({ length: 36 }, () => faker.internet.url())
const DEVICES = ['desktop', 'mobile', 'tablet', 'wearable']
const BROWSERS = ['Chrome', 'Firefox', 'Safari', 'Opera', 'Edge', 'IE']
const CUSTOM_EVENTS = [
  'click',
  'hover',
  'scroll',
  'submit',
  'error',
  'signup',
  'oauth',
  'test',
  'hello',
  '235535123433',
]
const REGIONS = [
  'England',
  'Scotland',
  'Wales',
  'Northern Ireland', // UK
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware', // USA
  'Kyiv Oblast',
  'Kharkiv Oblast',
  'Vinnytsia Oblast',
  'Donetsk Oblast',
  'Odessa Oblast',
  'Zaporizhia Oblast',
  'Lviv Oblast',
  'Kiev', // Ukraine
  'Ontario',
  'Quebec',
  'Nova Scotia',
  'New Brunswick',
  'Manitoba',
  'British Columbia',
  'Prince Edward Island',
  'Saskatchewan', // Canada
  'Tokyo',
  'Osaka',
  'Aichi',
  'Hokkaido',
  'Fukuoka',
  'Kanagawa',
  'Ibaraki',
  'Saitama', // Japan
]
const CITIES = [
  'London',
  'Birmingham',
  'Dundee',
  'Liverpool',
  'Bristol',
  'Manchester',
  'Sheffield',
  'Leeds', // UK
  'New York',
  'Los Angeles',
  'Chicago',
  'Houston',
  'Phoenix',
  'Philadelphia',
  'San Antonio',
  'San Diego', // USA
  'Kyiv',
  'Kharkiv',
  'Vinnytsia',
  'Donetsk',
  'Odessa',
  'Zaporizhia',
  'Lviv',
  'Dnipro', // Ukraine
  'Toronto',
  'Montreal',
  'Vancouver',
  'Ottawa',
  'Calgary',
  'Edmonton',
  'Winnipeg',
  'Quebec City', // Canada
  'Tokyo',
  'Osaka',
  'Nagoya',
  'Sapporo',
  'Fukuoka',
  'Yokohama',
  'Sendai',
  'Kobe', // Japan
]

const chalk = {
  green: text => `\x1b[32m${text}\x1b[0m`,
  red: text => `\x1b[31m${text}\x1b[0m`,
  cyan: text => `\x1b[36m${text}\x1b[0m`,
}

const insertData = async (pid, rowCount, processedRecords, table) => {
  try {
    await clickhouse.insert({
      table,
      format: 'JSONEachRow',
      values: processedRecords,
      clickhouse_settings: {
        async_insert: 1,
      },
    })

    console.log(
      chalk.green(
        `[SUCCESS] Successfully inserted ${rowCount} records for ${pid}!`,
      ),
    )
  } catch (reason) {
    console.error(
      chalk.red('[ERROR] Error occured whilst inserting the records'),
    )
    console.error(reason)
  }
}

const PSIDS = [
  '123456789012',
  '123456789013',
  '123456789014',
  '123456789015',
  '123456789016',
  '123456789017',
  '123456789018',
]

const generateAnalyticsData = async (pid, rowCount, from, to) => {
  const records = []

  for (let i = 0; i < rowCount; ++i) {
    records.push({
      psid:
        Math.random() < 0.05
          ? faker.helpers.arrayElement(PSIDS)
          : Math.floor(Math.random() * 1000000000000000000),
      pid,
      pg: faker.helpers.arrayElement(PAGES),
      dv: faker.helpers.arrayElement(DEVICES),
      br: faker.helpers.arrayElement(BROWSERS),
      brv: null,
      os: faker.helpers.arrayElement(OS),
      osv: null,
      lc: _.toLower(faker.location.countryCode()),
      ref: faker.helpers.arrayElement(URLS),
      so: faker.helpers.arrayElement(UTM_SOURCES),
      me: faker.helpers.arrayElement(UTM_MEDIUMS),
      ca: faker.helpers.arrayElement(UTM_CAMPAIGNS),
      te: null,
      co: null,
      cc: faker.location.countryCode(),
      rg: faker.helpers.arrayElement(REGIONS),
      ct: faker.helpers.arrayElement(CITIES),
      unique: faker.number.int({ min: 0, max: 9 }) === 0 ? 1 : 0,
      created: _.split(
        faker.date
          .between({ from, to })
          .toISOString()
          .replace('T', ' ')
          .replace('Z', ''),
        '.',
      )[0],
    })
  }

  console.info(
    chalk.cyan(
      `[INFO] Inserting the records into Clickhouse "${dbName}" database...`,
    ),
  )

  insertData(pid, rowCount, records, 'analytics')
}

const generateCaptchaData = async (pid, rowCount, from, to) => {
  const records = []

  for (let i = 0; i < rowCount; ++i) {
    records.push({
      pid,
      dv: faker.helpers.arrayElement(DEVICES),
      br: faker.helpers.arrayElement(BROWSERS),
      os: faker.helpers.arrayElement(OS),
      cc: faker.location.countryCode(),
      created: _.split(
        faker.date
          .between({ from, to })
          .toISOString()
          .replace('T', ' ')
          .replace('Z', ''),
        '.',
      )[0],
    })
  }

  console.info(
    chalk.cyan(
      `[INFO] Inserting the records into Clickhouse "${dbName}" database...`,
    ),
  )

  insertData(pid, rowCount, records, 'captcha')
}

const generateCustomEventsData = async (pid, rowCount, from, to) => {
  const records = []

  for (let i = 0; i < rowCount; ++i) {
    records.push({
      pid,
      ev: faker.helpers.arrayElement(CUSTOM_EVENTS),
      pg: faker.helpers.arrayElement(PAGES),
      dv: faker.helpers.arrayElement(DEVICES),
      br: faker.helpers.arrayElement(BROWSERS),
      brv: null,
      os: faker.helpers.arrayElement(OS),
      osv: null,
      lc: _.toLower(faker.location.countryCode()),
      ref: faker.helpers.arrayElement(URLS),
      so: faker.helpers.arrayElement(UTM_SOURCES),
      me: faker.helpers.arrayElement(UTM_MEDIUMS),
      ca: faker.helpers.arrayElement(UTM_CAMPAIGNS),
      te: null,
      co: null,
      cc: faker.location.countryCode(),
      rg: faker.helpers.arrayElement(REGIONS),
      ct: faker.helpers.arrayElement(CITIES),
      unique: faker.number.int({ min: 0, max: 9 }) === 0 ? 1 : 0,
      created: _.split(
        faker.date
          .between({ from, to })
          .toISOString()
          .replace('T', ' ')
          .replace('Z', ''),
        '.',
      )[0],
    })
  }

  console.info(
    chalk.cyan(
      `[INFO] Inserting the records into Clickhouse "${dbName}" database...`,
    ),
  )

  insertData(pid, rowCount, records, 'customEV')
}

const generatePerformanceData = async (pid, rowCount, from, to) => {
  const records = []

  for (let i = 0; i < rowCount; ++i) {
    records.push({
      pid,
      pg: faker.helpers.arrayElement(PAGES),
      dv: faker.helpers.arrayElement(DEVICES),
      br: faker.helpers.arrayElement(BROWSERS),
      brv: null,
      cc: faker.location.countryCode(),
      rg: faker.helpers.arrayElement(REGIONS),
      ct: faker.helpers.arrayElement(CITIES),
      dns: faker.number.int({ min: 0, max: 500 }),
      tls: faker.number.int({ min: 0, max: 1000 }),
      conn: faker.number.int({ min: 0, max: 100 }),
      response: faker.number.int({ min: 0, max: 500 }),
      render: faker.number.int({ min: 0, max: 1500 }),
      domLoad: faker.number.int({ min: 300, max: 2000 }),
      pageLoad: faker.number.int({ min: 300, max: 2000 }),
      ttfb: faker.number.int({ min: 0, max: 500 }),
      created: _.split(
        faker.date
          .between({ from, to })
          .toISOString()
          .replace('T', ' ')
          .replace('Z', ''),
        '.',
      )[0],
    })
  }

  console.info(
    chalk.cyan(
      `[INFO] Inserting the records into Clickhouse "${dbName}" database...`,
    ),
  )

  insertData(pid, rowCount, records, 'performance')
}

const main = () => {
  const args = process.argv.slice(2)
  const argMap = {}

  if (_.includes(args, '--help')) {
    console.log(
      chalk.cyan(
        'Usage: node generate-dummy-data.js --pid <pid> --beginDate <YYYY-MM-DD@HH:mm:ss> --endDate <YYYY-MM-DD@HH:mm:ss> --rows <number of rows>',
      ),
    )
    console.log(
      chalk.green(
        'Example: node generate-dummy-data.js --pid STEzHcB1rALV --beginDate 2021-01-01@00:00:00 --endDate 2021-01-31@23:59:59 --rows 1000',
      ),
    )
    console.log()
    console.log('Options:')
    console.log('--pid <pid> - The pid of the project')
    console.log(
      '--beginDate <YYYY-MM-DD@HH:mm:ss> - The begin date of the data',
    )
    console.log('--endDate <YYYY-MM-DD@HH:mm:ss> - The end date of the data')
    console.log(
      `--rows <number of rows> - The number of rows to generate; default is ${DEFAULT_ROW_COUNT}`,
    )
    console.log(
      `--mode <analytics | custom_events | performance> - The mode to generate data for; default is ${DEFAULT_MODE}`,
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

  const { pid, beginDate, endDate, rows, mode = DEFAULT_MODE } = argMap

  const rowCount = parseInt(rows) || DEFAULT_ROW_COUNT

  if (_.isEmpty(argMap)) {
    console.error(chalk.red('[ERROR] No arguments specified'))
    console.log(
      chalk.cyan(
        'Usage: node generate-dummy-data.js --pid <pid> --beginDate <YYYY-MM-DD@HH:mm:ss> --endDate <YYYY-MM-DD@HH:mm:ss> --rows <number of rows>',
      ),
    )
    console.log(
      chalk.green(
        'Example: node generate-dummy-data.js --pid STEzHcB1rALV --beginDate 2021-01-01@00:00:00 --endDate 2021-01-31@23:59:59 --rows 1000',
      ),
    )
    return
  }

  if (!_.includes(MODES, mode)) {
    console.error(
      chalk.red(`[ERROR] Invalid mode specified, it must be one of ${MODES}`),
    )
    return
  }

  if (!pid) {
    console.error(chalk.red('[ERROR] No pid specified'))
    return
  }

  if (pid.length !== PID_SIZE) {
    console.error(
      chalk.red(
        `[ERROR] Invalid pid specified, it must be ${PID_SIZE} characters long`,
      ),
    )
    return
  }

  if (!beginDate) {
    console.error(
      chalk.red(
        '[ERROR] No begin date specified, it must be in the format YYYY-MM-DD@HH:mm:ss',
      ),
    )
    return
  }

  if (!endDate) {
    console.error(
      chalk.red(
        '[ERROR] No end date specified, it must be in the format YYYY-MM-DD@HH:mm:ss',
      ),
    )
    return
  }

  console.log(chalk.cyan(`[INFO] Operating in ${mode} mode`))
  console.log(
    chalk.cyan(
      `[INFO] Generating ${rowCount} records for ${pid} between ${beginDate} and ${endDate}...`,
    ),
  )

  const fnArgs = [
    pid,
    rowCount,
    // Date.parse(`${_.join(_.split(beginDate, '@'), 'T')}.000Z`),
    // Date.parse(`${_.join(_.split(endDate, '@'), 'T')}.000Z`),
    _.join(_.split(beginDate, '@'), 'T'),
    _.join(_.split(endDate, '@'), 'T'),
  ]

  if (mode === 'analytics') {
    generateAnalyticsData(...fnArgs)
  }

  if (mode === 'custom_events') {
    generateCustomEventsData(...fnArgs)
  }

  if (mode === 'performance') {
    generatePerformanceData(...fnArgs)
  }

  if (mode === 'captcha') {
    generateCaptchaData(...fnArgs)
  }
}

main()
