import { NotFoundException, HttpException } from '@nestjs/common'
import { hash } from 'blake3'
import { v5 as uuidv5 } from 'uuid'
import * as randomstring from 'randomstring'
import * as _sample from 'lodash/sample'
import * as _join from 'lodash/join'
import * as _filter from 'lodash/filter'
import * as _values from 'lodash/values'
import * as _reduce from 'lodash/reduce'
import * as _keys from 'lodash/keys'
import * as _toNumber from 'lodash/toNumber'
import * as _isEmpty from 'lodash/isEmpty'
import * as _head from 'lodash/head'
import * as _round from 'lodash/round'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import * as _map from 'lodash/map'

import {
  clickhouse,
  redis,
  DEFAULT_SELFHOSTED_UUID,
  SELFHOSTED_EMAIL,
  UUIDV5_NAMESPACE,
  isDevelopment,
} from './constants'
import { Project } from '../project/entity/project.entity'

dayjs.extend(utc)

const marketingTips = {
  en: [
    'Blog frequently and consistently to build search engine presence.\nTo get website visitors, you need lots and lots of content. Your prospects are using Google every day to search for what they want. One of the most reliable ways to show up in Google results is to blog about lots of topics your customers care about.',
    'Build an active presence on the top social media networks.\nWhen your prospects are not using Google, they are using Facebook, Twitter, Google Plus, LInkedIn, and Pinterest. You need a presence on at least 3 of these top 5 networks. Ideally, you should be updating them several times each week or even every single day if possible.',
    'Focus on the most important rule in marketing: Content Is King!\nBurn this one into your brain forever. This is the golden rule of marketing — Content Is King! It is the rule you need to follow in every medium where you are creating new marketing messages: email, blogging, social media, web content, etc.',
    'Use Email Marketing\nEmails should not be just limited to welcoming your new customers, it can also help to push customers to your website with promotions, deals, discounts, and contests.',
    'Contribute Articles to Expert Sites\nFind blogs or websites that are thought leaders in your industry, then submit articles that can put in front of their audience. This is also a great way to build backlinks and drive organic traffic to your website.',
    'Create an Affiliate Program\nAffiliate programs are an easy way to get people clicking to your website to learn more about your company. To date, 81% of brands have adopted an affiliate marketing program.\nAn affiliate program is a long term investment; you will have to build a program people will want to join, try to get and manage quality affiliates so you can get the fruits of your labour.',
    'Add Your Website Link To All Your Platforms\nAdding your links to all your platforms allows you to optimise your website for more clicks.',
    "Have a Backlink Strategy\nGoogle's search engine uses links as one of the three most important search engine ranking factors for a website.\nBelieve it or not, you can improve your website's SEO by backlinking your website in the article you contribute as a guest writer.\nOnce you have a strategy in place, you will begin to see your website's click-through rate increase and traffic coming your way.",
    'Host a Giveaway on Your Website\nHosting a giveaway on your website is a sure way to promote your website. Giveaways pack more of a punch for your business than you think.',
    'Use Influencers To Market Your Website\nInfluencer Marketing has been in the top five marketing tools and strategies for the past four years and counting.\nYou can use influencers in a wide variety of ways. One way is to partner with an influencer for a do co-promotions like a giveaway, a special discount, or prize package.',
    'Fix Broken External Links & Errors\nBroken external links, just as the states, are links that lead nowhere or give users an error.\nMaybe your busy sharing other links from your site or there are some old content or web pages you forgot you deleted. Over time you will be losing potential traffic and clients if you forget to audit your site to find broken external links.',
    'Combine offline marketing with online marketing.\nYes, it is true, print media is still alive and well.',
    'Promote your product features.\nSince social media contests get so much engagement, treat it almost like mini ads for your products. Listing out the benefits and features so that potential buyers can see what your products have to offer. It will not only convince customers that they want your product but that they need it and can not live without it!',
    'Link internally.\nThe strength of your link profile is not solely determined by how many sites link back to you - it can also be affected by your internal linking structure. When creating and publishing content, be sure to keep an eye out for opportunities for internal links. This not only helps with SEO, but also results in a better, more useful experience for the user - the cornerstone of increasing traffic to your website.',
    'Make sure your site is responsive.\nThe days when internet browsing was done exclusively on desktop PCs are long gone. Today, more people than ever before are using mobile devices to access the web, and if you force your visitors to pinch and scroll their way around your site, you are basically telling them to go elsewhere. Even if you have a basic website, you still need to ensure that it is accessible and comfortably viewable across a range of devices, including smaller smartphones.',
    'Make sure your site is fast.\nEver found yourself waiting thirty seconds for a webpage to load? Me neither. If your site takes forever to load, your bounce rate will be sky high. Make sure that your pages are as technically optimized as possible, including image file sizes, page structure and the functionality of third-party plugins. The faster your site loads, the better.',
    'Submit your content to aggregator sites.\nFirstly, a disclaimer - do not spam Reddit and other similar sites hoping to "hit the jackpot" of referral traffic, because it is not going to happen. Members of communities like Reddit are extraordinarily savvy to spam disguised as legitimate links, but every now and again, it does not hurt to submit links that these audiences will find genuinely useful. Choose a relevant subreddit, submit your content, then watch the traffic pour in.',
  ],
}

