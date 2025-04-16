import { UAParser } from '@ua-parser-js/pro-business'

const CUSTOM_BROWSERS = [
  [/(wget|curl|lynx|GameVault)\/([\w.]+)/i],
  [UAParser.BROWSER.NAME, UAParser.BROWSER.VERSION],
]

export const extensions = {
  browser: CUSTOM_BROWSERS,
}
