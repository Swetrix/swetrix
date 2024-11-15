import UAParser from 'ua-parser-js'

const CUSTOM_BROWSERS = [
  [/(wget|curl|lynx|GameVault)\/([\w.]+)/i],
  [UAParser.BROWSER.NAME, UAParser.BROWSER.VERSION],
]

const extensions = {
  browser: CUSTOM_BROWSERS,
}

export { extensions }
