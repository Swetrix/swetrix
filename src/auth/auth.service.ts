import { Injectable, UnprocessableEntityException, BadRequestException } from '@nestjs/common'
import { sign } from 'jsonwebtoken'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import * as https from 'https'
import * as _toUpper from 'lodash/toUpper'
import * as _includes from 'lodash/includes'

import { UserService } from '../user/user.service'
import { ACCOUNT_PLANS } from '../user/entities/user.entity'
import { AppLoggerService } from '../logger/logger.service'
import { User } from '../user/entities/user.entity'
import {
  isSelfhosted, JWT_LIFE_TIME, SELFHOSTED_UUID,
} from '../common/constants'
import { splitAt } from '../common/utils'

const HIBP_URL = 'https://api.pwnedpasswords.com/range'
const BCRYPT_SALT_ROUNDS = 10

const httpsOptions = {
  headers: {
    'User-Agent': 'Swetrix API (contact@swetrix.com)',
  }
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private readonly logger: AppLoggerService
  ) { }

  async hashPassword(pass: string): Promise<string> {
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS)
    return await bcrypt.hash(pass, salt)
  }

  async get(hash) {
    return new Promise((resolve, reject) => {
      https.get(`${HIBP_URL}/${hash}`, httpsOptions, (res) => {
        let data = ''

        if (res.statusCode !== 200) {
          return reject(`Failed to load ${HIBP_URL} API: ${res.statusCode}`)
        }

        res.on('data', (chunk) => {
          data += chunk
        })

        res.on('end', () => {
          resolve(data)
        })

        return true
      }).on('error', (err) => {
        reject(err)
      })
    })
  }

  async sha1hash(string): Promise<string> {
    return new Promise((resolve) => {
      const shasum = _toUpper(crypto.createHash('sha1').update(string).digest('hex'))
      resolve(shasum)
    })
  }

  async checkIfPasswordLeaked(pass: string): Promise<void> {
    const shasum = splitAt(await this.sha1hash(pass), 5)
    let isLeaked

    try {
      const result = await this.get(shasum[0])
      isLeaked = _includes(result, shasum[1])
    } catch (e) {
      this.logger.log(`[ERROR /  HAVEIBEENPWNED]: ${e}`, 'AUTH SERVICE', true)
    }

    if (isLeaked) {
      throw new BadRequestException('leakedPassword')
    }
  }

  async checkPassword(passToCheck: string, hashedPass: string): Promise<boolean> {
    return await bcrypt.compare(passToCheck, hashedPass)
  }

  async validateUser(email: string, pass: string): Promise<User> {
    const user = await this.userService.findOneWhere({ email })

    if (user && await this.checkPassword(pass, user.password)) {
      return user
    }

    throw new UnprocessableEntityException('Email or password is incorrect')
  }

  processUser(user: User): object {
    // @ts-ignore
    const maxEventsCount = ACCOUNT_PLANS[user.planCode].monthlyUsageLimit || 0
    const userData = {
      // @ts-ignore
      ...user,
      password: undefined,
      maxEventsCount,
    }

    return userData
  }

  login(user: User | object): object {
    let userData = user

    if (isSelfhosted) {
      // @ts-ignore
      userData = {
        ...user,
        id: SELFHOSTED_UUID,
      }
    } else {
      // @ts-ignore
      userData = this.processUser(user)
    }

    // @ts-ignore
    const token = sign({ user_id: userData.id }, process.env.JWT_SECRET, {
      expiresIn: JWT_LIFE_TIME,
    })

    return { access_token: token, user: userData }
  }
}
