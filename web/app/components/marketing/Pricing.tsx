import { Label, Radio, RadioGroup } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/24/solid'
import cx from 'clsx'
import dayjs from 'dayjs'
import _includes from 'lodash/includes'
import _isNil from 'lodash/isNil'
import _map from 'lodash/map'
import React, { memo, useState, useEffect } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'
import { toast } from 'sonner'

import { previewSubscriptionUpdate, changeSubscriptionPlan, getPaymentMetainfo } from '~/api'
import {
  CONTACT_EMAIL,
  paddleLanguageMapping,
  PLAN_LIMITS,
  CURRENCIES,
  BillingFrequency,
  REFERRAL_DISCOUNT_CODE,
  STANDARD_PLANS,
  TRIAL_DAYS,
} from '~/lib/constants'
import { DEFAULT_METAINFO, Metainfo } from '~/lib/models/Metainfo'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import { cn } from '~/utils/generic'
import routes from '~/utils/routes'

const getPaidFeatures = (t: any, tier: any) => {
  return [
    t('pricing.tiers.upToXVMo', { amount: tier.monthlyUsageLimit.toLocaleString('en-US') }),
    t('pricing.tiers.upToXWebsites', { amount: 50 }),
    t('pricing.tiers.xAlertsPlural', { amount: 50 }),
    t('pricing.tiers.userFlowAnalysis'),
    t('pricing.tiers.dataExports'),
    t('pricing.tiers.dataOwnership'),
    t('main.competitiveFeatures.perf'),
    t('pricing.tiers.dashboards'),
    t('pricing.tiers.reports'),
  ]
}

interface PricingProps {
  authenticated: boolean
  isBillingPage?: boolean
  lastEvent?: {
    event: string
  } | null
}

