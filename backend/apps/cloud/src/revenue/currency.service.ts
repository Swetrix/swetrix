import { Injectable } from '@nestjs/common'
import axios from 'axios'
import { redis } from '../common/constants'
import { AppLoggerService } from '../logger/logger.service'

@Injectable()
export class CurrencyService {
  private readonly CACHE_KEY = 'revenue:currency_rates'
  private readonly CACHE_TTL = 86400 // 1 day in seconds
  private readonly API_URL =
    'https://cdn.jsdelivr.net/gh/prebid/currency-file@1/latest.json'

  constructor(private readonly logger: AppLoggerService) {}

  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    fromCurrency = fromCurrency.toUpperCase()
    toCurrency = toCurrency.toUpperCase()

    if (fromCurrency === toCurrency) {
      return amount
    }

    const rates = await this.getRates()
    if (!rates) {
      this.logger.warn(
        { fromCurrency, toCurrency },
        'Currency rates unavailable, falling back to 1:1 conversion',
      )
      return amount
    }

    // Try to find direct conversion from 'fromCurrency' if it's a base currency in the API
    if (rates[fromCurrency]?.[toCurrency]) {
      return amount * rates[fromCurrency][toCurrency]
    }

    // Otherwise, convert via USD (which is most likely present as a base currency)
    const usdRates = rates['USD']
    if (!usdRates) {
      this.logger.warn(
        { fromCurrency, toCurrency },
        'USD rates unavailable in currency API, falling back to 1:1 conversion',
      )
      return amount
    }

    // amount in fromCurrency -> amount in USD
    // 1 USD = usdRates[fromCurrency] units of fromCurrency
    // So 1 unit of fromCurrency = 1 / usdRates[fromCurrency] USD
    const fromRateInUsd = usdRates[fromCurrency]
      ? 1 / usdRates[fromCurrency]
      : 1
    const toRateInUsd = usdRates[toCurrency] ? 1 / usdRates[toCurrency] : 1

    const amountInUsd = amount * fromRateInUsd
    return amountInUsd / toRateInUsd
  }

  private async getRates(): Promise<Record<string, Record<string, number>> | null> {
    try {
      const cached = await redis.get(this.CACHE_KEY)
      if (cached) {
        return JSON.parse(cached)
      }

      const response = await axios.get(this.API_URL)
      const rates = response.data?.conversions

      if (rates) {
        await redis.set(
          this.CACHE_KEY,
          JSON.stringify(rates),
          'EX',
          this.CACHE_TTL,
        )
        return rates
      }

      return null
    } catch (error) {
      this.logger.error({ error }, 'Failed to fetch currency rates')
      return null
    }
  }
}
