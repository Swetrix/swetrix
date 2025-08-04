import { clsx, type ClassValue } from 'clsx'
import _find from 'lodash/find'
import _map from 'lodash/map'
import _reduce from 'lodash/reduce'
import _replace from 'lodash/replace'
import _round from 'lodash/round'
import { twMerge } from 'tailwind-merge'

import { isBrowser } from '~/lib/constants'

const rx = /\.0+$|(\.[0-9]*[1-9])0+$/

const formatterLookup = [
  { value: 1, symbol: '' },
  { value: 1e3, symbol: 'k' },
  { value: 1e6, symbol: 'M' },
  { value: 1e9, symbol: 'B' },
]

export const nFormatter = (num: any, digits = 1) => {
  const item = _find(formatterLookup.slice().reverse(), ({ value }) => Math.abs(num) >= value)

  return item ? _replace((num / item.value).toFixed(digits), rx, '$1') + item.symbol : '0'
}

export const nLocaleFormatter = (num: number): string => {
  if (!Intl.NumberFormat) {
    return num.toString()
  }

  return new Intl.NumberFormat().format(num)
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

  return 0 | ((date - now) / 1000)
}

type Time = {
  h: number
  m: number
  s: number
  ms: number
  negative: boolean
}

export const getTimeFromSeconds = (seconds: any): Time => {
  const negative = seconds < 0
  const _seconds = Math.abs(seconds)
  const h = 0 | (_seconds / 3600)
  const m = 0 | ((_seconds % 3600) / 60)
  const s = 0 | _seconds % 60
  const ms = 0 | ((_seconds % 1) * 1000)

  return {
    h,
    m,
    s,
    ms,
    negative,
  }
}

export const getStringFromTime = (time: Time, showMS?: boolean) => {
  const { h, m, s, ms, negative } = time

  if (h === 0 && m === 0 && s === 0 && (!showMS || ms === 0)) {
    return '0s'
  }

  return `${negative ? '-' : ''}${h ? `${h}h ` : ''}${m ? `${m}m ` : ''}${
    s || (showMS && ms > 0) ? `${showMS ? _round(s + ms / 1000, 2) : s}s` : ''
  }`
}

export const sumArrays = (...arrays: any): number[] => {
  return _map(arrays[0], (_, index) => {
    return _reduce(arrays, (sum, array) => sum + array[index], 0)
  })
}

export const openBrowserWindow = (url: string, width = 600, height = 800) => {
  return window.open(
    url,
    '',
    `width=${width},height=${height},top=${(window.innerHeight - height) / 2},left=${(window.innerWidth - width) / 2}`,
  )
}

export const loadScript = (url: string) => {
  if (!isBrowser) {
    return
  }

  const script = document.createElement('script')
  script.src = url
  script.async = true
  document.body.appendChild(script)
}

export const calculateRelativePercentage = (oldVal: number, newVal: number, round = 2) => {
  if (oldVal === newVal) return 0
  if (oldVal === 0) return 100
  if (newVal === 0) return -100

  if (newVal > oldVal) {
    return _round((newVal / oldVal) * 100, round)
  }

  return _round((1 - newVal / oldVal) * -100, round)
}

const displayNamesPolyfill = {
  of: (name: string) => name,
}

export const getLocaleDisplayName = (locale: string, language: string): string => {
  const languageNames = Intl.DisplayNames
    ? new Intl.DisplayNames([language], { type: 'language' })
    : displayNamesPolyfill

  try {
    return languageNames.of(locale) || locale
  } catch {
    return locale
  }
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const cn = (...args: ClassValue[]) => {
  return twMerge(clsx(args))
}

export const removeDuplicates = (arr: any[], keys: string[]) => {
  const uniqueObjects: any[] = []

  const isDuplicate = (obj: any) => {
    for (const uniqueObj of uniqueObjects) {
      let isMatch = true

      for (const key of keys) {
        if (uniqueObj[key] !== obj[key]) {
          isMatch = false
          break
        }
      }
      if (isMatch) {
        return true
      }
    }
    return false
  }

  for (const obj of arr) {
    if (!isDuplicate(obj)) {
      uniqueObjects.push(obj)
    }
  }

  return uniqueObjects
}
