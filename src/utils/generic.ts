import _find from 'lodash/find'
import _replace from 'lodash/replace'
import _round from 'lodash/round'
import _map from 'lodash/map'
import _reduce from 'lodash/reduce'

const rx = /\.0+$|(\.[0-9]*[1-9])0+$/

const formatterLookup = [
  { value: 1, symbol: '' },
  { value: 1e3, symbol: 'k' },
  { value: 1e6, symbol: 'M' },
  { value: 1e9, symbol: 'B' },
]

export const nFormatter = (num: any, digits = 1) => {
  const item = _find(formatterLookup.slice().reverse(), ({ value }) => num >= value)

  return item ? _replace((num / item.value).toFixed(digits), rx, '$1') + item.symbol : '0'
}

// returns something like [123, 'k'], [5.5, 'M'], [425, null]
export const nFormatterSeparated = (num: any, digits = 1) => {
  const item = _find(formatterLookup.slice().reverse(), ({ value }) => num >= value)

  if (item) {
    return [Number(_replace((num / item.value).toFixed(digits), rx, '$1')), item.symbol || null]
  }

  return [0, null]
}

export const secondsTillNextMonth = () => {
  const now: any = new Date()
  const date: any = new Date()

  date.setMonth(date.getMonth() + 1)
  date.setDate(1)
  date.setHours(0, 0, 0, 0)

  return 0 | (date - now) / 1000
}

export const convertMsToSeconds = (ms: any) => {
  return ms / 1000
}

// Returns an object like { h: 0, m: 0, s: 0 } based on the seconds parameter provided
export const getTimeFromSeconds = (seconds: any) => {
  const h = 0 | seconds / 3600
  const m = 0 | (seconds % 3600) / 60
  const s = 0 | seconds % 60
  const ms = 0 | (seconds % 1) * 1000

  return {
    h, m, s, ms,
  }
}

export const getStringFromTime = (time: any, showMS?: boolean) => {
  const {
    h, m, s, ms,
  } = time

  if (h === 0 && m === 0 && s === 0 && (!showMS || ms === 0)) {
    return '0s'
  }

  return `${h ? `${h}h ` : ''}${m ? `${m}m ` : ''}${s || (showMS && ms > 0) ? `${showMS ? _round(s + ms / 1000, 2) : s}s` : ''}`
}

export const sumArrays = (...arrays: any): number[] => {
  return _map(arrays[0], (_, index) => {
    return _reduce(arrays, (sum, array) => sum + array[index], 0)
  })
}
