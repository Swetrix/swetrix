/* eslint-disable no-confusing-arrow */
import React, { memo, useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { CheckIcon } from '@heroicons/react/24/solid'
import _map from 'lodash/map'
import _isNil from 'lodash/isNil'
import _findIndex from 'lodash/findIndex'
import _isEmpty from 'lodash/isEmpty'
import { Trans } from 'react-i18next'
import cx from 'clsx'

import Modal from 'ui/Modal'
import Spin from 'ui/icons/Spin'
import { CONTACT_EMAIL, paddleLanguageMapping, PLAN_LIMITS } from 'redux/constants'
import { errorsActions } from 'redux/actions/errors'
import { alertsActions } from 'redux/actions/alerts'
import { authActions } from 'redux/actions/auth'
import { authMe } from 'api'
import routes from 'routes'

const getNonStandardTiers = (t) => ({
  free: {
    name: t('pricing.free'),
    planCode: 'free',
    priceMonthly: PLAN_LIMITS.free.priceMonthly,
    priceYearly: PLAN_LIMITS.free.priceYearly,
    legacy: PLAN_LIMITS.free.legacy,
    includedFeatures: [
      t('pricing.tiers.upToXVMo', { amount: PLAN_LIMITS.free.monthlyUsageLimit.toLocaleString() }),
      t('pricing.tiers.upToXWebsites', { amount: PLAN_LIMITS.free.maxProjects }),
      // t('pricing.tiers.xMoDataRetention', { amount: 3 }),
      t('pricing.tiers.xAlertsSingular', { amount: PLAN_LIMITS.free.maxAlerts }),
      t('pricing.tiers.dataExports'),
      t('pricing.tiers.dataOwnership'),
      t('pricing.tiers.noBanners'),
      t('pricing.tiers.dashboards'),
      t('pricing.tiers.reports'),
    ],
  },
})

const getTiers = (t) => [
  {
    name: t('pricing.tiers.hobby'),
    planCode: 'hobby',
    priceMonthly: PLAN_LIMITS.hobby.priceMonthly,
    priceYearly: PLAN_LIMITS.hobby.priceYearly,
    includedFeatures: [
      t('pricing.tiers.upToXVMo', { amount: PLAN_LIMITS.hobby.monthlyUsageLimit.toLocaleString() }),
      t('pricing.tiers.upToXWebsites', { amount: PLAN_LIMITS.hobby.maxProjects }),
      // t('pricing.tiers.xMoDataRetention', { amount: 3 }),
      t('pricing.tiers.xAlertsPlural', { amount: PLAN_LIMITS.hobby.maxAlerts }),
      t('pricing.tiers.dataExports'),
      t('pricing.tiers.dataOwnership'),
      t('pricing.tiers.noBanners'),
      t('pricing.tiers.dashboards'),
      t('pricing.tiers.reports'),
    ],
  },
  {
    name: t('pricing.tiers.freelancer'),
    planCode: 'freelancer',
    priceMonthly: PLAN_LIMITS.freelancer.priceMonthly,
    priceYearly: PLAN_LIMITS.freelancer.priceYearly,
    includedFeatures: [
      t('pricing.tiers.evXPlanIncl', { plan: t('pricing.tiers.hobby') }),
      t('pricing.tiers.xVMo', { amount: PLAN_LIMITS.freelancer.monthlyUsageLimit.toLocaleString() }),
      t('pricing.tiers.upToXWebsites', { amount: PLAN_LIMITS.freelancer.maxProjects }),
      t('pricing.tiers.xAlertsPlural', { amount: PLAN_LIMITS.freelancer.maxAlerts }),
      // t('pricing.tiers.xMoDataRetention', { amount: 12 }),
      t('pricing.tiers.smallBusiSupport'),
    ],
    pid: 752316, // Plan ID
    ypid: 776469, // Plan ID - Yearly billing
  },
  {
    name: t('pricing.tiers.startup'),
    planCode: 'startup',
    priceMonthly: PLAN_LIMITS.startup.priceMonthly,
    priceYearly: PLAN_LIMITS.startup.priceYearly,
    includedFeatures: [
      t('pricing.tiers.evXPlanIncl', { plan: t('pricing.tiers.freelancer') }),
      t('pricing.tiers.xVMo', { amount: PLAN_LIMITS.startup.monthlyUsageLimit.toLocaleString() }),
      t('pricing.tiers.xAlertsPlural', { amount: PLAN_LIMITS.startup.maxAlerts }),
      // t('pricing.tiers.xMoDataRetention', { amount: 12 }),
    ],
    pid: 752317,
    ypid: 776470,
    mostPopular: true,
  },
  {
    name: t('pricing.tiers.enterprise'),
    planCode: 'enterprise',
    priceMonthly: PLAN_LIMITS.enterprise.priceMonthly,
    priceYearly: PLAN_LIMITS.enterprise.priceYearly,
    includedFeatures: [
      t('pricing.tiers.evXPlanIncl', { plan: t('pricing.tiers.startup') }),
      t('pricing.tiers.xVMo', { amount: PLAN_LIMITS.enterprise.monthlyUsageLimit.toLocaleString() }),
      t('pricing.tiers.upToXWebsites', { amount: PLAN_LIMITS.enterprise.maxProjects }),
      t('pricing.tiers.xAlertsPlural', { amount: PLAN_LIMITS.enterprise.maxAlerts }),
      // t('pricing.tiers.xMoDataRetention', { amount: 24 }),
    ],
    pid: 752318,
    ypid: 776471,
  },
]

const BillingFrequency = {
  monthly: 'monthly',
  yearly: 'yearly',
}

const PricingItem = ({
  tier, user, t, authenticated, billingFrequency, onPlanChange, downgradeHandler, downgrade,
  planCodeLoading, planCodeID, userPlancodeID,
}) => (
  <div
    key={tier.name}
    className={cx('relative border rounded-2xl shadow-sm divide-y bg-[#F5F5F5] dark:bg-[#212936] divide-gray-200 dark:divide-gray-500', {
      'border-indigo-400': user.planCode === tier.planCode,
      'border-gray-200 dark:border-gray-500': user.planCode !== tier.planCode,
    })}
  >
    {user.planCode === tier.planCode && (
      <div className='absolute inset-x-0 top-0 transform translate-y-px'>
        <div className='flex justify-center transform -translate-y-1/2'>
          <span className='inline-flex rounded-full bg-indigo-600 px-4 py-1 text-sm font-semibold tracking-wider uppercase text-white'>
            {t('pricing.currentPlan')}
          </span>
        </div>
      </div>
    )}
    <div className='p-6 border-none'>
      <h2 className='text-lg leading-6 font-semibold text-[#4D4D4D] dark:text-gray-50 text-center'>{tier.name}</h2>
      {tier.mostPopular && !authenticated && (
        <p className='absolute top-0 py-1.5 px-4 bg-indigo-600 rounded-full text-xs font-semibold uppercase tracking-wide text-white transform -translate-y-1/2'>
          {t('pricing.mostPopular')}
        </p>
      )}
      <p className='mt-4 text-center'>
        <span className='text-4xl font-bold text-[#4D4D4D] dark:text-gray-50'>
          $
          {billingFrequency === BillingFrequency.monthly ? tier.priceMonthly : tier.priceYearly}
        </span>
        &nbsp;
        <span className='text-base font-medium text-gray-500 dark:text-gray-400'>
          /
          {t(billingFrequency === BillingFrequency.monthly ? 'pricing.perMonth' : 'pricing.perYear')}
        </span>
      </p>
      {authenticated ? (
        <span
          onClick={() => downgrade ? downgradeHandler(tier) : onPlanChange(tier)}
          className={cx('inline-flex items-center justify-center mt-8 w-full rounded-md py-2 text-sm font-semibold text-white text-center select-none', {
            'bg-indigo-600 hover:bg-indigo-700 cursor-pointer': planCodeLoading === null && (tier.planCode !== user.planCode || (user.billingFrequency !== billingFrequency && user.planCode !== 'free')),
            'bg-indigo-400 cursor-default': planCodeLoading !== null || (tier.planCode === user.planCode && (user.billingFrequency === billingFrequency || user.planCode === 'free')),
          })}
        >
          {planCodeLoading === tier.planCode && (
            <Spin />
          )}
          {planCodeID > userPlancodeID
            ? t('pricing.upgrade')
            : downgrade
              ? t('pricing.downgrade')
              : (user.billingFrequency === billingFrequency || user.planCode === 'free')
                ? t('pricing.yourPlan')
                : billingFrequency === BillingFrequency.monthly
                  ? t('pricing.switchToMonthly')
                  : t('pricing.switchToYearly')}
        </span>
      ) : (
        <Link
          className='mt-8 block w-full bg-indigo-600 rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-indigo-700'
          to={routes.signup}
          aria-label={t('titles.signup')}
        >
          {tier.planCode === 'free' ? t('common.getStarted') : t('pricing.upgrade')}
        </Link>
      )}
    </div>
    <div className='px-6 border-none'>
      <hr className='w-full mx-auto border border-gray-300 dark:border-gray-600' />
    </div>
    <div className='pt-6 pb-8 px-6 border-none'>
      <h3 className='text-xs font-medium text-gray-900 dark:text-gray-50 tracking-wide uppercase'>
        {t('pricing.whatIncl')}
      </h3>
      <ul className='mt-6 space-y-4'>
        {_map(tier.includedFeatures, (feature) => (
          <li key={feature} className='flex space-x-3'>
            <CheckIcon className='flex-shrink-0 h-5 w-5 text-green-500' aria-hidden='true' />
            <span className='text-sm text-gray-500 dark:text-gray-200'>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
)

const Pricing = ({ t, language }) => {
  const dispatch = useDispatch()
  const { authenticated, user } = useSelector(state => state.auth)
  const { theme } = useSelector(state => state.ui.theme)
  const { lastEvent } = useSelector(state => state.ui.misc.paddle)
  const [planCodeLoading, setPlanCodeLoading] = useState(null)
  const [downgradeTo, setDowngradeTo] = useState(null)
  const [showDowngradeModal, setShowDowngradeModal] = useState(false)
  const [billingFrequency, setBillingFrequency] = useState(user?.billingFrequency || BillingFrequency.monthly)
  const tiers = getTiers(t)
  const nonStandardTiers = getNonStandardTiers(t)
  const isNonStandardTier = authenticated && !_isEmpty(nonStandardTiers[user.planCode])

  useEffect(() => {
    const lastEventHandler = async (data) => {
      if (_isNil(data)) {
        return
      }

      if (data.event === 'Checkout.Complete') {
        // giving some time to the API to process tier upgrate via Paddle webhook
        setTimeout(async () => {
          try {
            const me = await authMe()

            dispatch(authActions.loginSuccess(me))
            dispatch(authActions.finishLoading())
          } catch (e) {
            dispatch(authActions.logout())
          }

          dispatch(alertsActions.accountUpdated(t('apiNotifications.subscriptionUpdated')))
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

  const onPlanChange = (tier) => {
    if (planCodeLoading === null && (user.planCode !== tier.planCode || (user.billingFrequency !== billingFrequency && user.planCode !== 'free'))) {
      setPlanCodeLoading(tier.planCode)

      if (!window.Paddle) {
        dispatch(errorsActions.genericError('Payment script has not yet loaded! Please, try again.'))
        setPlanCodeLoading(null)
        return
      }

      if (tier.planCode === 'free') {
        window.Paddle.Checkout.open({
          override: user.subCancelURL,
          method: 'inline',
          frameTarget: 'checkout-container',
          frameInitialHeight: 416,
          frameStyle: 'width:100%; min-width:312px; background-color: #f9fafb; border: none; border-radius: 10px; margin-top: 10px;',
          locale: paddleLanguageMapping[language] || language,
          displayModeTheme: theme,
        })
        setTimeout(() => {
          document.querySelector('#checkout-container').scrollIntoView()
        }, 500)
        return
      }

      window.Paddle.Checkout.open({
        product: billingFrequency === BillingFrequency.monthly ? tier.pid : tier.ypid,
        email: user.email,
        passthrough: JSON.stringify({
          uid: user.id,
        }),
        locale: paddleLanguageMapping[language] || language,
        title: tier.name,
        displayModeTheme: theme,
      })
    }
  }

  const downgradeHandler = (tier) => {
    if (planCodeLoading === null && user.planCode !== tier.planCode) {
      setDowngradeTo(tier)
      setShowDowngradeModal(true)
    }
  }

  const userPlancodeID = _findIndex(tiers, (el) => el.planCode === user.planCode)

  return (
    <>
      <div id='pricing' className={cx({ 'bg-white dark:bg-gray-750': !authenticated })}>
        <div className={cx('w-11/12 max-w-7xl mx-auto whitespace-pre-line', { 'px-4 sm:px-6 lg:px-8 py-24': !authenticated })}>
          <div className='sm:flex sm:flex-col sm:align-center'>
            {!authenticated && (
              <>
                <h1 className='text-3xl font-extrabold text-gray-900 dark:text-gray-50 sm:text-center'>
                  {t('pricing.title')}
                </h1>
                <p className='mt-5 text-xl text-gray-500 dark:text-gray-200 sm:text-center'>
                  {t('pricing.adv')}
                </p>
              </>
            )}
            <div className='relative self-center mt-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 flex sm:mt-8 xs:flex-row flex-col'>
              <button
                type='button'
                onClick={() => setBillingFrequency(BillingFrequency.monthly)}
                className={cx('relative xs:w-1/2 rounded-md shadow-sm py-2 text-sm font-medium whitespace-nowrap sm:w-auto sm:px-8', {
                  'bg-white border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-800 dark:text-gray-50': billingFrequency === BillingFrequency.monthly,
                  'text-gray-700 dark:text-gray-100': billingFrequency === BillingFrequency.yearly,
                })}
              >
                {t('pricing.monthlyBilling')}
              </button>
              <button
                type='button'
                onClick={() => setBillingFrequency(BillingFrequency.yearly)}
                className={cx('ml-0.5 relative xs:w-1/2 border border-transparent rounded-md py-2 text-sm font-medium whitespace-nowrap sm:w-auto sm:px-8', {
                  'text-gray-700 dark:text-gray-100': billingFrequency === BillingFrequency.monthly,
                  'bg-white border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-800 dark:text-gray-50': billingFrequency === BillingFrequency.yearly,
                })}
              >
                {t('pricing.yearlyBilling')}
              </button>
            </div>
          </div>
          <div className='mt-6 space-y-4 sm:mt-10 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-4'>
            {isNonStandardTier && (
              <PricingItem
                key={user.planCode}
                tier={nonStandardTiers[user.planCode]}
                user={user}
                t={t}
                billingFrequency={billingFrequency}
                onPlanChange={onPlanChange}
                downgrade={false}
                downgradeHandler={downgradeHandler}
                planCodeLoading={planCodeLoading}
                authenticated={authenticated}
                planCodeID={user.planCode}
                userPlancodeID={user.planCode}
              />
            )}
            {_map(tiers, (tier) => {
              const planCodeID = _findIndex(tiers, (el) => el.planCode === tier.planCode)
              const downgrade = planCodeID < userPlancodeID

              return (
                <PricingItem
                  key={tier.planCode}
                  tier={tier}
                  user={user}
                  t={t}
                  billingFrequency={billingFrequency}
                  onPlanChange={onPlanChange}
                  downgrade={downgrade}
                  downgradeHandler={downgradeHandler}
                  planCodeLoading={planCodeLoading}
                  authenticated={authenticated}
                  planCodeID={planCodeID}
                  userPlancodeID={userPlancodeID}
                />
              )
            })}
          </div>
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
          onPlanChange(downgradeTo)
        }}
        submitText={t('common.yes')}
        closeText={t('common.no')}
        title={t('pricing.downgradeTitle')}
        type='warning'
        message={(
          <Trans
            t={t}
            i18nKey='pricing.downgradeDesc'
            values={{
              email: CONTACT_EMAIL,
            }}
          />
        )}
        isOpened={showDowngradeModal}
      />
    </>
  )
}

export default memo(Pricing)