const RATE_LIMIT_REQUESTS_AMOUNT = 3
const RATE_LIMIT_TIMEOUT = 86400 // 24 hours

const allowedToUpdateKeys = [
  'name',
  'origins',
  'ipBlacklist',
  'active',
  'public',
]

const getRateLimitHash = (ipOrApiKey: string, salt = '') =>
  `rl:${hash(`${ipOrApiKey}${salt}`).toString('hex')}`

const splitAt = (x, index): Array<Array<any> | string> => [
  x.slice(0, index),
  x.slice(index),
]

const getRandomTip = (language = 'en'): string => {
  return _sample(marketingTips[language])
}

// 'action' is used as a salt to differ rate limiting routes
const checkRateLimit = async (
  ip: string,
  action: string,
  reqAmount: number = RATE_LIMIT_REQUESTS_AMOUNT,
  reqTimeout: number = RATE_LIMIT_TIMEOUT,
): Promise<void> => {
  if (isDevelopment) {
    return
  }

  const rlHash = getRateLimitHash(ip, action)
  const rlCount: number = _toNumber(await redis.get(rlHash)) || 0

  if (rlCount >= reqAmount) {
    throw new HttpException('Too many requests, please try again later', 429)
  }
  await redis.set(rlHash, 1 + rlCount, 'EX', reqTimeout)
}

const RATE_LIMIT_FOR_API_KEY_TIMEOUT = 60 * 60 // 1 hour
export const checkRateLimitForApiKey = async (
  apiKey: string,
  reqAmount: number,
): Promise<boolean> => {
  const rlHash = getRateLimitHash(apiKey)
  const rlCount: number = _toNumber(await redis.get(rlHash)) || 0

  if (rlCount >= reqAmount) {
    throw new HttpException('Too many requests, please try again later', 429)
  }
  await redis.set(rlHash, 1 + rlCount, 'EX', RATE_LIMIT_FOR_API_KEY_TIMEOUT)
  return true
}

const getProjectsClickhouse = async (id = null) => {
  if (!id) {
    const query = 'SELECT * FROM project;'
    return clickhouse.query(query).toPromise()
  }

  const paramsData = {
    params: {
      id,
    },
  }

  const query = `SELECT * FROM project WHERE id = {id:FixedString(12)};`
  const project = await clickhouse.query(query, paramsData).toPromise()

  if (_isEmpty(project)) {
    throw new NotFoundException(`Project ${id} was not found in the database`)
  }

  return _head(project)
}

const updateProjectClickhouse = async (project: object) => {
  const filtered = _reduce(
    _filter(_keys(project), key => allowedToUpdateKeys.includes(key)),
    (obj, key) => {
      obj[key] = project[key]
      return obj
    },
    {},
  )
  const columns = _keys(filtered)
  const values = _values(filtered)
  // @ts-ignore
  const query = `ALTER table project UPDATE ${_join(
    _map(columns, (col, id) => `${col}='${values[id]}'`),
    ', ',
    // @ts-ignore
  )} WHERE id='${project.id}'`
  return clickhouse.query(query).toPromise()
}

