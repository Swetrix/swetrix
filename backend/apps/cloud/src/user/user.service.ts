import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
  FindManyOptions,
  FindOneOptions,
  In,
  IsNull,
  LessThan,
  Not,
  Repository,
} from 'typeorm'
import axios from 'axios'
import crypto from 'crypto'
import CryptoJS from 'crypto-js'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _omit from 'lodash/omit'
import _isNull from 'lodash/isNull'
import _toNumber from 'lodash/toNumber'

import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import {
  User,
  ACCOUNT_PLANS,
  TRIAL_DURATION,
  BillingFrequency,
  PlanCode,
  isClassicSubscription,
} from './entities/user.entity'
import { UserProfileDTO } from './dto/user.dto'
import { RefreshToken } from './entities/refresh-token.entity'
import { DeleteFeedback } from './entities/delete-feedback.entity'
import { CancellationFeedback } from './entities/cancellation-feedback.entity'
import { UserGoogleDTO } from './dto/user-google.dto'
import { UserGithubDTO } from './dto/user-github.dto'
import { EMAIL_ACTION_ENCRYPTION_KEY } from '../common/constants'
import { ReportFrequency } from '../project/enums'
import { OrganisationService } from '../organisation/organisation.service'

dayjs.extend(utc)

const EUR = {
  symbol: '€',
  code: 'EUR',
}

const USD = {
  symbol: '$',
  code: 'USD',
}

const GBP = {
  symbol: '£',
  code: 'GBP',
}

const getSymbolByCode = (code: string) => {
  switch (code) {
    case EUR.code:
      return EUR.symbol
    case USD.code:
      return USD.symbol
    case GBP.code:
      return GBP.symbol
    default:
      return null
  }
}

const CURRENCY_BY_COUNTRY = {
  AT: EUR, // Austria
  BE: EUR, // Belgium
  CY: EUR, // Cyprus
  DE: EUR, // Germany
  DK: EUR, // Denmark
  EE: EUR, // Estonia
  ES: EUR, // Spain
  FI: EUR, // Finland
  FR: EUR, // France
  GB: GBP, // United Kingdom
  GR: EUR, // Greece
  HR: EUR, // Croatia
  IE: EUR, // Ireland
  IT: EUR, // Italy
  LT: EUR, // Lithuania
  LU: EUR, // Luxembourg
  LV: EUR, // Latvia
  MT: EUR, // Malta
  NL: EUR, // Netherlands
  PT: EUR, // Portugal
  SI: EUR, // Slovenia
  SK: EUR, // Slovakia
  US: USD, // United States
}

