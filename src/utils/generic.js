import _find from 'lodash/find'
import _replace from 'lodash/replace'

const rx = /\.0+$|(\.[0-9]*[1-9])0+$/

const formatterLookup = [
  { value: 1, symbol: '' },
  { value: 1e3, symbol: 'k' },
  { value: 1e6, symbol: 'M' },
  { value: 1e9, symbol: 'B' },
]

export const nFormatter = (num, digits = 1) => {
  const item = _find(formatterLookup.slice().reverse(), ({ value }) => num >= value)

  return item ? _replace((num / item.value).toFixed(digits), rx, '$1') + item.symbol : '0'
}

// returns something like [123, 'k'], [5.5, 'M'], [425, null]
export const nFormatterSeparated = (num, digits = 1) => {
  const item = _find(formatterLookup.slice().reverse(), ({ value }) => num >= value)

  if (item) {
    return [Number(_replace((num / item.value).toFixed(digits), rx, '$1')), item.symbol || null]
  }

  return [0, null]
}

export const secondsTillNextMonth = () => {
  const now = new Date()
  const date = new Date()

  date.setMonth(date.getMonth() + 1)
  date.setDate(1)
  date.setHours(0, 0, 0, 0)

  return 0 | (date - now) / 1000
}

// Returns an object like { h: 0, m: 0, s: 0 } based on the seconds parameter provided
export const getTimeFromSeconds = (seconds) => {
  const h = 0 | seconds / 3600
  const m = 0 | (seconds % 3600) / 60
  const s = 0 | seconds % 60

  return { h, m, s }
}

export const getStringFromTime = (time) => {
  const { h, m, s } = time

  if (h === 0 && m === 0 && s === 0) {
    return '0s'
  }

  return `${h ? `${h}h ` : ''}${m ? `${m}m ` : ''}${s ? `${s}s` : ''}`
}
