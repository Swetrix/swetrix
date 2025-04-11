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

export const getItem = (key: string): Record<string, any> | string | null => {
  if (currentLocalStorage[key]) {
    return currentLocalStorage[key]
  }

  if (!isBrowser) {
    return null
  }

  const storedValue: string | null = localStorage.getItem(key)

  if (storedValue === null) {
    return null
  }

  try {
    return JSON.parse(storedValue)
  } catch {
    return storedValue
  }
}

export const removeItem = (key: string) => {
  delete currentLocalStorage[key]

  if (!isBrowser) {
    return
  }

  localStorage.removeItem(key)
}