const { PADDLE_VENDOR_ID, PADDLE_API_KEY } = process.env
const PADDLE_CLASSIC_API = 'https://vendors.paddle.com/api/2.0'
const PADDLE_BILLING_API = 'https://api.paddle.com'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(DeleteFeedback)
    private readonly deleteFeedbackRepository: Repository<DeleteFeedback>,
    @InjectRepository(CancellationFeedback)
    private readonly cancellationFeedbackRepository: Repository<CancellationFeedback>,
    private readonly organisationService: OrganisationService,
  ) {}

  async create(
    userDTO: UserProfileDTO | User | UserGoogleDTO | UserGithubDTO,
  ): Promise<User> {
    return this.usersRepository.save(userDTO)
  }

  async paginate(
    options: PaginationOptionsInterface,
  ): Promise<Pagination<User>> {
    const [results, total] = await this.usersRepository.findAndCount({
      take: options.take || 10,
      skip: options.skip || 0,
    })

    return new Pagination<User>({
      results,
      total,
    })
  }

  async update(id: string, update: Record<string, unknown>): Promise<any> {
    return this.usersRepository.update({ id }, update)
  }

  async updateByEmail(
    email: string,
    update: Record<string, unknown>,
  ): Promise<any> {
    return this.usersRepository.update({ email }, update)
  }

  async updateBySubID(
    subID: string,
    update: Record<string, unknown>,
  ): Promise<any> {
    return this.usersRepository.update({ subID }, update)
  }

  async delete(id: string): Promise<any> {
    return this.usersRepository.delete(id)
  }

  async count(options?: FindManyOptions<User>): Promise<number> {
    return this.usersRepository.count(options)
  }

  omitSensitiveData(user: Partial<User>): Partial<User> {
    const maxEventsCount = ACCOUNT_PLANS[user?.planCode]?.monthlyUsageLimit || 0

    const enhancedUser = {
      ...user,
      maxEventsCount,
    }

    return _omit(enhancedUser, [
      'password',
      'twoFactorRecoveryCode',
      'twoFactorAuthenticationSecret',
    ])
  }

  private hashRefreshToken(refreshToken: string) {
    return crypto.createHash('sha256').update(refreshToken).digest('hex')
  }

  findOne(options: FindOneOptions<User> = {}): Promise<User> {
    return this.usersRepository.findOne(options)
  }

  find(options: FindManyOptions<User>): Promise<User[]> {
    return this.usersRepository.find(options)
  }

  validatePassword(pass: string): void {
    const err = []
    if (_isEmpty(pass)) {
      err.push('Password cannot be empty')
    }

    if (_size(pass) > 50) {
      err.push('Maximum password length is 50 letters')
    }

    if (_size(pass) < 8) {
      err.push('at least 8 characters')
    }

    if (!_isEmpty(err)) {
      throw new BadRequestException(err)
    }
  }

  search(query: string): Promise<User[]> {
    return this.usersRepository
      .createQueryBuilder('user')
      .select()
      .where('email like :query', { query: `%${query}%` })
      .limit(5)
      .getMany()
  }

  public async findUser(email: string) {
    return this.usersRepository.findOne({ where: { email } })
  }

  public async createUser(user: Pick<User, 'email' | 'password'>) {
    return this.usersRepository.save({
      ...user,
      isActive: true,
      trialEndDate: dayjs
        .utc()
        .add(TRIAL_DURATION, 'day')
        .format('YYYY-MM-DD HH:mm:ss'),
    })
  }

  public async findUserById(id: string) {
    return this.usersRepository.findOne({ where: { id } })
  }

  public async updateUser(id: string, user: Partial<Omit<User, 'id'>>) {
    return this.usersRepository.update({ id }, user)
  }

  public async saveDeleteFeedback(feedback: string) {
    return this.deleteFeedbackRepository.save({
      feedback,
    })
  }

  public async findDeleteFeedback(id: string) {
    return this.deleteFeedbackRepository.findOne({ where: { id } })
  }

  public async deleteDeleteFeedback(id: string) {
    await this.deleteFeedbackRepository.delete({ id })
  }

  public async saveRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = this.hashRefreshToken(refreshToken)
    return this.refreshTokenRepository.save({
      userId,
      refreshToken: hashedRefreshToken,
    })
  }

  public async findRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = this.hashRefreshToken(refreshToken)
    return this.refreshTokenRepository.findOne({
      // Backward-compatible: support legacy plaintext tokens while migrating.
      where: [
        { userId, refreshToken },
        { userId, refreshToken: hashedRefreshToken },
      ],
    })
  }

  public async deleteRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = this.hashRefreshToken(refreshToken)
    await this.refreshTokenRepository.delete({
      userId,
      refreshToken: In([refreshToken, hashedRefreshToken]),
    })
  }

  public async deleteAllRefreshTokens(userId: string) {
    await this.refreshTokenRepository.delete({
      userId,
    })
  }

  public async deleteRefreshTokensWhere(criteria: Record<string, unknown>) {
    await this.refreshTokenRepository.delete(criteria)
  }

  public async findUserByApiKey(apiKey: string) {
    return this.usersRepository.findOne({ where: { apiKey } })
  }

  async getUserByTelegramId(telegramId: string | number) {
    return this.usersRepository.findOne({
      where: { telegramChatId: telegramId.toString() },
    })
  }

  async getOrganisationsForUser(userId: string) {
    return this.organisationService.findMemberships({
      where: {
        user: { id: userId },
      },
      relations: ['organisation'],
      select: {
        id: true,
        role: true,
        confirmed: true,
        created: true,
        organisation: {
          id: true,
          name: true,
        },
      },
    })
  }

  async updateUserTelegramId(
    userId: string,
    telegramId: number | null,
    isTelegramChatIdConfirmed = false,
  ) {
    await this.usersRepository.update(userId, {
      telegramChatId: _isNull(telegramId) ? null : String(telegramId),
      isTelegramChatIdConfirmed,
    })
  }

  getCurrencyByCountry(country: string) {
    return CURRENCY_BY_COUNTRY[country] || USD
  }

  // Paddle Classic: look up by numeric plan ID
  getPlanById(planId: number) {
    if (!planId) return null

    const stringifiedPlanId = String(planId)
    const plan = Object.values(ACCOUNT_PLANS).find(
      (tier) => tier.pid === stringifiedPlanId || tier.ypid === stringifiedPlanId,
    )

    if (plan && plan.pid) {
      return {
        planCode: plan.id,
        billingFrequency:
          plan.pid === stringifiedPlanId
            ? BillingFrequency.Monthly
            : BillingFrequency.Yearly,
      }
    }

    return null
  }

  // Paddle Billing: look up by price ID string
  getPlanByPriceId(priceId: string) {
    if (!priceId) return null

    const plan = Object.values(ACCOUNT_PLANS).find(
      (tier) => tier.priceId === priceId || tier.yearlyPriceId === priceId,
    )

    if (plan && plan.priceId) {
      return {
        planCode: plan.id,
        billingFrequency:
          plan.priceId === priceId
            ? BillingFrequency.Monthly
            : BillingFrequency.Yearly,
      }
    }

    return null
  }

  async previewSubscription(id: string, priceId: string) {
    const user = await this.findOne({ where: { id } })

    if (isClassicSubscription(user.subID)) {
      return this.previewClassicSubscription(user, priceId)
    }

    return this.previewBillingSubscription(user, priceId)
  }

  private async previewClassicSubscription(user: User, priceId: string) {
    const plan = this.getPlanByPriceId(priceId)
    if (!plan) throw new BadRequestException('Plan not found')

    const { planCode, billingFrequency } = plan
    if (user.planCode === planCode && user.billingFrequency === billingFrequency) {
      throw new BadRequestException('You are already subscribed to this plan')
    }
    if (user.cancellationEffectiveDate) {
      throw new BadRequestException(
        'Cannot preview a subscription change as it has been cancelled, please subscribe to a new plan',
      )
    }

    // Find the Classic numeric plan ID for this price
    const targetPlan = Object.values(ACCOUNT_PLANS).find(
      (t) => t.priceId === priceId || t.yearlyPriceId === priceId,
    )
    const classicPlanId =
      targetPlan?.priceId === priceId
        ? Number(targetPlan?.pid)
        : Number(targetPlan?.ypid)

    const url = `${PADDLE_CLASSIC_API}/subscription/preview_update`

    let preview: any = {}
    try {
      preview = await axios.post(url, {
        vendor_id: Number(PADDLE_VENDOR_ID),
        vendor_auth_code: PADDLE_API_KEY,
        subscription_id: Number(user.subID),
        plan_id: classicPlanId,
        prorate: true,
        bill_immediately: true,
        currency: user.tierCurrency,
        keep_modifiers: false,
      })
    } catch (error) {
      console.error(
        '[ERROR] (previewClassicSubscription):',
        error?.response?.data?.error?.message || error,
      )
      throw new BadRequestException('Something went wrong')
    }

    const { data } = preview
    if (!data.success) {
      console.error('[ERROR] (previewClassicSubscription) success -> false:', preview)
      throw new InternalServerErrorException('Something went wrong')
    }

    const symbol = getSymbolByCode(data.response.next_payment.currency)

    return {
      immediatePayment: {
        ...data.response.immediate_payment,
        symbol,
      },
      nextPayment: {
        ...data.response.next_payment,
        symbol,
      },
    }
  }

  private async previewBillingSubscription(user: User, priceId: string) {
    const plan = this.getPlanByPriceId(priceId)
    if (!plan) throw new BadRequestException('Plan not found')

    const { planCode, billingFrequency } = plan
    if (user.planCode === planCode && user.billingFrequency === billingFrequency) {
      throw new BadRequestException('You are already subscribed to this plan')
    }
    if (user.cancellationEffectiveDate) {
      throw new BadRequestException(
        'Cannot preview a subscription change as it has been cancelled, please subscribe to a new plan',
      )
    }

    let preview: any = {}
    try {
      preview = await axios.get(
        `${PADDLE_BILLING_API}/subscriptions/${user.subID}`,
        {
          headers: {
            Authorization: `Bearer ${PADDLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          params: { include: 'next_transaction' },
        },
      )
    } catch (error) {
      console.error(
        '[ERROR] (previewBillingSubscription):',
        error?.response?.data || error,
      )
      throw new BadRequestException('Something went wrong')
    }

    const subscriptionData = preview.data?.data
    if (!subscriptionData) {
      throw new InternalServerErrorException('Something went wrong')
    }

    const nextTransaction = subscriptionData.next_transaction
    const currentBillingPeriod = subscriptionData.current_billing_period
    const currency = subscriptionData.currency_code || user.tierCurrency
    const symbol = getSymbolByCode(currency)

    const immediateAmount = nextTransaction?.details?.totals?.grand_total
      ? _toNumber(nextTransaction.details.totals.grand_total) / 100
      : 0

    const nextAmount = nextTransaction?.details?.totals?.grand_total
      ? _toNumber(nextTransaction.details.totals.grand_total) / 100
      : 0

    return {
      immediatePayment: {
        amount: immediateAmount,
        currency,
        symbol,
        date: new Date().toISOString().split('T')[0],
      },
      nextPayment: {
        amount: nextAmount,
        currency,
        symbol,
        date: currentBillingPeriod?.ends_at
          ? currentBillingPeriod.ends_at.split('T')[0]
          : null,
      },
    }
  }

  isPaidTier(user: User) {
    if (!user) {
      return false
    }

    return ![PlanCode.none, PlanCode.free, PlanCode.trial].includes(
      user.planCode,
    )
  }

  async saveCancellationFeedback(
    email: string,
    planCode: string,
    feedback: string,
  ) {
    return this.cancellationFeedbackRepository.save({
      email,
      planCode,
      feedback,
    })
  }

  async cancelSubscription(subID: string) {
    if (isClassicSubscription(subID)) {
      return this.cancelClassicSubscription(subID)
    }

    return this.cancelBillingSubscription(subID)
  }

  private async cancelClassicSubscription(subID: string) {
    const url = `${PADDLE_CLASSIC_API}/subscription/users/cancel`

    try {
      const result = await axios.post(url, {
        vendor_id: Number(PADDLE_VENDOR_ID),
        vendor_auth_code: PADDLE_API_KEY,
        subscription_id: Number(subID),
      })

      if (!result.data?.success) {
        console.error(
          '[ERROR] (cancelClassicSubscription) success -> false:',
          result.data,
        )
        throw new InternalServerErrorException(
          'Failed to cancel subscription with payment provider',
        )
      }
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error

      console.error(
        '[ERROR] (cancelClassicSubscription):',
        error?.response?.data?.error?.message || error,
      )
      throw new BadRequestException(
        'Failed to cancel subscription. Please try again or contact support.',
      )
    }
  }

  private async cancelBillingSubscription(subID: string) {
    const url = `${PADDLE_BILLING_API}/subscriptions/${subID}/cancel`

    try {
      const result = await axios.post(
        url,
        { effective_from: 'next_billing_period' },
        {
          headers: {
            Authorization: `Bearer ${PADDLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      )

      if (!result.data?.data) {
        console.error(
          '[ERROR] (cancelBillingSubscription) unexpected response:',
          result.data,
        )
        throw new InternalServerErrorException(
          'Failed to cancel subscription with payment provider',
        )
      }
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error

      console.error(
        '[ERROR] (cancelBillingSubscription):',
        error?.response?.data || error,
      )
      throw new BadRequestException(
        'Failed to cancel subscription. Please try again or contact support.',
      )
    }
  }

  async updateSubscription(id: string, priceId: string) {
    const user = await this.findOne({ where: { id } })

    if (isClassicSubscription(user.subID)) {
      return this.updateClassicSubscription(user, id, priceId)
    }

    return this.updateBillingSubscription(user, id, priceId)
  }

  private async updateClassicSubscription(user: User, id: string, priceId: string) {
    const plan = this.getPlanByPriceId(priceId)
    if (!plan) throw new BadRequestException('Plan not found')

    const { planCode, billingFrequency } = plan
    if (user.planCode === planCode && user.billingFrequency === billingFrequency) {
      throw new BadRequestException('You are already subscribed to this plan')
    }
    if (user.cancellationEffectiveDate) {
      throw new BadRequestException(
        'Cannot change your subscription as it has been cancelled, please subscribe to a new plan',
      )
    }

    const targetPlan = Object.values(ACCOUNT_PLANS).find(
      (t) => t.priceId === priceId || t.yearlyPriceId === priceId,
    )
    const classicPlanId =
      targetPlan?.priceId === priceId
        ? Number(targetPlan?.pid)
        : Number(targetPlan?.ypid)

    const url = `${PADDLE_CLASSIC_API}/subscription/users/update`

    let result: any = {}
    try {
      result = await axios.post(url, {
        vendor_id: Number(PADDLE_VENDOR_ID),
        vendor_auth_code: PADDLE_API_KEY,
        subscription_id: Number(user.subID),
        plan_id: classicPlanId,
        prorate: true,
        bill_immediately: true,
        currency: user.tierCurrency,
        keep_modifiers: false,
        passthrough: JSON.stringify({ uid: id }),
      })
    } catch (error) {
      console.error(
        '[ERROR] (updateClassicSubscription):',
        error?.response?.data?.error?.message || error,
      )
      throw new BadRequestException('Something went wrong')
    }

    const { data } = result
    if (!data.success) {
      console.error('[ERROR] (updateClassicSubscription) success -> false:', result)
      throw new InternalServerErrorException('Something went wrong')
    }

    const { response } = data
    const {
      subscription_id: subID,
      next_payment: { currency, date },
    } = response

    await this.update(id, {
      planCode,
      subID,
      nextBillDate: date,
      billingFrequency,
      tierCurrency: currency,
    })
  }

  private async updateBillingSubscription(user: User, id: string, priceId: string) {
    const plan = this.getPlanByPriceId(priceId)
    if (!plan) throw new BadRequestException('Plan not found')

    const { planCode, billingFrequency } = plan
    if (user.planCode === planCode && user.billingFrequency === billingFrequency) {
      throw new BadRequestException('You are already subscribed to this plan')
    }
    if (user.cancellationEffectiveDate) {
      throw new BadRequestException(
        'Cannot change your subscription as it has been cancelled, please subscribe to a new plan',
      )
    }

    const url = `${PADDLE_BILLING_API}/subscriptions/${user.subID}`

    let result: any = {}
    try {
      result = await axios.patch(
        url,
        {
          items: [{ price_id: priceId, quantity: 1 }],
          proration_billing_mode: 'prorated_immediately',
          custom_data: { uid: id },
        },
        {
          headers: {
            Authorization: `Bearer ${PADDLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      )
    } catch (error) {
      console.error(
        '[ERROR] (updateBillingSubscription):',
        error?.response?.data || error,
      )
      throw new BadRequestException('Something went wrong')
    }

    const subscriptionData = result.data?.data
    if (!subscriptionData) {
      console.error('[ERROR] (updateBillingSubscription) no data:', result.data)
      throw new InternalServerErrorException('Something went wrong')
    }

    const nextBillDate = subscriptionData.current_billing_period?.ends_at
      ? new Date(subscriptionData.current_billing_period.ends_at)
      : null

    await this.update(id, {
      planCode,
      subID: subscriptionData.id,
      nextBillDate,
      billingFrequency,
      tierCurrency: subscriptionData.currency_code,
    })
  }

  createUnsubscribeKey(userId: string): string {
    const base64 = CryptoJS.Rabbit.encrypt(
      userId,
      EMAIL_ACTION_ENCRYPTION_KEY,
    ).toString()
    // Convert to URL-safe base64 (base64url)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  decryptUnsubscribeKey(token: string): string {
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/')

    const padding = base64.length % 4
    if (padding) {
      base64 += '='.repeat(4 - padding)
    }

    const bytes = CryptoJS.Rabbit.decrypt(base64, EMAIL_ACTION_ENCRYPTION_KEY)
    return bytes.toString(CryptoJS.enc.Utf8)
  }

  async getReportUsers(
    reportFrequency:
      | ReportFrequency.WEEKLY
      | ReportFrequency.MONTHLY
      | ReportFrequency.QUARTERLY,
  ) {
    // First get the user IDs that match our criteria
    const userIds = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoin('user.projects', 'p')
      .select('user.id')
      .where({
        reportFrequency,
        planCode: Not(PlanCode.none),
        dashboardBlockReason: IsNull(),
      })
      .groupBy('user.id')
      .having('COUNT(p.id) BETWEEN 1 AND 50')
      .getMany()

    if (_isEmpty(userIds)) {
      return []
    }

    // Then fetch those users with their projects
    return this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.projects', 'projects')
      .select(['user.id', 'user.email', 'projects.id', 'projects.name'])
      .where('user.id IN (:...userIds)', {
        userIds: userIds.map((u) => u.id),
      })
      .getMany()
  }

  async getUsersForLockDashboards() {
    const sevenDaysAgo = dayjs
      .utc()
      .subtract(7, 'days')
      .format('YYYY-MM-DD HH:mm:ss')

    // First get the user IDs that have at least one project
    const userIds = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoin('user.projects', 'p')
      .select('user.id')
      .where({
        isActive: true,
        planCode: Not(In([PlanCode.none, PlanCode.trial])),
        planExceedContactedAt: LessThan(sevenDaysAgo),
        dashboardBlockReason: IsNull(),
        isAccountBillingSuspended: false,
        cancellationEffectiveDate: IsNull(),
      })
      .groupBy('user.id')
      .having('COUNT(p.id) > 0')
      .getMany()

    if (_isEmpty(userIds)) {
      return []
    }

    // Then fetch those users with their projects
    return this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.projects', 'projects')
      .select(['user.id', 'user.email', 'user.planCode', 'projects.id'])
      .where('user.id IN (:...userIds)', {
        userIds: userIds.map((u) => u.id),
      })
      .getMany()
  }

  async getUsersForPlanUsageCheck() {
    // First get the user IDs that have at least one project
    const userIds = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoin('user.projects', 'p')
      .select('user.id')
      .where({
        isActive: true,
        planCode: Not(In([PlanCode.none, PlanCode.trial])),
        planExceedContactedAt: IsNull(),
        dashboardBlockReason: IsNull(),
        isAccountBillingSuspended: false,
        cancellationEffectiveDate: IsNull(),
      })
      .groupBy('user.id')
      .having('COUNT(p.id) > 0')
      .getMany()

    if (_isEmpty(userIds)) {
      return []
    }

    // Then fetch those users with their projects
    return this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.projects', 'projects')
      .select(['user.id', 'user.email', 'user.planCode', 'projects.id'])
      .where('user.id IN (:...userIds)', {
        userIds: userIds.map((u) => u.id),
      })
      .getMany()
  }
}
