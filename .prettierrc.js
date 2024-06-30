module.exports = {
  printWidth: 120, // max 120 chars in line, code is easy to read
  useTabs: false, // use spaces instead of tabs
  tabWidth: 2, // "visual width" of of the "tab"
  trailingComma: 'all', // add trailing commas in objects, arrays, etc.
  semi: false, // Only add semicolons at the beginning of lines that may introduce ASI failures
  singleQuote: true, // '' for stings instead of ""
  bracketSpacing: true, // import { some } ... instead of import {some} ...
  arrowParens: 'always', // braces even for single param in arrow functions (a) => { }
  jsxSingleQuote: true, // '' for react props
  bracketSameLine: false, // pretty JSX
  endOfLine: 'lf', // 'lf' for linux, 'crlf' for windows, we need to use 'lf' for git
}
