import { isBrowser } from 'redux/constants'

/*
 * a small localStorage proxy for to persist localStorage
 * contents in runtime memory after first access in order
 * to save performance on JSON-parsing and instead remember
 * how any localStorage item was modified after first access
 */

type currentLocalStorageType = { [key: string]: string | null }
const currentLocalStorage: currentLocalStorageType = {}

type setItemType = (key: string, value: string) => void

export const setItem: setItemType = (key, value) => {
  currentLocalStorage[key] = value

  if (!isBrowser) {
    return
  }

  localStorage.setItem(key, value)
}

type getItemType = (key: string) => any

export const getItem: getItemType = (key) => {
  if (currentLocalStorage[key]) {
    return currentLocalStorage[key]
  }

  if (!isBrowser) {
    return
  }

  const storedValue: any = localStorage.getItem(key)

  try {
    return JSON.parse(storedValue)
  } catch {
    return storedValue
  }
}

type removeItemType = (key: string) => void

export const removeItem: removeItemType = (key) => {
  delete currentLocalStorage[key]

  if (!isBrowser) {
    return
  }

  localStorage.removeItem(key)
}
