const { queriesRunner, dbName } = require('./setup')

const queries = [
  // Change Chrome to Mobile Chrome on mobile devices
  `ALTER TABLE ${dbName}.analytics UPDATE br = 'Mobile Chrome' WHERE br = 'Chrome' AND dv = 'mobile'`,
  `ALTER TABLE ${dbName}.customEV UPDATE br = 'Mobile Chrome' WHERE br = 'Chrome' AND dv = 'mobile'`,
  `ALTER TABLE ${dbName}.errors UPDATE br = 'Mobile Chrome' WHERE br = 'Chrome' AND dv = 'mobile'`,
  `ALTER TABLE ${dbName}.performance UPDATE br = 'Mobile Chrome' WHERE br = 'Chrome' AND dv = 'mobile'`,
  `ALTER TABLE ${dbName}.captcha UPDATE br = 'Mobile Chrome' WHERE br = 'Chrome' AND dv = 'mobile'`,

  // Change Firefox to Mobile Firefox on mobile devices
  `ALTER TABLE ${dbName}.analytics UPDATE br = 'Mobile Firefox' WHERE br = 'Firefox' AND dv = 'mobile'`,
  `ALTER TABLE ${dbName}.customEV UPDATE br = 'Mobile Firefox' WHERE br = 'Firefox' AND dv = 'mobile'`,
  `ALTER TABLE ${dbName}.errors UPDATE br = 'Mobile Firefox' WHERE br = 'Firefox' AND dv = 'mobile'`,
  `ALTER TABLE ${dbName}.performance UPDATE br = 'Mobile Firefox' WHERE br = 'Firefox' AND dv = 'mobile'`,
  `ALTER TABLE ${dbName}.captcha UPDATE br = 'Mobile Firefox' WHERE br = 'Firefox' AND dv = 'mobile'`,

  // Change Mac OS to macOS
  `ALTER TABLE ${dbName}.analytics UPDATE os = 'macOS' WHERE os = 'Mac OS'`,
  `ALTER TABLE ${dbName}.customEV UPDATE os = 'macOS' WHERE os = 'Mac OS'`,
  `ALTER TABLE ${dbName}.errors UPDATE os = 'macOS' WHERE os = 'Mac OS'`,
  `ALTER TABLE ${dbName}.captcha UPDATE os = 'macOS' WHERE os = 'Mac OS'`,

  // Change Chromium OS to Chrome OS
  `ALTER TABLE ${dbName}.analytics UPDATE os = 'Chrome OS' WHERE os = 'Chromium OS'`,
  `ALTER TABLE ${dbName}.customEV UPDATE os = 'Chrome OS' WHERE os = 'Chromium OS'`,
  `ALTER TABLE ${dbName}.errors UPDATE os = 'Chrome OS' WHERE os = 'Chromium OS'`,
  `ALTER TABLE ${dbName}.captcha UPDATE os = 'Chrome OS' WHERE os = 'Chromium OS'`,
]

queriesRunner(queries)
