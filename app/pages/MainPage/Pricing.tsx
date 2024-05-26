/* eslint-disable no-confusing-arrow */
import React, { memo, useState, useEffect } from 'react'
import type i18next from 'i18next'
import { useSelector, useDispatch } from 'react-redux'
import { ClientOnly } from 'remix-utils/client-only'
import { Link } from '@remix-run/react'
import { CheckIcon } from '@heroicons/react/24/solid'
import dayjs from 'dayjs'
import _map from 'lodash/map'
import _isNil from 'lodash/isNil'
import _includes from 'lodash/includes'
import { Trans } from 'react-i18next'
import { RadioGroup } from '@headlessui/react'
import cx from 'clsx'

import Modal from 'ui/Modal'
import Button from 'ui/Button'
import {
  CONTACT_EMAIL,
  paddleLanguageMapping,
  PLAN_LIMITS,
  CURRENCIES,
  BillingFrequency,
  REFERRAL_DISCOUNT_CODE,
  STANDARD_PLANS,
  TRIAL_DAYS,
} from 'redux/constants'
import { errorsActions } from 'redux/reducers/errors'
import { alertsActions } from 'redux/reducers/alerts'
import { authActions } from 'redux/reducers/auth'
import sagaActions from 'redux/sagas/actions'
import { authMe, previewSubscriptionUpdate, changeSubscriptionPlan } from 'api'
import routes from 'routesPath'
import { AppDispatch, StateType } from 'redux/store'
import Loader from 'ui/Loader'
import { Badge } from 'ui/Badge'

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

interface IPricing {
  t: typeof i18next.t
  language: string
  authenticated: boolean
  isBillingPage?: boolean
}

