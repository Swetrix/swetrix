type CurrencyFormatOptions = Omit<Intl.NumberFormatOptions, 'notation'> & {
  notation?: Exclude<
    Intl.NumberFormatOptions['notation'],
    'scientific' | 'engineering'
  >
}

type CurrencyFractionDigits = Partial<
  Pick<CurrencyFormatOptions, 'minimumFractionDigits' | 'maximumFractionDigits'>
>

const getPriceFractionDigits = (value: number): CurrencyFractionDigits => ({
  minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
})

export const getCurrencyFormatOptions = (
  value: number,
  currencyCode: string,
  fractionDigits: CurrencyFractionDigits = getPriceFractionDigits(value),
): CurrencyFormatOptions => ({
  style: 'currency',
  currency: currencyCode,
  ...fractionDigits,
})

export const formatCurrencyAmount = (
  value: number | null | undefined,
  currencyCode: string,
  locale?: Intl.LocalesArgument,
  fractionDigits?: CurrencyFractionDigits,
) => {
  if (value == null) {
    return ''
  }

  return new Intl.NumberFormat(
    locale,
    getCurrencyFormatOptions(value, currencyCode, fractionDigits),
  ).format(value)
}
