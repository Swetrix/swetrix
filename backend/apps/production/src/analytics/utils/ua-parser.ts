import UAParser from 'ua-parser-js'

const CUSTOM_BROWSERS = [
  [/GameVault\/([\w.]+)/i],
  [UAParser.BROWSER.NAME, UAParser.BROWSER.VERSION],
]

const extensions = {
  browser: CUSTOM_BROWSERS,
}

export { extensions }