/**
 * Calculates in percent, the change between 2 numbers.
 * e.g from 1000 to 500 = 50%
 *
 * @param oldVal The initial value
 * @param newVal The value that changed
 * @param round Numbers after floating point
 */
const getPercentageChange = (oldVal: number, newVal: number, round = 2) => {
  if (oldVal === 0) {
    if (newVal === 0) {
      return 0
    }
    return _round(-100 * newVal, round)
  }

  const decrease = oldVal - newVal
  return _round((decrease / oldVal) * 100, round)
}

/**
 * Checking the % change in one number relative to the other
 * @param oldVal The initial value
 * @param newVal The value that changed
 * @param round Numbers after floating point
 */
const calculateRelativePercentage = (
  oldVal: number,
  newVal: number,
  round = 2,
) => {
  if (oldVal === newVal) return 0
  if (oldVal === 0) return 100
  if (newVal === 0) return -100

  if (newVal > oldVal) {
    return _round((newVal / oldVal) * 100, round)
  }

  return _round((1 - newVal / oldVal) * -100, round)
}

const deleteProjectClickhouse = async id => {
  const query = `ALTER table project DELETE WHERE WHERE id='${id}'`
  return clickhouse.query(query).toPromise()
}

const createProjectClickhouse = async (project: Project) => {
  const paramsData = {
    params: {
      ...project,
    },
  }
  const query = `INSERT INTO project (*) VALUES ({id:FixedString(12)},{name:String},'', '',1,0,'${dayjs
    .utc()
    .format('YYYY-MM-DD HH:mm:ss')}')`
  return clickhouse.query(query, paramsData).toPromise()
}

const saveRefreshTokenClickhouse = async (
  userId: string,
  refreshToken: string,
) => {
  const paramsData = {
    params: {
      userId,
      refreshToken,
    },
  }
  const query =
    'INSERT INTO refresh_token (*) VALUES ({userId:String},{refreshToken:String})'

  return clickhouse.query(query, paramsData).toPromise()
}

const findRefreshTokenClickhouse = async (
  userId: string,
  refreshToken: string,
) => {
  const paramsData = {
    params: {
      userId,
      refreshToken,
    },
  }
  const query =
    'SELECT * FROM refresh_token WHERE userId = {userId:String} AND refreshToken = {refreshToken:String}'
  return clickhouse.query(query, paramsData).toPromise()
}

const deleteRefreshTokenClickhouse = async (
  userId: string,
  refreshToken: string,
) => {
  const paramsData = {
    params: {
      userId,
      refreshToken,
    },
  }
  const query = `ALTER table refresh_token DELETE WHERE userId = {userId:String} AND refreshToken = {refreshToken:String}`
  return clickhouse.query(query, paramsData).toPromise()
}

const generateRecoveryCode = () =>
  randomstring.generate({
    length: 30,
    charset: 'alphabetic',
    capitalization: 'uppercase',
  })

const millisecondsToSeconds = (milliseconds: number) => milliseconds / 1000

const generateRandomString = (length: number): string =>
  randomstring.generate(length)

const getSelfhostedUUID = (): string => {
  try {
    return uuidv5(SELFHOSTED_EMAIL, UUIDV5_NAMESPACE)
  } catch {
    return DEFAULT_SELFHOSTED_UUID
  }
}

export {
  getRandomTip,
  checkRateLimit,
  createProjectClickhouse,
  getProjectsClickhouse,
  updateProjectClickhouse,
  deleteProjectClickhouse,
  splitAt,
  generateRecoveryCode,
  getPercentageChange,
  calculateRelativePercentage,
  millisecondsToSeconds,
  generateRandomString,
  getSelfhostedUUID,
  saveRefreshTokenClickhouse,
  findRefreshTokenClickhouse,
  deleteRefreshTokenClickhouse,
}