const Pricing = ({ authenticated, isBillingPage, lastEvent }: PricingProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { user, loadUser } = useAuth()
  const { theme } = useTheme()

  const [metainfo, setMetainfo] = useState<Metainfo>(DEFAULT_METAINFO)

  const currencyCode = user?.tierCurrency || metainfo.code

  const [planCodeLoading, setPlanCodeLoading] = useState<string | null>(null)
  const [isNewPlanConfirmationModalOpened, setIsNewPlanConfirmationModalOpened] = useState(false)
  const [subUpdatePreview, setSubUpdatePreview] = useState<any>(null) // object - preview itself, null - loading, false - error
  const [newPlanId, setNewPlanId] = useState<number | null>(null)
  const [isSubUpdating, setIsSubUpdating] = useState(false)
  const [downgradeTo, setDowngradeTo] = useState<{
    planCode: string
    name: string
    pid: string
    ypid: string
  } | null>(null)
  const [showDowngradeModal, setShowDowngradeModal] = useState(false)
  const [billingFrequency, setBillingFrequency] = useState(user?.billingFrequency || BillingFrequency.monthly)

  const PLAN_CODES_ARRAY = authenticated
    ? _includes(STANDARD_PLANS, user?.planCode)
      ? STANDARD_PLANS
      : [user?.planCode, ...STANDARD_PLANS]
    : STANDARD_PLANS

  const [selectedTier, setSelectedTier] = useState(PLAN_LIMITS[user?.planCode || 'hobby'])
  const planFeatures = getPaidFeatures(t, selectedTier)
  const currency = CURRENCIES[currencyCode]

  const onSelectPlanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = Number(e.target.value)
    const planCode = PLAN_CODES_ARRAY[index]

    // @ts-expect-error
    setSelectedTier(PLAN_LIMITS[planCode])
  }

  useEffect(() => {
    const abortController = new AbortController()

    getPaymentMetainfo({ signal: abortController.signal })
      .then(setMetainfo)
      .catch(() => {})

    return () => abortController.abort()
  }, [])

  useEffect(() => {
    if (!lastEvent) {
      return
    }

    const lastEventHandler = async (data: { event: string }) => {
      if (_isNil(data)) {
        return
      }

      if (data.event === 'Checkout.Complete') {
        // giving some time to the API to process tier upgrate via Paddle webhook
        setTimeout(async () => {
          await loadUser()

          toast.success(t('apiNotifications.subscriptionUpdated'))
        }, 3000)
        setPlanCodeLoading(null)
        setDowngradeTo(null)
      } else if (data.event === 'Checkout.Close') {
        setPlanCodeLoading(null)
        setDowngradeTo(null)
      }
    }

    lastEventHandler(lastEvent)
  }, [lastEvent, t, loadUser])

  const loadSubUpdatePreview = async (planId: number) => {
    setIsNewPlanConfirmationModalOpened(true)
    try {
      const preview = await previewSubscriptionUpdate(planId)
      setSubUpdatePreview(preview)
    } catch (reason) {
      console.error('[ERROR] An error occured while loading subscription update pricing preview:', reason)
      toast.error('An error occured while loading subscription update pricing preview')
      setSubUpdatePreview(false)
    }
  }

  const onPlanChange = async (tier: { planCode: string; name: string; pid: string; ypid: string }) => {
    if (!user) {
      return
    }

    const isSelectingDifferentPlan =
      user.planCode !== tier.planCode ||
      user.billingFrequency !== billingFrequency ||
      !['free', 'trial', 'none'].includes(user.planCode)

    if (planCodeLoading || !isSelectingDifferentPlan) {
      return
    }

    if (user.subID && !user.cancellationEffectiveDate && user.planCode !== 'none') {
      const planId = Number(billingFrequency === BillingFrequency.monthly ? tier.pid : tier.ypid)
      setNewPlanId(planId)
      await loadSubUpdatePreview(planId)
      return
    }

    setPlanCodeLoading(tier.planCode)

    if (!window.Paddle) {
      toast.error('Payment script has not yet loaded! Please, try again.')
      setPlanCodeLoading(null)
      return
    }

    const discountMayBeApplied =
      user.referrerID && (user.planCode === 'trial' || user.planCode === 'none') && !user.cancellationEffectiveDate
    const coupon = discountMayBeApplied ? REFERRAL_DISCOUNT_CODE : undefined

    window.Paddle.Checkout.open({
      product: billingFrequency === BillingFrequency.monthly ? tier.pid : tier.ypid,
      email: user.email,
      passthrough: JSON.stringify({
        uid: user.id,
      }),
      locale: paddleLanguageMapping[language] || language,
      title: tier.name,
      displayModeTheme: theme,
      country: metainfo.country,
      coupon,
    })
  }

  const closeUpdateModal = (force?: boolean) => {
    if (isSubUpdating && !force) {
      return
    }

    setIsNewPlanConfirmationModalOpened(false)
    setSubUpdatePreview(null)
    setNewPlanId(null)
    setIsSubUpdating(false)
  }

  const updateSubscription = async () => {
    setIsSubUpdating(true)

    try {
      await changeSubscriptionPlan(newPlanId as number)

      await loadUser()

      toast.success(t('apiNotifications.subscriptionUpdated'))
      closeUpdateModal(true)
    } catch (reason) {
      console.error('[ERROR] An error occured while updating subscription:', reason)
      toast.error('An error occured while updating subscription')
      closeUpdateModal(true)
    }
  }

  const downgradeHandler = (tier: { planCode: string; name: string; pid: string; ypid: string }) => {
    if (!user) {
      return
    }

    if (planCodeLoading === null && user.planCode !== tier.planCode) {
      setDowngradeTo(tier)
      setShowDowngradeModal(true)
    }
  }

  const userPlancodeID = user?.planCode ? PLAN_LIMITS[user.planCode]?.index : 0
  const planCodeID = selectedTier.index
  const downgrade = !user?.cancellationEffectiveDate && planCodeID < userPlancodeID

  let action: string

  if (user?.cancellationEffectiveDate || ['free', 'trial', 'none'].includes(user?.planCode || '')) {
    action = t('pricing.subscribe')
  } else if (planCodeID > userPlancodeID) {
    action = t('pricing.upgrade')
  } else if (downgrade) {
    action = t('pricing.downgrade')
  } else if (user?.billingFrequency === billingFrequency) {
    action = t('pricing.yourPlan')
  } else if (billingFrequency === BillingFrequency.monthly) {
    action = t('pricing.switchToMonthly')
  } else {
    action = t('pricing.switchToYearly')
  }

  return (
    <>
      <div id='pricing' className={cx({ 'bg-gray-100/80 dark:bg-slate-800/50': !authenticated })}>
        <div
          className={cx('max-w-max whitespace-pre-line', {
            'px-4 py-24 sm:px-6 lg:px-8': !authenticated,
            'mx-auto': !isBillingPage,
          })}
        >
          <div className='sm:align-center sm:flex sm:flex-col'>
            {!authenticated ? (
              <>
                <h2 className='font-sans text-4xl font-extrabold text-gray-900 sm:text-center dark:text-gray-50'>
                  {t('pricing.title')}
                </h2>
                <p className='my-5 text-lg leading-relaxed text-slate-900 sm:text-center dark:text-slate-300'>
                  {t('pricing.adv', {
                    amount: TRIAL_DAYS,
                  })}
                </p>
              </>
            ) : null}
            <div className='flex justify-between'>
              <div>
                <h3 className='text-lg font-medium tracking-tight text-gray-900 dark:text-gray-50'>
                  {selectedTier.monthlyUsageLimit.toLocaleString('en-US')}
                </h3>
                <p className='text-gray-700 dark:text-gray-200'>{t('pricing.eventPerMonth')}</p>
              </div>
              <div className='flex justify-center'>
                <RadioGroup
                  value={billingFrequency}
                  onChange={setBillingFrequency}
                  className='grid grid-cols-2 gap-x-1 rounded-md p-1 text-center text-xs leading-5 font-semibold ring-1 ring-gray-200 ring-inset dark:ring-slate-700'
                >
                  <Label className='sr-only'>{t('pricing.frequency')}</Label>
                  <Radio
                    key={BillingFrequency.monthly}
                    value={BillingFrequency.monthly}
                    className={({ checked }) =>
                      cx(
                        checked ? 'bg-slate-900 text-gray-50 dark:bg-indigo-700' : 'text-gray-500 dark:text-gray-200',
                        'flex cursor-pointer items-center justify-center rounded-md px-2.5',
                      )
                    }
                  >
                    <span>{t('pricing.monthlyBilling')}</span>
                  </Radio>
                  <Radio
                    key={BillingFrequency.yearly}
                    value={BillingFrequency.yearly}
                    className={({ checked }) =>
                      cx(
                        checked ? 'bg-slate-900 text-gray-50 dark:bg-indigo-700' : 'text-gray-500 dark:text-gray-200',
                        'relative flex cursor-pointer items-center justify-center rounded-md px-2.5',
                      )
                    }
                  >
                    {/* <Badge
                      label={t('billing.xMonthsFree', { amount: 2 })}
                      className='absolute -top-5 -left-1 w-max max-w-[200px]'
                      colour='yellow'
                    /> */}
                    <span>{t('pricing.yearlyBilling')}</span>
                  </Radio>
                </RadioGroup>
              </div>
            </div>
          </div>
          <label className='sr-only' htmlFor='tier-selector'>
            {t('pricing.selectPlan')}
          </label>
          <input
            id='tier-selector'
            type='range'
            min='0'
            max={PLAN_CODES_ARRAY.length - 1}
            value={PLAN_CODES_ARRAY.indexOf(selectedTier.planCode)}
            className='arrows-handle mt-5 h-2 w-full appearance-none rounded-full bg-gray-200 dark:bg-slate-600'
            onChange={onSelectPlanChange}
          />
          <div className='relative mt-5 divide-y rounded-2xl border ring-1 ring-gray-200 dark:ring-slate-700'>
            {user?.planCode === selectedTier.planCode ? (
              <div className='absolute top-0 left-5 translate-y-px transform border-none'>
                <div className='flex -translate-y-1/2 transform justify-center bg-gray-50 dark:bg-slate-900'>
                  <Badge label={t('pricing.currentPlan')} colour='indigo' />
                </div>
              </div>
            ) : null}
            {selectedTier.legacy ? (
              <div className='absolute top-0 right-5 translate-y-px transform border-none'>
                <div className='flex -translate-y-1/2 transform justify-center bg-gray-50 dark:bg-slate-900'>
                  <Badge label={t('pricing.legacy')} colour='yellow' />
                </div>
              </div>
            ) : null}
            <div className='border-none p-6'>
              <ClientOnly fallback={<Loader />}>
                {() => (
                  <div className='flex flex-wrap justify-between'>
                    <p className='mt-2 sm:mt-0'>
                      {selectedTier.planCode === 'trial' && user?.planCode === 'trial' ? (
                        <span className='text-2xl leading-10 font-bold text-[#4D4D4D] dark:text-gray-50'>
                          {t('pricing.tiers.trial')}
                        </span>
                      ) : (
                        <>
                          <span className='text-4xl font-bold text-[#4D4D4D] dark:text-gray-50'>
                            {currency.symbol}
                            {billingFrequency === BillingFrequency.monthly
                              ? selectedTier.price[currencyCode]?.monthly
                              : selectedTier.price[currencyCode]?.yearly}
                          </span>
                          &nbsp;
                          <span className='text-base font-medium text-gray-500 dark:text-gray-400'>
                            /{t(billingFrequency === BillingFrequency.monthly ? 'pricing.perMonth' : 'pricing.perYear')}
                          </span>
                        </>
                      )}
                    </p>

                    {authenticated ? (
                      <Button
                        // @ts-expect-error TODO fix this later
                        onClick={() => (downgrade ? downgradeHandler(selectedTier) : onPlanChange(selectedTier))}
                        type='button'
                        className={cn('mt-2 sm:mt-0', {
                          hidden: selectedTier.planCode === 'trial',
                        })}
                        loading={planCodeLoading === selectedTier.planCode}
                        disabled={
                          planCodeLoading !== null ||
                          (selectedTier.planCode === user?.planCode &&
                            (user?.billingFrequency === billingFrequency ||
                              ['free', 'trial', 'none'].includes(user?.planCode || '')))
                        }
                        primary
                        large
                      >
                        {action}
                      </Button>
                    ) : (
                      <Link
                        className='relative inline-flex items-center rounded-md border border-transparent bg-slate-900 px-4 py-2 text-sm leading-4 font-medium text-gray-50 select-none hover:bg-slate-700 dark:bg-indigo-700 dark:hover:bg-indigo-800'
                        to={routes.signup}
                        aria-label={t('titles.signup')}
                      >
                        {t('common.getStarted')}
                      </Link>
                    )}
                  </div>
                )}
              </ClientOnly>
            </div>
            <div className='border-none px-6'>
              <hr className='mx-auto w-full border border-gray-300 dark:border-slate-800' />
            </div>
            <div className='border-none px-6 pt-6 pb-8'>
              <h3 className='text-xs font-medium tracking-wide text-gray-900 uppercase dark:text-gray-50'>
                {t('pricing.whatIncl')}
              </h3>
              {/* space-y-4 */}
              <ul className='mt-6 grid grid-cols-2 gap-4'>
                {_map(planFeatures, (feature) => (
                  <li key={feature} className='flex space-x-3'>
                    <CheckIcon className='h-5 w-5 shrink-0 text-green-500' aria-hidden='true' />
                    <span className='text-sm text-gray-700 dark:text-gray-200'>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className='mt-5 font-sans text-base tracking-normal text-gray-900 dark:text-gray-50'>
            <Trans
              t={t}
              i18nKey='billing.contact'
              values={{
                amount: 10,
              }}
              components={{
                url: (
                  <Link
                    to={routes.contact}
                    className='leading-6 font-semibold text-indigo-600 hover:underline dark:text-indigo-400'
                    aria-label={t('footer.tos')}
                  />
                ),
              }}
            />
          </p>
        </div>
        <div className='checkout-container' id='checkout-container' />
      </div>
      <Modal
        onClose={() => {
          setDowngradeTo(null)
          setShowDowngradeModal(false)
        }}
        onSubmit={() => {
          setShowDowngradeModal(false)
          if (downgradeTo) {
            onPlanChange(downgradeTo)
          }
        }}
        submitText={t('common.yes')}
        closeText={t('common.no')}
        title={t('pricing.downgradeTitle')}
        type='warning'
        message={
          <Trans
            t={t}
            i18nKey='pricing.downgradeDesc'
            values={{
              email: CONTACT_EMAIL,
            }}
          />
        }
        isOpened={showDowngradeModal}
      />
      <Modal
        onClose={closeUpdateModal}
        onSubmit={updateSubscription}
        submitText={t('common.confirm')}
        closeText={t('common.goBack')}
        title={t('billing.confirmNewPlan')}
        submitType='regular'
        type='info'
        isLoading={isSubUpdating}
        message={
          <>
            {subUpdatePreview === null ? <Loader /> : null}
            {subUpdatePreview === false ? (
              <p className='whitespace-pre-line'>
                <Trans
                  t={t}
                  i18nKey='billing.previewLoadingError'
                  values={{
                    email: CONTACT_EMAIL,
                  }}
                  components={{
                    mail: (
                      <a
                        title={`Email us at ${CONTACT_EMAIL}`}
                        href={`mailto:${CONTACT_EMAIL}`}
                        className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                      />
                    ),
                  }}
                />
              </p>
            ) : null}
            {subUpdatePreview ? (
              <div>
                <h2 className='text-base font-bold'>{t('billing.dueNow')}</h2>
                <p className='text-sm'>{t('billing.dueNowDescription')}</p>
                <div className='mt-2 overflow-hidden ring-1 ring-black/5 md:rounded-lg'>
                  <table className='200 min-w-full divide-y divide-gray-300 dark:divide-gray-500'>
                    <thead className='bg-gray-50 dark:bg-slate-800'>
                      <tr>
                        <th
                          scope='col'
                          className='py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-gray-50'
                        >
                          {t('common.amount')}
                        </th>
                        <th
                          scope='col'
                          className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-50'
                        >
                          {t('common.date')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200 bg-white dark:divide-gray-600 dark:bg-slate-800'>
                      <tr>
                        <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 sm:pl-6 dark:text-gray-50'>
                          {`${subUpdatePreview.immediatePayment.symbol}${subUpdatePreview.immediatePayment.amount}`}
                        </td>
                        <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-gray-50'>
                          {language === 'en'
                            ? dayjs(subUpdatePreview.immediatePayment.date).locale(language).format('MMMM D, YYYY')
                            : dayjs(subUpdatePreview.immediatePayment.date).locale(language).format('D MMMM, YYYY')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {subUpdatePreview.immediatePayment.amount < 0 ? (
                  <p className='mt-2 italic'>
                    {t('billing.negativePayment', {
                      currency: subUpdatePreview.immediatePayment.symbol,
                      dueNowAmount: -subUpdatePreview.immediatePayment.amount,
                      dueNowDate:
                        language === 'en'
                          ? dayjs(subUpdatePreview.immediatePayment.date).locale(language).format('MMMM D, YYYY')
                          : dayjs(subUpdatePreview.immediatePayment.date).locale(language).format('D MMMM, YYYY'),
                      nextPaymentAmount: subUpdatePreview.nextPayment.amount,
                    })}
                  </p>
                ) : null}
                <h2 className='mt-5 text-base font-bold'>{t('billing.nextPayment')}</h2>
                <div className='mt-2 overflow-hidden ring-1 ring-black/5 md:rounded-lg'>
                  <table className='200 min-w-full divide-y divide-gray-300 dark:divide-gray-500'>
                    <thead className='bg-gray-50 dark:bg-slate-800'>
                      <tr>
                        <th
                          scope='col'
                          className='py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-gray-50'
                        >
                          {t('common.amount')}
                        </th>
                        <th
                          scope='col'
                          className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-50'
                        >
                          {t('common.date')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200 bg-white dark:divide-gray-600 dark:bg-slate-800'>
                      <tr>
                        <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 sm:pl-6 dark:text-gray-50'>
                          {`${subUpdatePreview.nextPayment.symbol}${subUpdatePreview.nextPayment.amount}`}
                        </td>
                        <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-gray-50'>
                          {language === 'en'
                            ? dayjs(subUpdatePreview.nextPayment.date).locale(language).format('MMMM D, YYYY')
                            : dayjs(subUpdatePreview.nextPayment.date).locale(language).format('D MMMM, YYYY')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </>
        }
        isOpened={isNewPlanConfirmationModalOpened}
      />
    </>
  )
}

export default memo(Pricing)
