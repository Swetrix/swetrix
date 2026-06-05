import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
  EntityManager,
  FindManyOptions,
  FindOneOptions,
  In,
  IsNull,
  LessThan,
  Not,
  Repository,
} from 'typeorm'

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
  PlanType,
  getEffectivePlanType,
  getEffectiveAccountLimits,
  getPurchasedWebsiteAddons,
  getPurchasedSessionReplayAddons,
  getSessionReplayQuota,
} from './entities/user.entity'
import { UserProfileDTO } from './dto/user.dto'
import { RefreshToken } from './entities/refresh-token.entity'
import { DeleteFeedback } from './entities/delete-feedback.entity'
import { CancellationFeedback } from './entities/cancellation-feedback.entity'
import { UserFeedback } from './entities/user-feedback.entity'
import {
  UserAddon,
  UserAddonCode,
  UserAddonStatus,
} from './entities/user-addon.entity'
import {
  UserAddonCharge,
  UserAddonChargeKind,
  UserAddonChargeStatus,
} from './entities/user-addon-charge.entity'
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
const DEFAULT_CDN_URL = 'https://cdn.swetrix.com'
const FEEDBACK_ATTACHMENT_UPLOAD_TIMEOUT_MS = 10_000
const WEBSITE_ADDON_BUNDLE_SIZE = 50
const WEBSITE_ADDON_MAX_QUANTITY = 1000
const WEBSITE_ADDON_RETRY_DELAY_HOURS = 6
const WEBSITE_ADDON_RENEWAL_CLAIM_MINUTES = 15
const WEBSITE_ADDON_MAX_FAILED_CHARGES = 3
const WEBSITE_ADDON_MONTHLY_PRICE: Record<string, number> = {
  USD: 7.5,
  EUR: 7,
  GBP: 6,
}
const SESSION_REPLAY_ADDON_BUNDLE_SIZE = 5000
const SESSION_REPLAY_ADDON_MAX_QUANTITY = 100000
const SESSION_REPLAY_ADDON_MONTHLY_PRICE: Record<string, number> = {
  USD: 19,
  EUR: 17,
  GBP: 15,
}
const WEBSITE_ADDON_CURRENCIES = ['USD', 'EUR', 'GBP']

type WebsiteAddonChangeType =
  | 'none'
  | 'new'
  | 'increase'
  | 'decrease'
  | 'cancel'
  | 'interval_change'
  | 'reactivate'

interface WebsiteAddonPreview {
  code: UserAddonCode.websites
  quantity: number
  currentQuantity: number
  pendingQuantity: number | null
  billingInterval: BillingFrequency
  currentBillingInterval: BillingFrequency | null
  pendingBillingInterval: BillingFrequency | null
  currency: string
  dueNow: number
  recurringAmount: number
  nextChargeDate: string | null
  effectiveDate: string | null
  includedWebsites: number
  totalWebsites: number
  activeExtraWebsites: number
  changeType: WebsiteAddonChangeType
  isLegacy: boolean
  status: UserAddonStatus | null
}

interface SessionReplayAddonPreview {
  code: UserAddonCode.sessionReplays
  quantity: number
  currentQuantity: number
  pendingQuantity: number | null
  billingInterval: BillingFrequency
  currentBillingInterval: BillingFrequency | null
  pendingBillingInterval: BillingFrequency | null
  currency: string
  dueNow: number
  recurringAmount: number
  nextChargeDate: string | null
  effectiveDate: string | null
  includedSessionReplays: number | 'custom'
  totalSessionReplays: number | 'custom'
  activeExtraSessionReplays: number
  changeType: WebsiteAddonChangeType
  isLegacy: boolean
  status: UserAddonStatus | null
}

interface WebsiteAddonSummary {
  code: UserAddonCode.websites
  quantity: number
  pendingQuantity: number | null
  billingInterval: BillingFrequency | null
  pendingBillingInterval: BillingFrequency | null
  currency: string | null
  status: UserAddonStatus | 'legacy' | null
  periodEnd: string | null
  nextChargeDate: string | null
  recurringAmount: number | null
  isLegacy: boolean
  failedChargeAttempts: number
}

interface SessionReplayAddonSummary {
  code: UserAddonCode.sessionReplays
  quantity: number
  pendingQuantity: number | null
  billingInterval: BillingFrequency | null
  pendingBillingInterval: BillingFrequency | null
  currency: string | null
  status: UserAddonStatus | 'legacy' | null
  periodEnd: string | null
  nextChargeDate: string | null
  recurringAmount: number | null
  isLegacy: boolean
  failedChargeAttempts: number
}

type CdnFileResponse =
  | string
  | {
      url?: string
      filename?: string
      id?: string
    }

const normaliseCdnUrl = (baseUrl: string, value: CdnFileResponse) => {
  if (typeof value === 'string') {
    return value.startsWith('http') ? value : `${baseUrl}/file/${value}`
  }

  if (value.url) {
    return value.url
  }

  const filename = value.filename || value.id
  return filename ? `${baseUrl}/file/${filename}` : null
}

