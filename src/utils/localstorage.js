/*
 * a small localStorage proxy for to persist localStorage
 * contents in runtime memory after first access in order
 * to save performance on JSON-parsing and instead remember
 * how any localStorage item was modified after first access
 */
const currentLocalStorage = {}

export const setItem = (key, value) => {
  currentLocalStorage[key] = value
  localStorage.setItem(key, JSON.stringify(value))
}

export const getItem = (key) => {
  if (currentLocalStorage[key]) {
    return currentLocalStorage[key]
  }

  const storedValue = localStorage.getItem(key)

  try {
    return JSON.parse(storedValue)
  } catch {
    return storedValue
  }
}

export const removeItem = (key) => {
  delete currentLocalStorage[key]
  localStorage.removeItem(key)
}