const Pricing = ({ t, language, authenticated, isBillingPage }: IPricing) => {
  const dispatch: AppDispatch = useDispatch()
  const { user } = useSelector((state: StateType) => state.auth)
  const { theme } = useSelector((state: StateType) => state.ui.theme)
  const { paddle, metainfo } = useSelector((state: StateType) => state.ui.misc)
  const { lastEvent } = paddle
  const currencyCode = user?.tierCurrency || metainfo.code

  const [planCodeLoading, setPlanCodeLoading] = useState<string | null>(null)
  const [isNewPlanConfirmationModalOpened, setIsNewPlanConfirmationModalOpened] = useState<boolean>(false)
  const [subUpdatePreview, setSubUpdatePreview] = useState<any>(null) // object - preview itself, null - loading, false - error
  const [newPlanId, setNewPlanId] = useState<number | null>(null)
  const [isSubUpdating, setIsSubUpdating] = useState<boolean>(false)
  const [downgradeTo, setDowngradeTo] = useState<{
    planCode: string
    name: string
    pid: string
    ypid: string
  } | null>(null)
  const [showDowngradeModal, setShowDowngradeModal] = useState<boolean>(false)
  const [billingFrequency, setBillingFrequency] = useState(user?.billingFrequency || BillingFrequency.monthly)

  const PLAN_CODES_ARRAY = authenticated
    ? _includes(STANDARD_PLANS, user.planCode)
      ? STANDARD_PLANS
      : [user.planCode, ...STANDARD_PLANS]
    : STANDARD_PLANS

  // @ts-ignore
  const [selectedTier, setSelectedTier] = useState<any>(authenticated ? PLAN_LIMITS[user.planCode] : PLAN_LIMITS.hobby)
  const planFeatures = getPaidFeatures(t, selectedTier)
  const currency = CURRENCIES[currencyCode]

  const onSelectPlanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = Number(e.target.value)
    const planCode = PLAN_CODES_ARRAY[index]

    // @ts-ignore
    setSelectedTier(PLAN_LIMITS[planCode])
  }

  useEffect(() => {
    const lastEventHandler = async (data: { event: string }) => {
      if (_isNil(data)) {
        return
      }

      if (data.event === 'Checkout.Complete') {
        // giving some time to the API to process tier upgrate via Paddle webhook
        setTimeout(async () => {
          try {
            const me = await authMe()

            dispatch(authActions.loginSuccessful(me))
            dispatch(authActions.finishLoading())
          } catch (e) {
            dispatch(authActions.logout())
            dispatch(sagaActions.logout(false, false))
          }

          dispatch(
            alertsActions.accountUpdated({
              message: t('apiNotifications.subscriptionUpdated'),
            }),
          )
        }, 3000)
        setPlanCodeLoading(null)
        setDowngradeTo(null)
      } else if (data.event === 'Checkout.Close') {
        setPlanCodeLoading(null)
        setDowngradeTo(null)
      }
    }

    lastEventHandler(lastEvent)
  }, [lastEvent, dispatch, t])

  const loadSubUpdatePreview = async (planId: number) => {
    setIsNewPlanConfirmationModalOpened(true)
    try {
      const preview = await previewSubscriptionUpdate(planId)
      setSubUpdatePreview(preview)
    } catch (reason) {
      console.error('[ERROR] An error occured while loading subscription update pricing preview:', reason)
      dispatch(
        errorsActions.genericError({
          message: 'An error occured while loading subscription update pricing preview',
        }),
      )
      setSubUpdatePreview(false)
    }
  }

  const onPlanChange = async (tier: { planCode: string; name: string; pid: string; ypid: string }) => {
    if (
      planCodeLoading === null &&
      (user.planCode !== tier.planCode ||
        (user.billingFrequency !== billingFrequency && user.planCode !== 'free' && user.planCode !== 'trial'))
    ) {
      if (user.subID && user.planCode !== 'none') {
        const planId = Number(billingFrequency === BillingFrequency.monthly ? tier.pid : tier.ypid)
        setNewPlanId(planId)
        await loadSubUpdatePreview(planId)
        return
      }

      setPlanCodeLoading(tier.planCode)

      // @ts-ignore
      if (!window.Paddle) {
        dispatch(
          errorsActions.genericError({
            message: 'Payment script has not yet loaded! Please, try again.',
          }),
        )
        setPlanCodeLoading(null)
        return
      }

      const discountMayBeApplied =
        user.referrerID && (user.planCode === 'trial' || user.planCode === 'none') && !user.cancellationEffectiveDate
      const coupon = discountMayBeApplied ? REFERRAL_DISCOUNT_CODE : undefined

      // @ts-ignore
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

      try {
        const me = await authMe()

        dispatch(authActions.loginSuccessful(me))
        dispatch(authActions.finishLoading())
      } catch (e) {
        dispatch(authActions.logout())
        dispatch(sagaActions.logout(false, false))
      }

      dispatch(
        alertsActions.accountUpdated({
          message: t('apiNotifications.subscriptionUpdated'),
        }),
      )
      closeUpdateModal(true)
    } catch (reason) {
      console.error('[ERROR] An error occured while updating subscription:', reason)
      dispatch(
        errorsActions.genericError({
          message: 'An error occured while updating subscription',
        }),
      )
      closeUpdateModal(true)
    }
  }

  const downgradeHandler = (tier: { planCode: string; name: string; pid: string; ypid: string }) => {
    if (planCodeLoading === null && user.planCode !== tier.planCode) {
      setDowngradeTo(tier)
      setShowDowngradeModal(true)
    }
  }

  // @ts-ignore
  const userPlancodeID = PLAN_LIMITS[user.planCode]?.index
  const planCodeID = selectedTier.index
  const downgrade = planCodeID < userPlancodeID

  let action: string

  if (planCodeID > userPlancodeID) {
    action = t('pricing.upgrade')
  } else if (downgrade) {
    action = t('pricing.downgrade')
  } else if (
    user.billingFrequency === billingFrequency ||
    user.planCode === 'free' ||
    user.planCode === 'trial' ||
    user.planCode === 'none'
  ) {
    action = t('pricing.yourPlan')
  } else if (billingFrequency === BillingFrequency.monthly) {
    action = t('pricing.switchToMonthly')
  } else {
    action = t('pricing.switchToYearly')
  }

  return (
    <>
      <div id='pricing' className={cx({ 'bg-white dark:bg-slate-900/75': !authenticated })}>
        <div
          className={cx('max-w-max whitespace-pre-line', {
            'px-4 py-24 sm:px-6 lg:px-8': !authenticated,
            'mx-auto': !isBillingPage,
          })}
        >
          <div className='sm:align-center sm:flex sm:flex-col'>
            {!authenticated && (
              <>
                <h2 className='text-3xl font-extrabold text-gray-900 dark:text-gray-50 sm:text-center'>
                  {t('pricing.title')}
                </h2>
                <p className='mb-5 mt-5 max-w-prose text-xl text-gray-600 dark:text-gray-200 sm:text-center'>
                  {t('pricing.adv', {
                    amount: TRIAL_DAYS,
                  })}
                </p>
              </>
            )}
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
                  className='grid grid-cols-2 gap-x-1 rounded-md p-1 text-center text-xs font-semibold leading-5 ring-1 ring-inset ring-gray-200 dark:ring-slate-700'
                >
                  <RadioGroup.Label className='sr-only'>{t('pricing.frequency')}</RadioGroup.Label>
                  <RadioGroup.Option
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
                  </RadioGroup.Option>
                  <RadioGroup.Option
                    key={BillingFrequency.yearly}
                    value={BillingFrequency.yearly}
                    className={({ checked }) =>
                      cx(
                        checked ? 'bg-slate-900 text-gray-50 dark:bg-indigo-700' : 'text-gray-500 dark:text-gray-200',
                        'relative flex cursor-pointer items-center justify-center rounded-md px-2.5',
                      )
                    }
                  >
                    <Badge
                      label={t('billing.xMonthsFree', { amount: 2 })}
                      className='absolute -left-1 -top-5 w-max max-w-[200px]'
                      colour='yellow'
                    />
                    <span>{t('pricing.yearlyBilling')}</span>
                  </RadioGroup.Option>
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
          <div className='relative mt-5 divide-y rounded-2xl border shadow-sm ring-1 ring-gray-200 dark:ring-slate-700'>
            {user.planCode === selectedTier.planCode && (
              <div className='absolute left-5 top-0 translate-y-px transform'>
                <div className='flex -translate-y-1/2 transform justify-center'>
                  <span className='inline-flex rounded-full bg-indigo-600 px-4 py-1 text-sm font-semibold uppercase tracking-wider text-white'>
                    {t('pricing.currentPlan')}
                  </span>
                </div>
              </div>
            )}
            {selectedTier.legacy && (
              <div className='absolute right-5 top-0 translate-y-px transform'>
                <div className='flex -translate-y-1/2 transform justify-center'>
                  <span className='inline-flex rounded-full bg-amber-400 px-2 py-1 text-sm font-semibold uppercase tracking-wider text-white'>
                    {t('pricing.legacy')}
                  </span>
                </div>
              </div>
            )}
            <div className='border-none p-6'>
              <ClientOnly fallback={<Loader />}>
                {() => (
                  <div className='flex flex-wrap justify-between'>
                    <p className='mt-2 sm:mt-0'>
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
                    </p>

                    {authenticated ? (
                      <Button
                        onClick={() => (downgrade ? downgradeHandler(selectedTier) : onPlanChange(selectedTier))}
                        type='button'
                        className='mt-2 sm:mt-0'
                        loading={planCodeLoading === selectedTier.planCode}
                        disabled={
                          planCodeLoading !== null ||
                          (selectedTier.planCode === user.planCode &&
                            (user.billingFrequency === billingFrequency ||
                              user.planCode === 'free' ||
                              user.planCode === 'trial' ||
                              user.planCode === 'none'))
                        }
                        primary
                        large
                      >
                        {action}
                      </Button>
                    ) : (
                      <Link
                        className='relative inline-flex select-none items-center rounded-md border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium leading-4 text-gray-50 shadow-sm hover:bg-slate-700 dark:bg-indigo-700 dark:hover:bg-indigo-800'
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
            <div className='border-none px-6 pb-8 pt-6'>
              <h3 className='text-xs font-medium uppercase tracking-wide text-gray-900 dark:text-gray-50'>
                {t('pricing.whatIncl')}
              </h3>
              {/* space-y-4 */}
              <ul className='mt-6 grid grid-cols-2 gap-4'>
                {_map(planFeatures, (feature) => (
                  <li key={feature} className='flex space-x-3'>
                    <CheckIcon className='h-5 w-5 flex-shrink-0 text-green-500' aria-hidden='true' />
                    <span className='text-sm text-gray-700 dark:text-gray-200'>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className='mt-5 text-base tracking-tight text-gray-900 dark:text-gray-50'>
            <Trans
              // @ts-ignore
              t={t}
              i18nKey='billing.contact'
              values={{
                amount: 10,
              }}
              // @ts-ignore
              components={{
                url: (
                  <Link
                    to={routes.contact}
                    className='font-semibold leading-6 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
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
            // @ts-ignore
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
            {subUpdatePreview === null && <Loader />}
            {subUpdatePreview === false && (
              <p className='whitespace-pre-line'>
                <Trans
                  // @ts-ignore
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
                        className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400'
                      />
                    ),
                  }}
                />
              </p>
            )}
            {subUpdatePreview && (
              <div>
                <h2 className='text-base font-bold'>{t('billing.dueNow')}</h2>
                <p className='text-sm'>{t('billing.dueNowDescription')}</p>
                <div className='mt-2 overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg'>
                  <table className='200 min-w-full divide-y divide-gray-300 dark:divide-gray-500'>
                    <thead className='bg-gray-50 dark:bg-slate-800'>
                      <tr>
                        <th
                          scope='col'
                          className='py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50 sm:pl-6'
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
                        <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-50 sm:pl-6'>
                          {`${subUpdatePreview.immediatePayment.symbol}${subUpdatePreview.immediatePayment.amount}`}
                        </td>
                        <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-50'>
                          {language === 'en'
                            ? dayjs(subUpdatePreview.immediatePayment.date).locale(language).format('MMMM D, YYYY')
                            : dayjs(subUpdatePreview.immediatePayment.date).locale(language).format('D MMMM, YYYY')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {subUpdatePreview.immediatePayment.amount < 0 && (
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
                )}
                <h2 className='mt-5 text-base font-bold'>{t('billing.nextPayment')}</h2>
                <div className='mt-2 overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg'>
                  <table className='200 min-w-full divide-y divide-gray-300 dark:divide-gray-500'>
                    <thead className='bg-gray-50 dark:bg-slate-800'>
                      <tr>
                        <th
                          scope='col'
                          className='py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50 sm:pl-6'
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
                        <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-50 sm:pl-6'>
                          {`${subUpdatePreview.nextPayment.symbol}${subUpdatePreview.nextPayment.amount}`}
                        </td>
                        <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-50'>
                          {language === 'en'
                            ? dayjs(subUpdatePreview.nextPayment.date).locale(language).format('MMMM D, YYYY')
                            : dayjs(subUpdatePreview.nextPayment.date).locale(language).format('D MMMM, YYYY')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        }
        isOpened={isNewPlanConfirmationModalOpened}
      />
    </>
  )
}

export default memo(Pricing)
