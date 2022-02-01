import React, { memo, useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { CheckIcon } from '@heroicons/react/solid'
import _map from 'lodash/map'
import _isNil from 'lodash/isNil'
import _findIndex from 'lodash/findIndex'
import { Trans } from 'react-i18next'
import cx from 'clsx'

import Modal from 'ui/Modal'
import Spin from '../../ui/icons/Spin'
import { CONTACT_EMAIL } from 'redux/constants'
import { errorsActions } from 'redux/actions/errors'
import { alertsActions } from 'redux/actions/alerts'
import { authActions } from 'redux/actions/auth'
import { authMe } from 'api'
import routes from 'routes'

const getTiers = (t) => [
  {
    name: t('pricing.tiers.hobby'),
    planCode: 'free',
    priceMonthly: null,
    includedFeatures: [
      t('pricing.tiers.upToXEVMo', { amount: 5000 }),
      t('pricing.tiers.upToXProjects', { amount: 10 }),
      // t('pricing.tiers.xMoDataRetention', { amount: 3 }),
      t('pricing.tiers.highStandardSec'),
    ],
  },
  {
    name: t('pricing.tiers.freelancer'),
    planCode: 'freelancer',
    priceMonthly: 15,
    includedFeatures: [
      t('pricing.tiers.evXPlanIncl', { plan: t('pricing.tiers.hobby') }),
      t('pricing.tiers.xEvMo', { amount: '100k' }),
      t('pricing.tiers.upToXProjects', { amount: 20 }),
      // t('pricing.tiers.xMoDataRetention', { amount: 12 }),
      t('pricing.tiers.smallBusiSupport'),
      t('pricing.tiers.carbonRemoval'),
    ],
    pid: 752316,
  },
  {
    name: t('pricing.tiers.startup'),
    planCode: 'startup',
    priceMonthly: 59,
    includedFeatures: [
      t('pricing.tiers.evXPlanIncl', { plan: t('pricing.tiers.freelancer') }),
      t('pricing.tiers.xEvMo', { amount: '500k' }),
      // t('pricing.tiers.xMoDataRetention', { amount: 12 }),
    ],
    pid: 752317,
  },
  {
    name: t('pricing.tiers.enterprise'),
    planCode: 'enterprise',
    priceMonthly: 110,
    includedFeatures: [
      t('pricing.tiers.evXPlanIncl', { plan: t('pricing.tiers.startup') }),
      t('pricing.tiers.xEvMo', { amount: '1m' }),
      t('pricing.tiers.upToXProjects', { amount: 30 }),
      // t('pricing.tiers.xMoDataRetention', { amount: 24 }),
    ],
    pid: 752318,
  },
]

const paddleLanguageMapping = {
  zh: 'zh-Hans',
  uk: 'ru',
}

const Pricing = ({ t, language }) => {
  const dispatch = useDispatch()
  const { authenticated, user } = useSelector(state => state.auth)
  const { theme } = useSelector(state => state.ui.theme)
  const { lastEvent } = useSelector(state => state.ui.misc.paddle)
  const [planCodeLoading, setPlanCodeLoading] = useState(null)
  const [downgradeTo, setDowngradeTo] = useState(null)
  const [showDowngradeModal, setShowDowngradeModal] = useState(false)
  const tiers = getTiers(t)

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

          dispatch(alertsActions.accountUpdated('The subscription has been upgraded.'))
        }, 1000)
        setPlanCodeLoading(null)
        setDowngradeTo(null)
      } else if (data.event === 'Checkout.Close') {
        setPlanCodeLoading(null)
        setDowngradeTo(null)
      }
    }

    lastEventHandler(lastEvent)
  }, [lastEvent, dispatch])

  const onPlanChange = (tier) => {
    if (planCodeLoading === null && user.planCode !== tier.planCode) {
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
          // frameTarget: 'checkout-container',
          // frameInitialHeight: 416,
          // frameStyle: 'width:100%; min-width:312px; background-color: transparent; border: none;',
          locale: paddleLanguageMapping[language] || language,
          displayModeTheme: theme,
        })
        return
      }

      window.Paddle.Checkout.open({
        product: tier.pid,
        email: user.email,
        passthrough: `{"uid": ${user.id}}`,
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
            {/* <div className='relative self-center mt-6 bg-gray-100 rounded-lg p-0.5 flex sm:mt-8'>
              <button
                type='button'
                className='relative w-1/2 bg-white border-gray-200 rounded-md shadow-sm py-2 text-sm font-medium text-gray-900 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:z-10 sm:w-auto sm:px-8'
              >
                Monthly billing
              </button>
              <button
                type='button'
                className='ml-0.5 relative w-1/2 border border-transparent rounded-md py-2 text-sm font-medium text-gray-700 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:z-10 sm:w-auto sm:px-8'
              >
                Yearly billing
              </button>
            </div> */}
          </div>
          <div className='mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-4'>
            {_map(tiers, (tier) => {
              const planCodeID = _findIndex(tiers, (el) => el.planCode === tier.planCode)
              const downgrade = planCodeID < userPlancodeID

              return (
                <div key={tier.name} className={cx('relative border rounded-lg shadow-sm divide-y divide-gray-200 dark:divide-gray-500', {
                  'border-indigo-400': user.planCode === tier.planCode,
                  'border-gray-200 dark:border-gray-500': user.planCode !== tier.planCode,
                })}>
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
                    <h2 className='text-lg leading-6 font-medium text-gray-900 dark:text-gray-50'>{tier.name}</h2>
                    <p className='mt-4'>
                      {tier.planCode === 'free' ? (
                        <span className='text-4xl font-extrabold text-gray-900 dark:text-gray-50'>
                          {t('pricing.free')}
                        </span>
                      ) : (
                        <>
                          <span className='text-4xl font-extrabold text-gray-900 dark:text-gray-50'>
                            ${tier.priceMonthly}
                          </span>
                          &nbsp;
                          <span className='text-base font-medium text-gray-500 dark:text-gray-400'>
                            /
                            {t('pricing.perMonth')}
                          </span>
                        </>
                      )}
                    </p>
                    {authenticated ? (
                      <span
                        onClick={() => downgrade ? downgradeHandler(tier) : onPlanChange(tier)}
                        className={cx('inline-flex items-center justify-center mt-8 w-full rounded-md py-2 text-sm font-semibold text-white text-center select-none', {
                          'bg-indigo-600 hover:bg-indigo-700 cursor-pointer': planCodeLoading === null && tier.planCode !== user.planCode,
                          'bg-indigo-400 cursor-default': planCodeLoading !== null || tier.planCode === user.planCode,
                        })}
                      >
                        {planCodeLoading === tier.planCode && (
                          <Spin />
                        )}
                        {planCodeID > userPlancodeID ? t('pricing.upgrade') : downgrade ? t('pricing.downgrade') : t('pricing.yourPlan')}
                      </span>
                    ) : (
                      <Link
                        className='mt-8 block w-full bg-indigo-600 rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-indigo-700'
                        to={routes.signup}
                      >
                        {tier.planCode === 'free' ? t('common.getStarted') : t('pricing.upgrade')}
                      </Link>
                    )}
                  </div>
                  <div className='pt-6 pb-8 px-6'>
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
            })}
          </div>
        </div>
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
