import { isBrowser } from '~/lib/constants'

/*
 * a small localStorage proxy for to persist localStorage
 * contents in runtime memory after first access in order
 * to save performance on JSON-parsing and instead remember
 * how any localStorage item was modified after first access
 */

const currentLocalStorage: Record<string, string> = {}

export const setItem = (key: string, value: string) => {
  currentLocalStorage[key] = value

  if (!isBrowser) {
    return
  }

  localStorage.setItem(key, value)
}

export const getItem = (key: string): string | null => {
  if (currentLocalStorage[key]) {
    return currentLocalStorage[key]
  }

  if (!isBrowser) {
    return null
  }

  return localStorage.getItem(key)
}

export const getItemJSON = (key: string): Record<string, any> | null => {
  const value = getItem(key)

  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  return value
}

export const removeItem = (key: string) => {
  delete currentLocalStorage[key]

  if (!isBrowser) {
    return
  }

  localStorage.removeItem(key)
}