const getCdnFiles = (payload: unknown): CdnFileResponse[] => {
  if (Array.isArray(payload)) {
    return payload
  }

  if (!payload || typeof payload !== 'object') {
    return []
  }

  const data = payload as Record<string, unknown>

  for (const key of ['files', 'urls', 'filenames', 'data']) {
    const value = data[key]
    if (Array.isArray(value)) {
      return value as CdnFileResponse[]
    }
  }

  return []
}

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
    @InjectRepository(UserFeedback)
    private readonly userFeedbackRepository: Repository<UserFeedback>,
    @InjectRepository(UserAddon)
    private readonly userAddonRepository: Repository<UserAddon>,
    @InjectRepository(UserAddonCharge)
    private readonly userAddonChargeRepository: Repository<UserAddonCharge>,
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

  private getAddonOverrideQuantity(user: Partial<User>): number {
    return getPurchasedWebsiteAddons(user)
  }

  private getSessionReplayAddonOverrideQuantity(user: Partial<User>): number {
    return getPurchasedSessionReplayAddons(user)
  }

  private getMoneyValue(value?: string | null): number | null {
    if (value === null || value === undefined) {
      return null
    }

    const amount = _toNumber(value)
    return Number.isFinite(amount) ? amount : null
  }

  private isDuplicateEntryError(reason: unknown): boolean {
    const error = reason as { code?: string; errno?: number }
    return error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062
  }

  private getAddonChargeRepository(manager?: EntityManager) {
    return manager
      ? manager.getRepository(UserAddonCharge)
      : this.userAddonChargeRepository
  }

  private async getLockedUser(
    manager: EntityManager,
    userId: string,
  ): Promise<User | null> {
    return manager
      .getRepository(User)
      .createQueryBuilder('user')
      .setLock('pessimistic_write')
      .where('user.id = :userId', { userId })
      .getOne()
  }

  private async getLockedWebsiteAddon(
    manager: EntityManager,
    userId: string,
  ): Promise<UserAddon | null> {
    return this.getLockedAddon(manager, userId, UserAddonCode.websites)
  }

  private async getLockedAddon(
    manager: EntityManager,
    userId: string,
    code: UserAddonCode,
  ): Promise<UserAddon | null> {
    return manager
      .getRepository(UserAddon)
      .createQueryBuilder('addon')
      .setLock('pessimistic_write')
      .where('addon.userId = :userId', { userId })
      .andWhere('addon.code = :code', { code })
      .getOne()
  }

  private getIncludedWebsiteLimit(user: Partial<User>): number {
    return getEffectiveAccountLimits(user).includedWebsites
  }

  private getIncludedSessionReplayLimit(
    user: Partial<User>,
  ): number | 'custom' {
    return getEffectiveAccountLimits(user).includedSessionReplays
  }

  private getWebsiteAddonCurrency(user: User): string {
    return typeof user.tierCurrency === 'string' &&
      WEBSITE_ADDON_CURRENCIES.includes(user.tierCurrency)
      ? user.tierCurrency
      : 'USD'
  }

  private roundMoney(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100) / 100
  }

  private getWebsiteAddonAmount(
    quantity: number,
    billingInterval: BillingFrequency,
    currency: string,
  ): number {
    const monthlyPrice =
      WEBSITE_ADDON_MONTHLY_PRICE[currency] || WEBSITE_ADDON_MONTHLY_PRICE.USD
    const bundles = quantity / WEBSITE_ADDON_BUNDLE_SIZE
    const intervalMultiplier =
      billingInterval === BillingFrequency.Yearly ? 10 : 1

    return this.roundMoney(bundles * monthlyPrice * intervalMultiplier)
  }

  private getSessionReplayAddonAmount(
    quantity: number,
    billingInterval: BillingFrequency,
    currency: string,
  ): number {
    const monthlyPrice =
      SESSION_REPLAY_ADDON_MONTHLY_PRICE[currency] ||
      SESSION_REPLAY_ADDON_MONTHLY_PRICE.USD
    const bundles = quantity / SESSION_REPLAY_ADDON_BUNDLE_SIZE
    const intervalMultiplier =
      billingInterval === BillingFrequency.Yearly ? 10 : 1

    return this.roundMoney(bundles * monthlyPrice * intervalMultiplier)
  }

  private getWebsiteAddonPeriodEnd(
    from: Date,
    billingInterval: BillingFrequency,
  ): Date {
    return dayjs
      .utc(from)
      .add(1, billingInterval === BillingFrequency.Yearly ? 'year' : 'month')
      .toDate()
  }

  private formatAddonDate(date?: Date | string | null): string | null {
    return date ? dayjs.utc(date).toISOString() : null
  }

  private validateWebsiteAddonSelection(
    quantity: number,
    billingInterval: BillingFrequency,
  ) {
    if (
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      quantity > WEBSITE_ADDON_MAX_QUANTITY ||
      quantity % WEBSITE_ADDON_BUNDLE_SIZE !== 0
    ) {
      throw new BadRequestException('invalidWebsiteAddonQuantity')
    }

    if (
      ![BillingFrequency.Monthly, BillingFrequency.Yearly].includes(
        billingInterval,
      )
    ) {
      throw new BadRequestException('invalidWebsiteAddonBillingInterval')
    }
  }

  private validateWebsiteAddonEligibility(user: User) {
    const isSubscriber = ![
      PlanCode.none,
      PlanCode.free,
      PlanCode.trial,
    ].includes(user.planCode)
    const isTrialingPaidPlan =
      user.trialEndDate && dayjs.utc(user.trialEndDate).isAfter(dayjs.utc())

    if (!isSubscriber || !user.subID) {
      throw new BadRequestException('websiteAddonRequiresSubscription')
    }

    if (isTrialingPaidPlan) {
      throw new BadRequestException('websiteAddonUnavailableDuringTrial')
    }

    if (user.cancellationEffectiveDate) {
      throw new BadRequestException('websiteAddonUnavailableCancelled')
    }

    if (user.isAccountBillingSuspended) {
      throw new BadRequestException('websiteAddonUnavailableSuspended')
    }
  }

  private validateSessionReplayAddonSelection(
    quantity: number,
    billingInterval: BillingFrequency,
  ) {
    if (
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      quantity > SESSION_REPLAY_ADDON_MAX_QUANTITY ||
      quantity % SESSION_REPLAY_ADDON_BUNDLE_SIZE !== 0
    ) {
      throw new BadRequestException('invalidSessionReplayAddonQuantity')
    }

    if (
      ![BillingFrequency.Monthly, BillingFrequency.Yearly].includes(
        billingInterval,
      )
    ) {
      throw new BadRequestException('invalidSessionReplayAddonBillingInterval')
    }
  }

  private validateSessionReplayAddonEligibility(user: User) {
    const isSubscriber = ![
      PlanCode.none,
      PlanCode.free,
      PlanCode.trial,
    ].includes(user.planCode)
    const isTrialingPaidPlan =
      user.trialEndDate && dayjs.utc(user.trialEndDate).isAfter(dayjs.utc())

    if (!isSubscriber || !user.subID) {
      throw new BadRequestException('sessionReplayAddonRequiresSubscription')
    }

    if (isTrialingPaidPlan) {
      throw new BadRequestException('sessionReplayAddonUnavailableDuringTrial')
    }

    if (user.cancellationEffectiveDate) {
      throw new BadRequestException('sessionReplayAddonUnavailableCancelled')
    }

    if (user.isAccountBillingSuspended) {
      throw new BadRequestException('sessionReplayAddonUnavailableSuspended')
    }

    if (getSessionReplayQuota(user) === 'custom') {
      throw new BadRequestException('sessionReplayAddonUnavailableCustom')
    }
  }

  private async getWebsiteAddon(userId: string): Promise<UserAddon | null> {
    return this.userAddonRepository.findOne({
      where: {
        userId,
        code: UserAddonCode.websites,
      },
    })
  }

  private async getSessionReplayAddon(
    userId: string,
  ): Promise<UserAddon | null> {
    return this.userAddonRepository.findOne({
      where: {
        userId,
        code: UserAddonCode.sessionReplays,
      },
    })
  }

  private getProratedWebsiteAddonAmount(
    addon: UserAddon,
    addedQuantity: number,
    currency: string,
  ): number {
    const fullAmount = this.getWebsiteAddonAmount(
      addedQuantity,
      addon.billingInterval,
      currency,
    )

    if (!addon.periodStart || !addon.periodEnd) {
      return fullAmount
    }

    const now = dayjs.utc()
    const start = dayjs.utc(addon.periodStart)
    const end = dayjs.utc(addon.periodEnd)
    const totalMs = end.diff(start)
    const remainingMs = end.diff(now)

    if (totalMs <= 0 || remainingMs <= 0) {
      return fullAmount
    }

    return this.roundMoney(fullAmount * Math.min(1, remainingMs / totalMs))
  }

  private getProratedSessionReplayAddonAmount(
    addon: UserAddon,
    addedQuantity: number,
    currency: string,
  ): number {
    const fullAmount = this.getSessionReplayAddonAmount(
      addedQuantity,
      addon.billingInterval,
      currency,
    )

    if (!addon.periodStart || !addon.periodEnd) {
      return fullAmount
    }

    const now = dayjs.utc()
    const start = dayjs.utc(addon.periodStart)
    const end = dayjs.utc(addon.periodEnd)
    const totalMs = end.diff(start)
    const remainingMs = end.diff(now)

    if (totalMs <= 0 || remainingMs <= 0) {
      return fullAmount
    }

    return this.roundMoney(fullAmount * Math.min(1, remainingMs / totalMs))
  }

  private buildWebsiteAddonPreview(
    user: User,
    addon: UserAddon | null,
    quantity: number,
    billingInterval: BillingFrequency,
  ): WebsiteAddonPreview {
    const legacyQuantity = addon ? 0 : this.getAddonOverrideQuantity(user)
    const isLegacy = legacyQuantity > 0
    const currentQuantity =
      addon && addon.status !== UserAddonStatus.cancelled
        ? addon.quantity
        : legacyQuantity
    const currentBillingInterval =
      addon && addon.status !== UserAddonStatus.cancelled
        ? addon.billingInterval
        : null
    const currency = addon?.currency || this.getWebsiteAddonCurrency(user)
    const includedWebsites = this.getIncludedWebsiteLimit(user)
    const existingChargeDate = addon?.nextChargeDate || addon?.periodEnd || null
    let changeType: WebsiteAddonChangeType = 'none'
    let dueNow = 0
    let effectiveDate: string | null = null

    if (isLegacy) {
      return {
        code: UserAddonCode.websites,
        quantity: currentQuantity,
        currentQuantity,
        pendingQuantity: null,
        billingInterval,
        currentBillingInterval: null,
        pendingBillingInterval: null,
        currency,
        dueNow: 0,
        recurringAmount: 0,
        nextChargeDate: null,
        effectiveDate: null,
        includedWebsites,
        totalWebsites: includedWebsites + currentQuantity,
        activeExtraWebsites: currentQuantity,
        changeType,
        isLegacy,
        status: null,
      }
    }

    if (
      !addon ||
      addon.status === UserAddonStatus.cancelled ||
      (addon.status === UserAddonStatus.past_due && currentQuantity === 0)
    ) {
      if (quantity > 0) {
        changeType =
          addon?.status === UserAddonStatus.past_due ? 'reactivate' : 'new'
        dueNow = this.getWebsiteAddonAmount(quantity, billingInterval, currency)
      }
    } else if (quantity > currentQuantity) {
      changeType = 'increase'
      dueNow = this.getProratedWebsiteAddonAmount(
        addon,
        quantity - currentQuantity,
        currency,
      )
      if (billingInterval !== addon.billingInterval) {
        effectiveDate = this.formatAddonDate(existingChargeDate)
      }
    } else if (quantity < currentQuantity) {
      changeType = quantity === 0 ? 'cancel' : 'decrease'
      effectiveDate = this.formatAddonDate(existingChargeDate)
    } else if (billingInterval !== addon.billingInterval) {
      changeType = 'interval_change'
      effectiveDate = this.formatAddonDate(existingChargeDate)
    } else if (
      addon.pendingQuantity !== null ||
      addon.pendingBillingInterval !== null
    ) {
      changeType = 'none'
    }

    const nextChargeDate =
      existingChargeDate ||
      (quantity > 0
        ? this.getWebsiteAddonPeriodEnd(new Date(), billingInterval)
        : null)
    const displayedExtraWebsites =
      changeType === 'decrease' || changeType === 'cancel'
        ? currentQuantity
        : quantity

    return {
      code: UserAddonCode.websites,
      quantity,
      currentQuantity,
      pendingQuantity: addon?.pendingQuantity ?? null,
      billingInterval,
      currentBillingInterval,
      pendingBillingInterval: addon?.pendingBillingInterval ?? null,
      currency,
      dueNow,
      recurringAmount: this.getWebsiteAddonAmount(
        quantity,
        billingInterval,
        currency,
      ),
      nextChargeDate: this.formatAddonDate(nextChargeDate),
      effectiveDate,
      includedWebsites,
      totalWebsites: includedWebsites + displayedExtraWebsites,
      activeExtraWebsites: currentQuantity,
      changeType,
      isLegacy,
      status: addon?.status || null,
    }
  }

  async previewWebsiteAddon(
    userId: string,
    quantity: number,
    billingInterval: BillingFrequency,
  ): Promise<WebsiteAddonPreview> {
    this.validateWebsiteAddonSelection(quantity, billingInterval)

    const user = await this.findOne({ where: { id: userId } })
    if (!user) {
      throw new BadRequestException('User not found')
    }

    this.validateWebsiteAddonEligibility(user)

    const addon = await this.getWebsiteAddon(userId)
    return this.buildWebsiteAddonPreview(user, addon, quantity, billingInterval)
  }

  private buildSessionReplayAddonPreview(
    user: User,
    addon: UserAddon | null,
    quantity: number,
    billingInterval: BillingFrequency,
  ): SessionReplayAddonPreview {
    const legacyQuantity = addon
      ? 0
      : this.getSessionReplayAddonOverrideQuantity(user)
    const isLegacy = legacyQuantity > 0
    const currentQuantity =
      addon && addon.status !== UserAddonStatus.cancelled
        ? addon.quantity
        : legacyQuantity
    const currentBillingInterval =
      addon && addon.status !== UserAddonStatus.cancelled
        ? addon.billingInterval
        : null
    const currency = addon?.currency || this.getWebsiteAddonCurrency(user)
    const includedSessionReplays = this.getIncludedSessionReplayLimit(user)
    const existingChargeDate = addon?.nextChargeDate || addon?.periodEnd || null
    let changeType: WebsiteAddonChangeType = 'none'
    let dueNow = 0
    let effectiveDate: string | null = null

    if (isLegacy) {
      return {
        code: UserAddonCode.sessionReplays,
        quantity: currentQuantity,
        currentQuantity,
        pendingQuantity: null,
        billingInterval,
        currentBillingInterval: null,
        pendingBillingInterval: null,
        currency,
        dueNow: 0,
        recurringAmount: 0,
        nextChargeDate: null,
        effectiveDate: null,
        includedSessionReplays,
        totalSessionReplays:
          includedSessionReplays === 'custom'
            ? includedSessionReplays
            : includedSessionReplays + currentQuantity,
        activeExtraSessionReplays: currentQuantity,
        changeType,
        isLegacy,
        status: null,
      }
    }

    if (
      !addon ||
      addon.status === UserAddonStatus.cancelled ||
      (addon.status === UserAddonStatus.past_due && currentQuantity === 0)
    ) {
      if (quantity > 0) {
        changeType =
          addon?.status === UserAddonStatus.past_due ? 'reactivate' : 'new'
        dueNow = this.getSessionReplayAddonAmount(
          quantity,
          billingInterval,
          currency,
        )
      }
    } else if (quantity > currentQuantity) {
      changeType = 'increase'
      dueNow = this.getProratedSessionReplayAddonAmount(
        addon,
        quantity - currentQuantity,
        currency,
      )
      if (billingInterval !== addon.billingInterval) {
        effectiveDate = this.formatAddonDate(existingChargeDate)
      }
    } else if (quantity < currentQuantity) {
      changeType = quantity === 0 ? 'cancel' : 'decrease'
      effectiveDate = this.formatAddonDate(existingChargeDate)
    } else if (billingInterval !== addon.billingInterval) {
      changeType = 'interval_change'
      effectiveDate = this.formatAddonDate(existingChargeDate)
    } else if (
      addon.pendingQuantity !== null ||
      addon.pendingBillingInterval !== null
    ) {
      changeType = 'none'
    }

    const nextChargeDate =
      existingChargeDate ||
      (quantity > 0
        ? this.getWebsiteAddonPeriodEnd(new Date(), billingInterval)
        : null)
    const displayedExtraSessionReplays =
      changeType === 'decrease' || changeType === 'cancel'
        ? currentQuantity
        : quantity

    return {
      code: UserAddonCode.sessionReplays,
      quantity,
      currentQuantity,
      pendingQuantity: addon?.pendingQuantity ?? null,
      billingInterval,
      currentBillingInterval,
      pendingBillingInterval: addon?.pendingBillingInterval ?? null,
      currency,
      dueNow,
      recurringAmount: this.getSessionReplayAddonAmount(
        quantity,
        billingInterval,
        currency,
      ),
      nextChargeDate: this.formatAddonDate(nextChargeDate),
      effectiveDate,
      includedSessionReplays,
      totalSessionReplays:
        includedSessionReplays === 'custom'
          ? includedSessionReplays
          : includedSessionReplays + displayedExtraSessionReplays,
      activeExtraSessionReplays: currentQuantity,
      changeType,
      isLegacy,
      status: addon?.status || null,
    }
  }

  async previewSessionReplayAddon(
    userId: string,
    quantity: number,
    billingInterval: BillingFrequency,
  ): Promise<SessionReplayAddonPreview> {
    this.validateSessionReplayAddonSelection(quantity, billingInterval)

    const user = await this.findOne({ where: { id: userId } })
    if (!user) {
      throw new BadRequestException('User not found')
    }

    this.validateSessionReplayAddonEligibility(user)

    const addon = await this.getSessionReplayAddon(userId)
    return this.buildSessionReplayAddonPreview(
      user,
      addon,
      quantity,
      billingInterval,
    )
  }

  private async syncWebsiteAddonEntitlements(
    user: User,
    quantity: number,
    manager?: EntityManager,
  ): Promise<void> {
    const addonOverrides = { ...(user.addonOverrides || {}) }

    if (quantity > 0) {
      addonOverrides.websites = quantity
    } else {
      delete addonOverrides.websites
      delete addonOverrides.additionalWebsites
    }

    const update = {
      addonOverrides: Object.keys(addonOverrides).length
        ? addonOverrides
        : null,
    }

    if (manager) {
      await manager.getRepository(User).update(user.id, update)
      return
    }

    await this.update(user.id, update)
  }

  async refreshWebsiteAddonEntitlements(userId: string): Promise<void> {
    const user = await this.findOne({ where: { id: userId } })
    if (!user) {
      return
    }

    const addon = await this.getWebsiteAddon(userId)
    const addonQuantity =
      addon && addon.status !== UserAddonStatus.cancelled
        ? addon.quantity
        : this.getAddonOverrideQuantity(user)

    await this.syncWebsiteAddonEntitlements(user, addonQuantity)
  }

  private async syncSessionReplayAddonEntitlements(
    user: User,
    quantity: number,
    manager?: EntityManager,
  ): Promise<void> {
    const addonOverrides = { ...(user.addonOverrides || {}) }

    if (quantity > 0) {
      addonOverrides.sessionReplays = quantity
    } else {
      delete addonOverrides.sessionReplays
    }

    const update = {
      addonOverrides: Object.keys(addonOverrides).length
        ? addonOverrides
        : null,
    }

    if (manager) {
      await manager.getRepository(User).update(user.id, update)
      return
    }

    await this.update(user.id, update)
  }

  async refreshSessionReplayAddonEntitlements(userId: string): Promise<void> {
    const user = await this.findOne({ where: { id: userId } })
    if (!user) {
      return
    }

    const addon = await this.getSessionReplayAddon(userId)
    const addonQuantity =
      addon && addon.status !== UserAddonStatus.cancelled
        ? addon.quantity
        : this.getSessionReplayAddonOverrideQuantity(user)

    await this.syncSessionReplayAddonEntitlements(user, addonQuantity)
  }

  private getPaddleErrorMessage(data: any): string {
    if (typeof data?.error === 'string') {
      return data.error
    }

    if (typeof data?.response?.message === 'string') {
      return data.response.message
    }

    if (typeof data?.response?.error === 'string') {
      return data.response.error
    }

    return 'Paddle charge failed'
  }

  private async createPaddleOneOffCharge(
    subscriptionId: string,
    amount: number,
    chargeName: string,
  ): Promise<Record<string, any>> {
    if (!PADDLE_VENDOR_ID || !PADDLE_API_KEY) {
      throw new ServiceUnavailableException('Paddle is not configured')
    }

    const url = `https://vendors.paddle.com/api/2.0/subscription/${subscriptionId}/charge`
    const body = new URLSearchParams()
    body.set('vendor_id', String(Number(PADDLE_VENDOR_ID)))
    body.set('vendor_auth_code', PADDLE_API_KEY)
    body.set('amount', amount.toFixed(2))
    body.set('charge_name', chargeName)

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = await res.json()

    if (!res.ok || !data?.success) {
      throw new BadRequestException(this.getPaddleErrorMessage(data))
    }

    return data.response || {}
  }

  private buildWebsiteAddonChargeKey(
    addon: UserAddon,
    user: User,
    kind: UserAddonChargeKind,
    amount: number,
    quantity: number,
    previousQuantity: number | null,
    billingInterval: BillingFrequency,
    periodStart: Date | null,
    periodEnd: Date | null,
  ): string {
    return [
      'website-addon',
      user.id,
      addon.id,
      kind,
      quantity,
      previousQuantity ?? 'none',
      billingInterval,
      amount.toFixed(2),
      addon.currency,
      periodStart ? dayjs.utc(periodStart).toISOString() : 'none',
      periodEnd ? dayjs.utc(periodEnd).toISOString() : 'none',
    ].join(':')
  }

  private async chargeWebsiteAddon(
    addon: UserAddon,
    user: User,
    kind: UserAddonChargeKind,
    amount: number,
    quantity: number,
    previousQuantity: number | null,
    billingInterval: BillingFrequency,
    periodStart: Date | null,
    periodEnd: Date | null,
    manager?: EntityManager,
  ): Promise<UserAddonCharge> {
    const chargeRepository = this.getAddonChargeRepository(manager)
    const chargeName = `${quantity.toLocaleString()} additional websites for Swetrix (${billingInterval})`
    const idempotencyKey = this.buildWebsiteAddonChargeKey(
      addon,
      user,
      kind,
      amount,
      quantity,
      previousQuantity,
      billingInterval,
      periodStart,
      periodEnd,
    )

    if (addon.lastChargeId) {
      const lastCharge = await chargeRepository.findOne({
        where: { id: addon.lastChargeId },
      })

      if (
        lastCharge?.idempotencyKey === idempotencyKey &&
        lastCharge.status === UserAddonChargeStatus.succeeded
      ) {
        return lastCharge
      }
    }

    let charge = await chargeRepository.findOne({
      where: { idempotencyKey },
    })

    if (charge?.status === UserAddonChargeStatus.succeeded) {
      return charge
    }

    if (charge?.status === UserAddonChargeStatus.pending) {
      throw new BadRequestException('websiteAddonChargeInProgress')
    }

    if (charge) {
      await chargeRepository.update(charge.id, {
        status: UserAddonChargeStatus.pending,
        failureReason: null,
      })
    } else {
      try {
        charge = await chargeRepository.save(
          chargeRepository.create({
            addonId: addon.id,
            userId: user.id,
            kind,
            status: UserAddonChargeStatus.pending,
            quantity,
            previousQuantity,
            billingInterval,
            amount: amount.toFixed(2),
            currency: addon.currency,
            periodStart,
            periodEnd,
            idempotencyKey,
          }),
        )
      } catch (reason) {
        if (!this.isDuplicateEntryError(reason)) {
          throw reason
        }

        charge = await chargeRepository.findOne({
          where: { idempotencyKey },
        })

        if (charge?.status === UserAddonChargeStatus.succeeded) {
          return charge
        }

        throw new BadRequestException('websiteAddonChargeInProgress')
      }
    }

    if (!charge) {
      throw new InternalServerErrorException('Unable to create add-on charge')
    }

    try {
      const response = await this.createPaddleOneOffCharge(
        user.subID,
        amount,
        chargeName,
      )

      const update = {
        status: UserAddonChargeStatus.succeeded,
        paddleInvoiceId:
          typeof response.invoice_id === 'number' ? response.invoice_id : null,
        paddleOrderId: response.order_id ? String(response.order_id) : null,
        paddleStatus: response.status ? String(response.status) : null,
        paddleReceiptUrl: response.receipt_url
          ? String(response.receipt_url)
          : null,
        paddleResponse: response,
        failureReason: null,
      }

      await chargeRepository.update(charge.id, update)

      return {
        ...charge,
        ...update,
      } as UserAddonCharge
    } catch (reason) {
      await chargeRepository.update(charge.id, {
        status: UserAddonChargeStatus.failed,
        failureReason:
          reason instanceof Error ? reason.message : 'Paddle charge failed',
      })

      throw reason
    }
  }

  private buildSessionReplayAddonChargeKey(
    addon: UserAddon,
    user: User,
    kind: UserAddonChargeKind,
    amount: number,
    quantity: number,
    previousQuantity: number | null,
    billingInterval: BillingFrequency,
    periodStart: Date | null,
    periodEnd: Date | null,
  ): string {
    return [
      'session-replay-addon',
      user.id,
      addon.id,
      kind,
      quantity,
      previousQuantity ?? 'none',
      billingInterval,
      amount.toFixed(2),
      addon.currency,
      periodStart ? dayjs.utc(periodStart).toISOString() : 'none',
      periodEnd ? dayjs.utc(periodEnd).toISOString() : 'none',
    ].join(':')
  }

  private async chargeSessionReplayAddon(
    addon: UserAddon,
    user: User,
    kind: UserAddonChargeKind,
    amount: number,
    quantity: number,
    previousQuantity: number | null,
    billingInterval: BillingFrequency,
    periodStart: Date | null,
    periodEnd: Date | null,
    manager?: EntityManager,
  ): Promise<UserAddonCharge> {
    const chargeRepository = this.getAddonChargeRepository(manager)
    const chargeName = `${quantity.toLocaleString()} additional session replays for Swetrix (${billingInterval})`
    const idempotencyKey = this.buildSessionReplayAddonChargeKey(
      addon,
      user,
      kind,
      amount,
      quantity,
      previousQuantity,
      billingInterval,
      periodStart,
      periodEnd,
    )

    if (addon.lastChargeId) {
      const lastCharge = await chargeRepository.findOne({
        where: { id: addon.lastChargeId },
      })

      if (
        lastCharge?.idempotencyKey === idempotencyKey &&
        lastCharge.status === UserAddonChargeStatus.succeeded
      ) {
        return lastCharge
      }
    }

    let charge = await chargeRepository.findOne({
      where: { idempotencyKey },
    })

    if (charge?.status === UserAddonChargeStatus.succeeded) {
      return charge
    }

    if (charge?.status === UserAddonChargeStatus.pending) {
      throw new BadRequestException('sessionReplayAddonChargeInProgress')
    }

    if (charge) {
      await chargeRepository.update(charge.id, {
        status: UserAddonChargeStatus.pending,
        failureReason: null,
      })
    } else {
      try {
        charge = await chargeRepository.save(
          chargeRepository.create({
            addonId: addon.id,
            userId: user.id,
            kind,
            status: UserAddonChargeStatus.pending,
            quantity,
            previousQuantity,
            billingInterval,
            amount: amount.toFixed(2),
            currency: addon.currency,
            periodStart,
            periodEnd,
            idempotencyKey,
          }),
        )
      } catch (reason) {
        if (!this.isDuplicateEntryError(reason)) {
          throw reason
        }

        charge = await chargeRepository.findOne({
          where: { idempotencyKey },
        })

        if (charge?.status === UserAddonChargeStatus.succeeded) {
          return charge
        }

        throw new BadRequestException('sessionReplayAddonChargeInProgress')
      }
    }

    if (!charge) {
      throw new InternalServerErrorException('Unable to create add-on charge')
    }

    try {
      const response = await this.createPaddleOneOffCharge(
        user.subID,
        amount,
        chargeName,
      )

      const update = {
        status: UserAddonChargeStatus.succeeded,
        paddleInvoiceId:
          typeof response.invoice_id === 'number' ? response.invoice_id : null,
        paddleOrderId: response.order_id ? String(response.order_id) : null,
        paddleStatus: response.status ? String(response.status) : null,
        paddleReceiptUrl: response.receipt_url
          ? String(response.receipt_url)
          : null,
        paddleResponse: response,
        failureReason: null,
      }

      await chargeRepository.update(charge.id, update)

      return {
        ...charge,
        ...update,
      } as UserAddonCharge
    } catch (reason) {
      await chargeRepository.update(charge.id, {
        status: UserAddonChargeStatus.failed,
        failureReason:
          reason instanceof Error ? reason.message : 'Paddle charge failed',
      })

      throw reason
    }
  }

  async getWebsiteAddonSummary(
    userId: string,
    user?: User,
  ): Promise<WebsiteAddonSummary | null> {
    const [addon, resolvedUser] = await Promise.all([
      this.getWebsiteAddon(userId),
      user ? Promise.resolve(user) : this.findOne({ where: { id: userId } }),
    ])

    if (addon) {
      return {
        code: UserAddonCode.websites,
        quantity: addon.quantity,
        pendingQuantity: addon.pendingQuantity,
        billingInterval: addon.billingInterval,
        pendingBillingInterval: addon.pendingBillingInterval,
        currency: addon.currency,
        status: addon.status,
        periodEnd: this.formatAddonDate(addon.periodEnd),
        nextChargeDate: this.formatAddonDate(addon.nextChargeDate),
        recurringAmount: this.getMoneyValue(addon.recurringAmount),
        isLegacy: false,
        failedChargeAttempts: addon.failedChargeAttempts,
      }
    }

    const legacyQuantity = resolvedUser
      ? this.getAddonOverrideQuantity(resolvedUser)
      : 0

    if (!legacyQuantity) {
      return null
    }

    return {
      code: UserAddonCode.websites,
      quantity: legacyQuantity,
      pendingQuantity: null,
      billingInterval: null,
      pendingBillingInterval: null,
      currency: resolvedUser?.tierCurrency || null,
      status: 'legacy',
      periodEnd: null,
      nextChargeDate: null,
      recurringAmount: null,
      isLegacy: true,
      failedChargeAttempts: 0,
    }
  }

  async getUserWithWebsiteAddonSummary(userId: string): Promise<Partial<User>> {
    const user = await this.findOne({ where: { id: userId } })
    const sanitizedUser = this.omitSensitiveData(user)

    return {
      ...sanitizedUser,
      websiteAddon: await this.getWebsiteAddonSummary(userId, user),
    } as Partial<User>
  }

  async getSessionReplayAddonSummary(
    userId: string,
    user?: User,
  ): Promise<SessionReplayAddonSummary | null> {
    const [addon, resolvedUser] = await Promise.all([
      this.getSessionReplayAddon(userId),
      user ? Promise.resolve(user) : this.findOne({ where: { id: userId } }),
    ])

    if (addon) {
      return {
        code: UserAddonCode.sessionReplays,
        quantity: addon.quantity,
        pendingQuantity: addon.pendingQuantity,
        billingInterval: addon.billingInterval,
        pendingBillingInterval: addon.pendingBillingInterval,
        currency: addon.currency,
        status: addon.status,
        periodEnd: this.formatAddonDate(addon.periodEnd),
        nextChargeDate: this.formatAddonDate(addon.nextChargeDate),
        recurringAmount: this.getMoneyValue(addon.recurringAmount),
        isLegacy: false,
        failedChargeAttempts: addon.failedChargeAttempts,
      }
    }

    const legacyQuantity = resolvedUser
      ? this.getSessionReplayAddonOverrideQuantity(resolvedUser)
      : 0

    if (!legacyQuantity) {
      return null
    }

    return {
      code: UserAddonCode.sessionReplays,
      quantity: legacyQuantity,
      pendingQuantity: null,
      billingInterval: null,
      pendingBillingInterval: null,
      currency: resolvedUser?.tierCurrency || null,
      status: 'legacy',
      periodEnd: null,
      nextChargeDate: null,
      recurringAmount: null,
      isLegacy: true,
      failedChargeAttempts: 0,
    }
  }

  async getUserWithAddonSummaries(userId: string): Promise<Partial<User>> {
    const user = await this.findOne({ where: { id: userId } })
    const sanitizedUser = this.omitSensitiveData(user)

    return {
      ...sanitizedUser,
      websiteAddon: await this.getWebsiteAddonSummary(userId, user),
      sessionReplayAddon: await this.getSessionReplayAddonSummary(userId, user),
    } as Partial<User>
  }

  async updateWebsiteAddon(
    userId: string,
    quantity: number,
    billingInterval: BillingFrequency,
  ): Promise<Partial<User>> {
    this.validateWebsiteAddonSelection(quantity, billingInterval)

    await this.usersRepository.manager.transaction(async (manager) => {
      const user = await this.getLockedUser(manager, userId)
      if (!user) {
        throw new BadRequestException('User not found')
      }

      this.validateWebsiteAddonEligibility(user)

      const addonRepository = manager.getRepository(UserAddon)
      let addon = await this.getLockedWebsiteAddon(manager, userId)
      if (!addon && this.getAddonOverrideQuantity(user) > 0) {
        throw new BadRequestException('legacyWebsiteAddon')
      }

      const preview = this.buildWebsiteAddonPreview(
        user,
        addon,
        quantity,
        billingInterval,
      )

      if (preview.changeType === 'none') {
        if (
          addon &&
          (addon.pendingQuantity !== null ||
            addon.pendingBillingInterval !== null)
        ) {
          await addonRepository.update(addon.id, {
            pendingQuantity: null,
            pendingBillingInterval: null,
          })
        }

        return
      }

      const now = new Date()

      if (!addon) {
        addon = await addonRepository.save(
          addonRepository.create({
            userId,
            code: UserAddonCode.websites,
            quantity: 0,
            billingInterval,
            currency: this.getWebsiteAddonCurrency(user),
            status: UserAddonStatus.cancelled,
            failedChargeAttempts: 0,
          }),
        )
      }

      const isInactiveAddon =
        addon.status === UserAddonStatus.cancelled ||
        (addon.status === UserAddonStatus.past_due && addon.quantity === 0)
      const currentQuantity = isInactiveAddon ? 0 : addon.quantity
      let charge: UserAddonCharge | null = null

      if (preview.dueNow > 0) {
        const chargePeriodStart = isInactiveAddon
          ? now
          : addon.periodStart || now
        const chargePeriodEnd = isInactiveAddon
          ? this.getWebsiteAddonPeriodEnd(now, billingInterval)
          : addon.periodEnd ||
            this.getWebsiteAddonPeriodEnd(now, addon.billingInterval)

        charge = await this.chargeWebsiteAddon(
          addon,
          user,
          isInactiveAddon
            ? UserAddonChargeKind.initial
            : UserAddonChargeKind.prorated,
          preview.dueNow,
          quantity,
          currentQuantity,
          isInactiveAddon ? billingInterval : addon.billingInterval,
          chargePeriodStart,
          chargePeriodEnd,
          manager,
        )
      }

      if (isInactiveAddon) {
        const periodEnd = this.getWebsiteAddonPeriodEnd(now, billingInterval)
        const recurringAmount = this.getWebsiteAddonAmount(
          quantity,
          billingInterval,
          preview.currency,
        )

        await addonRepository.update(addon.id, {
          quantity,
          pendingQuantity: null,
          billingInterval,
          pendingBillingInterval: null,
          currency: preview.currency,
          recurringAmount: recurringAmount.toFixed(2),
          periodStart: now,
          periodEnd,
          nextChargeDate: periodEnd,
          status: UserAddonStatus.active,
          failedChargeAttempts: 0,
          lastChargeFailedAt: null,
          cancelledAt: null,
          lastChargeId: charge?.id || addon.lastChargeId,
          lastChargeAt: charge ? now : addon.lastChargeAt,
        })
        await this.syncWebsiteAddonEntitlements(user, quantity, manager)
      } else if (quantity > currentQuantity) {
        const activeBillingInterval = addon.billingInterval
        const recurringAmount = this.getWebsiteAddonAmount(
          quantity,
          activeBillingInterval,
          preview.currency,
        )

        await addonRepository.update(addon.id, {
          quantity,
          pendingQuantity: null,
          pendingBillingInterval:
            billingInterval !== addon.billingInterval ? billingInterval : null,
          recurringAmount: recurringAmount.toFixed(2),
          status: UserAddonStatus.active,
          failedChargeAttempts: 0,
          lastChargeFailedAt: null,
          lastChargeId: charge?.id || addon.lastChargeId,
          lastChargeAt: charge ? now : addon.lastChargeAt,
        })
        await this.syncWebsiteAddonEntitlements(user, quantity, manager)
      } else {
        await addonRepository.update(addon.id, {
          pendingQuantity: quantity !== currentQuantity ? quantity : null,
          pendingBillingInterval:
            billingInterval !== addon.billingInterval ? billingInterval : null,
          status: UserAddonStatus.active,
        })
      }
    })

    return this.getUserWithAddonSummaries(userId)
  }

  async updateSessionReplayAddon(
    userId: string,
    quantity: number,
    billingInterval: BillingFrequency,
  ): Promise<Partial<User>> {
    this.validateSessionReplayAddonSelection(quantity, billingInterval)

    await this.usersRepository.manager.transaction(async (manager) => {
      const user = await this.getLockedUser(manager, userId)
      if (!user) {
        throw new BadRequestException('User not found')
      }

      this.validateSessionReplayAddonEligibility(user)

      const addonRepository = manager.getRepository(UserAddon)
      let addon = await this.getLockedAddon(
        manager,
        userId,
        UserAddonCode.sessionReplays,
      )
      if (!addon && this.getSessionReplayAddonOverrideQuantity(user) > 0) {
        throw new BadRequestException('legacySessionReplayAddon')
      }

      const preview = this.buildSessionReplayAddonPreview(
        user,
        addon,
        quantity,
        billingInterval,
      )

      if (preview.changeType === 'none') {
        if (
          addon &&
          (addon.pendingQuantity !== null ||
            addon.pendingBillingInterval !== null)
        ) {
          await addonRepository.update(addon.id, {
            pendingQuantity: null,
            pendingBillingInterval: null,
          })
        }

        return
      }

      const now = new Date()

      if (!addon) {
        addon = await addonRepository.save(
          addonRepository.create({
            userId,
            code: UserAddonCode.sessionReplays,
            quantity: 0,
            billingInterval,
            currency: this.getWebsiteAddonCurrency(user),
            status: UserAddonStatus.cancelled,
            failedChargeAttempts: 0,
          }),
        )
      }

      const isInactiveAddon =
        addon.status === UserAddonStatus.cancelled ||
        (addon.status === UserAddonStatus.past_due && addon.quantity === 0)
      const currentQuantity = isInactiveAddon ? 0 : addon.quantity
      let charge: UserAddonCharge | null = null

      if (preview.dueNow > 0) {
        const chargePeriodStart = isInactiveAddon
          ? now
          : addon.periodStart || now
        const chargePeriodEnd = isInactiveAddon
          ? this.getWebsiteAddonPeriodEnd(now, billingInterval)
          : addon.periodEnd ||
            this.getWebsiteAddonPeriodEnd(now, addon.billingInterval)

        charge = await this.chargeSessionReplayAddon(
          addon,
          user,
          isInactiveAddon
            ? UserAddonChargeKind.initial
            : UserAddonChargeKind.prorated,
          preview.dueNow,
          quantity,
          currentQuantity,
          isInactiveAddon ? billingInterval : addon.billingInterval,
          chargePeriodStart,
          chargePeriodEnd,
          manager,
        )
      }

      if (isInactiveAddon) {
        const periodEnd = this.getWebsiteAddonPeriodEnd(now, billingInterval)
        const recurringAmount = this.getSessionReplayAddonAmount(
          quantity,
          billingInterval,
          preview.currency,
        )

        await addonRepository.update(addon.id, {
          quantity,
          pendingQuantity: null,
          billingInterval,
          pendingBillingInterval: null,
          currency: preview.currency,
          recurringAmount: recurringAmount.toFixed(2),
          periodStart: now,
          periodEnd,
          nextChargeDate: periodEnd,
          status: UserAddonStatus.active,
          failedChargeAttempts: 0,
          lastChargeFailedAt: null,
          cancelledAt: null,
          lastChargeId: charge?.id || addon.lastChargeId,
          lastChargeAt: charge ? now : addon.lastChargeAt,
        })
        await this.syncSessionReplayAddonEntitlements(user, quantity, manager)
      } else if (quantity > currentQuantity) {
        const activeBillingInterval = addon.billingInterval
        const recurringAmount = this.getSessionReplayAddonAmount(
          quantity,
          activeBillingInterval,
          preview.currency,
        )

        await addonRepository.update(addon.id, {
          quantity,
          pendingQuantity: null,
          pendingBillingInterval:
            billingInterval !== addon.billingInterval ? billingInterval : null,
          recurringAmount: recurringAmount.toFixed(2),
          status: UserAddonStatus.active,
          failedChargeAttempts: 0,
          lastChargeFailedAt: null,
          lastChargeId: charge?.id || addon.lastChargeId,
          lastChargeAt: charge ? now : addon.lastChargeAt,
        })
        await this.syncSessionReplayAddonEntitlements(user, quantity, manager)
      } else {
        await addonRepository.update(addon.id, {
          pendingQuantity: quantity !== currentQuantity ? quantity : null,
          pendingBillingInterval:
            billingInterval !== addon.billingInterval ? billingInterval : null,
          status: UserAddonStatus.active,
        })
      }
    })

    return this.getUserWithAddonSummaries(userId)
  }

  private async cancelWebsiteAddonNow(addon: UserAddon): Promise<void> {
    await this.userAddonRepository.update(addon.id, {
      quantity: 0,
      pendingQuantity: null,
      pendingBillingInterval: null,
      recurringAmount: null,
      nextChargeDate: null,
      status: UserAddonStatus.cancelled,
      failedChargeAttempts: 0,
      lastChargeFailedAt: null,
      cancelledAt: new Date(),
    })

    const user =
      addon.user || (await this.findOne({ where: { id: addon.userId } }))
    if (user) {
      await this.syncWebsiteAddonEntitlements(user, 0)
    }
  }

  async scheduleWebsiteAddonCancellation(
    userId: string,
    effectiveDate?: string | Date | null,
  ): Promise<void> {
    const addon = await this.getWebsiteAddon(userId)
    if (!addon || addon.status === UserAddonStatus.cancelled) {
      return
    }

    const effective = effectiveDate ? dayjs.utc(effectiveDate) : null
    if (effective && effective.isBefore(dayjs.utc())) {
      await this.cancelWebsiteAddonNow(addon)
      return
    }

    await this.userAddonRepository.update(addon.id, {
      pendingQuantity: 0,
      nextChargeDate:
        effective &&
        (!addon.nextChargeDate || effective.isBefore(addon.nextChargeDate))
          ? effective.toDate()
          : addon.nextChargeDate,
    })
  }

  async clearWebsiteAddonsForCancelledSubscription(
    userId: string,
  ): Promise<void> {
    const addons = await this.userAddonRepository.find({
      where: { userId, code: UserAddonCode.websites },
      relations: ['user'],
    })

    await Promise.all(addons.map((addon) => this.cancelWebsiteAddonNow(addon)))

    const user = await this.findOne({ where: { id: userId } })
    if (user) {
      await this.syncWebsiteAddonEntitlements(user, 0)
    }
  }

  private async cancelSessionReplayAddonNow(addon: UserAddon): Promise<void> {
    await this.userAddonRepository.update(addon.id, {
      quantity: 0,
      pendingQuantity: null,
      pendingBillingInterval: null,
      recurringAmount: null,
      nextChargeDate: null,
      status: UserAddonStatus.cancelled,
      failedChargeAttempts: 0,
      lastChargeFailedAt: null,
      cancelledAt: new Date(),
    })

    const user =
      addon.user || (await this.findOne({ where: { id: addon.userId } }))
    if (user) {
      await this.syncSessionReplayAddonEntitlements(user, 0)
    }
  }

  async scheduleSessionReplayAddonCancellation(
    userId: string,
    effectiveDate?: string | Date | null,
  ): Promise<void> {
    const addon = await this.getSessionReplayAddon(userId)
    if (!addon || addon.status === UserAddonStatus.cancelled) {
      return
    }

    const effective = effectiveDate ? dayjs.utc(effectiveDate) : null
    if (effective && effective.isBefore(dayjs.utc())) {
      await this.cancelSessionReplayAddonNow(addon)
      return
    }

    await this.userAddonRepository.update(addon.id, {
      pendingQuantity: 0,
      nextChargeDate:
        effective &&
        (!addon.nextChargeDate || effective.isBefore(addon.nextChargeDate))
          ? effective.toDate()
          : addon.nextChargeDate,
    })
  }

  async clearSessionReplayAddonsForCancelledSubscription(
    userId: string,
  ): Promise<void> {
    const addons = await this.userAddonRepository.find({
      where: { userId, code: UserAddonCode.sessionReplays },
      relations: ['user'],
    })

    await Promise.all(
      addons.map((addon) => this.cancelSessionReplayAddonNow(addon)),
    )

    const user = await this.findOne({ where: { id: userId } })
    if (user) {
      await this.syncSessionReplayAddonEntitlements(user, 0)
    }
  }

  private async handleWebsiteAddonRenewalFailure(
    addon: UserAddon,
    reason: Error,
  ): Promise<void> {
    const failedChargeAttempts = addon.failedChargeAttempts + 1
    const shouldRemoveCapacity =
      failedChargeAttempts >= WEBSITE_ADDON_MAX_FAILED_CHARGES

    await this.userAddonRepository.update(addon.id, {
      status: UserAddonStatus.past_due,
      failedChargeAttempts,
      lastChargeFailedAt: new Date(),
      nextChargeDate: shouldRemoveCapacity
        ? null
        : dayjs.utc().add(WEBSITE_ADDON_RETRY_DELAY_HOURS, 'hour').toDate(),
      quantity: shouldRemoveCapacity ? 0 : addon.quantity,
      recurringAmount: shouldRemoveCapacity ? null : addon.recurringAmount,
      pendingQuantity: shouldRemoveCapacity ? null : addon.pendingQuantity,
      pendingBillingInterval: shouldRemoveCapacity
        ? null
        : addon.pendingBillingInterval,
    })

    if (shouldRemoveCapacity) {
      const user =
        addon.user || (await this.findOne({ where: { id: addon.userId } }))
      if (user) {
        await this.syncWebsiteAddonEntitlements(user, 0)
      }
    }

    console.error('[ERROR] (processWebsiteAddonRenewal):', reason)
  }

  private async processWebsiteAddonRenewal(addon: UserAddon): Promise<void> {
    const claimStartedAt = new Date()
    const dueDate = addon.nextChargeDate

    if (!dueDate || dayjs.utc(dueDate).isAfter(dayjs.utc(claimStartedAt))) {
      return
    }

    const claimUntil = dayjs
      .utc(claimStartedAt)
      .add(WEBSITE_ADDON_RENEWAL_CLAIM_MINUTES, 'minute')
      .toDate()
    const claimResult = await this.userAddonRepository.update(
      {
        id: addon.id,
        code: UserAddonCode.websites,
        status: addon.status,
        nextChargeDate: LessThan(claimStartedAt),
      },
      {
        nextChargeDate: claimUntil,
      },
    )

    if (!claimResult.affected) {
      return
    }

    const user = addon.user

    if (!user || !user.subID || user.cancellationEffectiveDate) {
      await this.cancelWebsiteAddonNow(addon)
      return
    }

    const targetQuantity = addon.pendingQuantity ?? addon.quantity
    const targetBillingInterval =
      addon.pendingBillingInterval || addon.billingInterval

    if (targetQuantity <= 0) {
      await this.cancelWebsiteAddonNow(addon)
      return
    }

    const periodStart = dueDate
    const periodEnd = this.getWebsiteAddonPeriodEnd(
      periodStart,
      targetBillingInterval,
    )
    const amount = this.getWebsiteAddonAmount(
      targetQuantity,
      targetBillingInterval,
      addon.currency,
    )

    try {
      const charge = await this.chargeWebsiteAddon(
        addon,
        user,
        UserAddonChargeKind.renewal,
        amount,
        targetQuantity,
        addon.quantity,
        targetBillingInterval,
        periodStart,
        periodEnd,
      )
      const recurringAmount = this.getWebsiteAddonAmount(
        targetQuantity,
        targetBillingInterval,
        addon.currency,
      )

      await this.userAddonRepository.update(addon.id, {
        quantity: targetQuantity,
        pendingQuantity: null,
        billingInterval: targetBillingInterval,
        pendingBillingInterval: null,
        recurringAmount: recurringAmount.toFixed(2),
        periodStart,
        periodEnd,
        nextChargeDate: periodEnd,
        status: UserAddonStatus.active,
        failedChargeAttempts: 0,
        lastChargeFailedAt: null,
        lastChargeId: charge.id,
        lastChargeAt: new Date(),
      })
      await this.syncWebsiteAddonEntitlements(user, targetQuantity)
    } catch (reason) {
      await this.handleWebsiteAddonRenewalFailure(
        addon,
        reason instanceof Error ? reason : new Error(String(reason)),
      )
    }
  }

  private async handleSessionReplayAddonRenewalFailure(
    addon: UserAddon,
    reason: Error,
  ): Promise<void> {
    const failedChargeAttempts = addon.failedChargeAttempts + 1
    const shouldRemoveCapacity =
      failedChargeAttempts >= WEBSITE_ADDON_MAX_FAILED_CHARGES

    await this.userAddonRepository.update(addon.id, {
      status: UserAddonStatus.past_due,
      failedChargeAttempts,
      lastChargeFailedAt: new Date(),
      nextChargeDate: shouldRemoveCapacity
        ? null
        : dayjs.utc().add(WEBSITE_ADDON_RETRY_DELAY_HOURS, 'hour').toDate(),
      quantity: shouldRemoveCapacity ? 0 : addon.quantity,
      recurringAmount: shouldRemoveCapacity ? null : addon.recurringAmount,
      pendingQuantity: shouldRemoveCapacity ? null : addon.pendingQuantity,
      pendingBillingInterval: shouldRemoveCapacity
        ? null
        : addon.pendingBillingInterval,
    })

    if (shouldRemoveCapacity) {
      const user =
        addon.user || (await this.findOne({ where: { id: addon.userId } }))
      if (user) {
        await this.syncSessionReplayAddonEntitlements(user, 0)
      }
    }

    console.error('[ERROR] (processSessionReplayAddonRenewal):', reason)
  }

  private async processSessionReplayAddonRenewal(
    addon: UserAddon,
  ): Promise<void> {
    const claimStartedAt = new Date()
    const dueDate = addon.nextChargeDate

    if (!dueDate || dayjs.utc(dueDate).isAfter(dayjs.utc(claimStartedAt))) {
      return
    }

    const claimUntil = dayjs
      .utc(claimStartedAt)
      .add(WEBSITE_ADDON_RENEWAL_CLAIM_MINUTES, 'minute')
      .toDate()
    const claimResult = await this.userAddonRepository.update(
      {
        id: addon.id,
        code: UserAddonCode.sessionReplays,
        status: addon.status,
        nextChargeDate: LessThan(claimStartedAt),
      },
      {
        nextChargeDate: claimUntil,
      },
    )

    if (!claimResult.affected) {
      return
    }

    const user = addon.user

    if (!user || !user.subID || user.cancellationEffectiveDate) {
      await this.cancelSessionReplayAddonNow(addon)
      return
    }

    const targetQuantity = addon.pendingQuantity ?? addon.quantity
    const targetBillingInterval =
      addon.pendingBillingInterval || addon.billingInterval

    if (targetQuantity <= 0) {
      await this.cancelSessionReplayAddonNow(addon)
      return
    }

    const periodStart = dueDate
    const periodEnd = this.getWebsiteAddonPeriodEnd(
      periodStart,
      targetBillingInterval,
    )
    const amount = this.getSessionReplayAddonAmount(
      targetQuantity,
      targetBillingInterval,
      addon.currency,
    )

    try {
      const charge = await this.chargeSessionReplayAddon(
        addon,
        user,
        UserAddonChargeKind.renewal,
        amount,
        targetQuantity,
        addon.quantity,
        targetBillingInterval,
        periodStart,
        periodEnd,
      )
      const recurringAmount = this.getSessionReplayAddonAmount(
        targetQuantity,
        targetBillingInterval,
        addon.currency,
      )

      await this.userAddonRepository.update(addon.id, {
        quantity: targetQuantity,
        pendingQuantity: null,
        billingInterval: targetBillingInterval,
        pendingBillingInterval: null,
        recurringAmount: recurringAmount.toFixed(2),
        periodStart,
        periodEnd,
        nextChargeDate: periodEnd,
        status: UserAddonStatus.active,
        failedChargeAttempts: 0,
        lastChargeFailedAt: null,
        lastChargeId: charge.id,
        lastChargeAt: new Date(),
      })
      await this.syncSessionReplayAddonEntitlements(user, targetQuantity)
    } catch (reason) {
      await this.handleSessionReplayAddonRenewalFailure(
        addon,
        reason instanceof Error ? reason : new Error(String(reason)),
      )
    }
  }

  async processDueWebsiteAddonRenewals(): Promise<void> {
    const dueAddons = await this.userAddonRepository.find({
      where: [
        {
          code: UserAddonCode.websites,
          status: UserAddonStatus.active,
          nextChargeDate: LessThan(new Date()),
        },
        {
          code: UserAddonCode.websites,
          status: UserAddonStatus.past_due,
          nextChargeDate: LessThan(new Date()),
        },
      ],
      relations: ['user'],
    })

    await Promise.allSettled(
      dueAddons.map((addon) => this.processWebsiteAddonRenewal(addon)),
    )
  }

  async processDueSessionReplayAddonRenewals(): Promise<void> {
    const dueAddons = await this.userAddonRepository.find({
      where: [
        {
          code: UserAddonCode.sessionReplays,
          status: UserAddonStatus.active,
          nextChargeDate: LessThan(new Date()),
        },
        {
          code: UserAddonCode.sessionReplays,
          status: UserAddonStatus.past_due,
          nextChargeDate: LessThan(new Date()),
        },
      ],
      relations: ['user'],
    })

    await Promise.allSettled(
      dueAddons.map((addon) => this.processSessionReplayAddonRenewal(addon)),
    )
  }

  omitSensitiveData(user: Partial<User>): Partial<User> {
    const maxEventsCount = ACCOUNT_PLANS[user?.planCode]?.monthlyUsageLimit || 0
    const limits = getEffectiveAccountLimits(user)

    const enhancedUser = {
      ...user,
      effectivePlanType: limits.effectivePlanType,
      maxEventsCount,
      includedWebsites: limits.includedWebsites,
      purchasedWebsiteAddons: limits.purchasedWebsiteAddons,
      maxProjects: limits.effectiveProjectLimit,
      effectiveProjectLimit: limits.effectiveProjectLimit,
      maxApiKeyRequestsPerHour: limits.apiRateLimitPerHour,
      apiRateLimitPerHour: limits.apiRateLimitPerHour,
      includedSessionReplays: limits.includedSessionReplays,
      sessionReplaysIncluded: limits.sessionReplaysIncluded,
      purchasedSessionReplayAddons: limits.purchasedSessionReplayAddons,
      sessionReplayRetentionDays: limits.sessionReplayRetentionDays,
      teamMembers: limits.teamMembers,
      organisations: limits.organisations,
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

  private async uploadFeedbackAttachments(files: Express.Multer.File[]) {
    if (_isEmpty(files)) {
      return []
    }

    const token = process.env.SWETRIX_CDN_TOKEN
    if (!token) {
      throw new ServiceUnavailableException('CDN uploads are not configured')
    }

    const baseUrl = (process.env.SWETRIX_CDN_URL || DEFAULT_CDN_URL).replace(
      /\/$/,
      '',
    )
    const formData = new FormData()
    formData.append('token', token)

    for (const file of files) {
      formData.append(
        'files',
        new Blob([file.buffer as unknown as BlobPart], {
          type: file.mimetype,
        }),
        file.originalname,
      )
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
    }, FEEDBACK_ATTACHMENT_UPLOAD_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(`${baseUrl}/file/multiple`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ServiceUnavailableException('Attachment upload timed out')
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      throw new ServiceUnavailableException('Failed to upload attachments')
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new ServiceUnavailableException('Invalid response from CDN')
    }

    return getCdnFiles(payload)
      .map((file) => normaliseCdnUrl(baseUrl, file))
      .filter((url): url is string => Boolean(url))
  }

  public async saveUserFeedback(
    userId: string,
    message: string,
    files: Express.Multer.File[] = [],
  ) {
    const attachmentUrls = await this.uploadFeedbackAttachments(files)

    return this.userFeedbackRepository.save({
      userId,
      message,
      attachmentUrls,
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

  private normalizePlanType(planType?: string | null): PlanType {
    if (planType && Object.values(PlanType).includes(planType as PlanType)) {
      return planType as PlanType
    }

    return PlanType.standard
  }

  getPlanById(planId: number, requestedPlanType?: string | null) {
    if (!planId) {
      return null
    }

    const stringifiedPlanId = String(planId)

    const plan = Object.values(ACCOUNT_PLANS).find(
      (tier) =>
        // @ts-ignore
        tier.pid === stringifiedPlanId ||
        // @ts-ignore
        tier.ypid === stringifiedPlanId,
    )

    // @ts-ignore
    if (plan && plan.pid) {
      const planCode = plan.id
      // @ts-ignore
      const isMonthly =
        // @ts-ignore
        plan.pid === stringifiedPlanId

      const billingFrequency = isMonthly
        ? BillingFrequency.Monthly
        : BillingFrequency.Yearly

      return {
        planCode,
        billingFrequency,
        planType: this.normalizePlanType(requestedPlanType),
      }
    }

    return null
  }

  async previewSubscription(
    id: string,
    planID: number,
    requestedPlanType?: string | null,
  ) {
    const user = await this.findOne({ where: { id } })
    const plan = this.getPlanById(planID, requestedPlanType)

    if (!plan) {
      throw new BadRequestException('Plan not found')
    }

    const { planCode, billingFrequency, planType } = plan

    if (
      user.planCode === planCode &&
      user.billingFrequency === billingFrequency &&
      getEffectivePlanType(user) === planType
    ) {
      throw new BadRequestException('You are already subscribed to this plan')
    }

    if (user.cancellationEffectiveDate) {
      throw new BadRequestException(
        'Cannot preview a subscription change as it has been cancelled, please subscribe to a new plan',
      )
    }

    const url = 'https://vendors.paddle.com/api/2.0/subscription/preview_update'

    let preview: any = {}

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: Number(PADDLE_VENDOR_ID),
          vendor_auth_code: PADDLE_API_KEY,
          subscription_id: Number(user.subID),
          plan_id: planID,
          prorate: true,
          bill_immediately: true,
          currency: user.tierCurrency,
          keep_modifiers: false,
        }),
      })
      preview = { data: await res.json() }
    } catch (error) {
      console.error('[ERROR] (previewSubscription):', error)
      throw new BadRequestException('Something went wrong')
    }

    const { data } = preview

    if (!data.success) {
      console.error('[ERROR] (previewSubscription) success -> false:', preview)
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
    const url = 'https://vendors.paddle.com/api/2.0/subscription/users/cancel'

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: Number(PADDLE_VENDOR_ID),
          vendor_auth_code: PADDLE_API_KEY,
          subscription_id: Number(subID),
        }),
      })

      const data = await res.json()

      if (!data?.success) {
        console.error('[ERROR] (cancelSubscription) success -> false:', data)
        throw new InternalServerErrorException(
          'Failed to cancel subscription with payment provider',
        )
      }
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error

      console.error('[ERROR] (cancelSubscription):', error)
      throw new BadRequestException(
        'Failed to cancel subscription. Please try again or contact support.',
      )
    }
  }

  async updateSubscription(
    id: string,
    planID: number,
    requestedPlanType?: string | null,
  ) {
    const user = await this.findOne({ where: { id } })
    const plan = this.getPlanById(planID, requestedPlanType)

    if (!plan) {
      throw new BadRequestException('Plan not found')
    }

    const { planCode, billingFrequency, planType } = plan

    if (
      user.planCode === planCode &&
      user.billingFrequency === billingFrequency &&
      getEffectivePlanType(user) === planType
    ) {
      throw new BadRequestException('You are already subscribed to this plan')
    }

    if (user.cancellationEffectiveDate) {
      throw new BadRequestException(
        'Cannot change your subscription as it has been cancelled, please subscribe to a new plan',
      )
    }

    const url = 'https://vendors.paddle.com/api/2.0/subscription/users/update'

    let result: any = {}

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: Number(PADDLE_VENDOR_ID),
          vendor_auth_code: PADDLE_API_KEY,
          subscription_id: Number(user.subID),
          plan_id: planID,
          prorate: true,
          bill_immediately: true,
          currency: user.tierCurrency,
          keep_modifiers: false,
          passthrough: JSON.stringify({
            uid: id,
            planType,
          }),
        }),
      })
      result = { data: await res.json() }
    } catch (error) {
      console.error('[ERROR] (updateSubscription):', error)
      throw new BadRequestException('Something went wrong')
    }

    const { data } = result

    if (!data.success) {
      console.error('[ERROR] (updateSubscription) success -> false:', result)
      throw new InternalServerErrorException('Something went wrong')
    }

    const { response } = data

    const {
      subscription_id: subID,
      next_payment: { currency, date },
    } = response

    const updateParams = {
      planCode,
      planType,
      subID,
      nextBillDate: date,
      billingFrequency,
      tierCurrency: currency,
    }

    await this.update(id, updateParams)
    await this.refreshWebsiteAddonEntitlements(id)
    await this.refreshSessionReplayAddonEntitlements(id)
  }

  async generatePayLink(
    id: string,
    productId: number,
    context: { planType?: string | null; eventTier?: string | null } = {},
  ) {
    const user = await this.findOne({ where: { id } })
    if (!user) {
      throw new BadRequestException('User not found')
    }

    const plan = this.getPlanById(productId, context.planType)
    if (!plan) {
      throw new BadRequestException('Plan not found')
    }

    const url = 'https://vendors.paddle.com/api/2.0/product/generate_pay_link'

    let result: any = {}

    try {
      const isTrial = !user.trialEndDate

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: Number(PADDLE_VENDOR_ID),
          vendor_auth_code: PADDLE_API_KEY,
          product_id: productId,
          customer_email: user.email,
          passthrough: JSON.stringify({
            uid: id,
            planType: plan.planType,
            eventTier: context.eventTier || null,
          }),
          ...(isTrial
            ? {
                trial_days: TRIAL_DURATION,
                prices: ['USD:0', 'EUR:0', 'GBP:0'],
              }
            : {}),
        }),
      })
      result = { data: await res.json() }
    } catch (error) {
      console.error('[ERROR] (generatePayLink):', error)
      throw new BadRequestException('Something went wrong')
    }

    const { data } = result

    if (!data.success) {
      console.error('[ERROR] (generatePayLink) success -> false:', result.data)
      throw new InternalServerErrorException('Something went wrong')
    }

    return { url: data.response.url }
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
