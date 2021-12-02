import * as _sample from 'lodash/sample'
import { ForbiddenException } from '@nestjs/common'
import { hash } from 'blake3'
import * as _toNumber from 'lodash/toNumber'
import { redis } from './constants'

const marketingTips = {
  en: ['Tip 1', 'Tip 2', 'Tip 3'],
}

const RATE_LIMIT_REQUESTS_AMOUNT = 3
const RATE_LIMIT_TIMEOUT = 86400 // 24 hours

const _getRateLimitHash = (ip: string, salt: string = '') => `rl:${hash(`${ip}${salt}`).toString('hex')}`

const getRandomTip = (language: string = 'en'): string => {
  return _sample(marketingTips[language])
}

// 'action' is used as a salt to differ rate limiting routes
const checkRateLimit = async (ip: string, action: string, reqAmount = RATE_LIMIT_REQUESTS_AMOUNT, reqTimeout = RATE_LIMIT_TIMEOUT): Promise<void> => {
  const rlHash = _getRateLimitHash(ip, action)
  let rlCount = await redis.get(rlHash)
  rlCount = _toNumber(rlCount) || 0

  if (rlCount >= reqAmount) {
    throw new ForbiddenException('Too many requests, please try again later')
  }
  await redis.set(rlHash, 1 + rlCount, 'EX', reqTimeout)
}

export {
  getRandomTip, checkRateLimit,
}
