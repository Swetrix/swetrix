const rx = /\.0+$|(\.[0-9]*[1-9])0+$/
export const nFormatter = (num, digits) => {
  const lookup = [
    { value: 1, symbol: '' },
    { value: 1e3, symbol: 'k' },
    { value: 1e6, symbol: 'M' },
    { value: 1e9, symbol: 'B' },
  ]

  const item = lookup.slice().reverse().find((item) => num >= item.value)

  return item ? (num / item.value).toFixed(digits).replace(rx, '$1') + item.symbol : '0'
}

export const secondsTillNextMonth = () => {
  const now = new Date()
  const date = new Date()

  date.setMonth(date.getMonth() + 1)
  date.setDate(1)
  date.setHours(0, 0, 0, 0)

  return 0 | (date - now) / 1000
}
