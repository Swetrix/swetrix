import React, { memo, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { CheckIcon } from '@heroicons/react/solid'
import _map from 'lodash/map'
import _isNil from 'lodash/isNil'
import _isString from 'lodash/isString'
import _isEmpty from 'lodash/isEmpty'
import _findIndex from 'lodash/findIndex'
import cx from 'classnames'

import Spin from '../../ui/icons/Spin'
import { errorsActions } from 'redux/actions/errors'
import { alertsActions } from 'redux/actions/alerts'
import { authActions } from 'redux/actions/auth'
import { upgradePlan, authMe } from 'api'
import routes from 'routes'

const getTiers = (t) => [
  {
    name: t('pricing.tiers.hobby'),
    planCode: 'free',
    priceMonthly: null,
    includedFeatures: [
      t('pricing.tiers.upToXEVMo', { amount: 3000 }),
      t('pricing.tiers.upToXProjects', { amount: 5 }),
      t('pricing.tiers.xMoDataRetention', { amount: 3 }),
      t('pricing.tiers.highStandardSec'),
    ],
  },
  {
    name: t('pricing.tiers.freelancer'),
    planCode: 'freelancer',
    priceMonthly: 24,
    includedFeatures: [
      t('pricing.tiers.evXPlanIncl', { plan: t('pricing.tiers.hobby') }),
      t('pricing.tiers.xEvMo', { amount: '100k' }),
      t('pricing.tiers.upToXProjects', { amount: 10 }),
      t('pricing.tiers.xMoDataRetention', { amount: 12 }),
      t('pricing.tiers.smallBusiSupport'),
      t('pricing.tiers.carbonRemoval'),
    ],
  },
  {
    name: t('pricing.tiers.startup'),
    planCode: 'startup',
    priceMonthly: 72,
    includedFeatures: [
      t('pricing.tiers.evXPlanIncl', { plan: t('pricing.tiers.freelancer') }),
      t('pricing.tiers.xEvMo', { amount: '500k' }),
      t('pricing.tiers.xMoDataRetention', { amount: 12 }),
    ],
  },
  {
    name: t('pricing.tiers.enterprise'),
    planCode: 'enterprise',
    priceMonthly: 110,
    includedFeatures: [
      t('pricing.tiers.evXPlanIncl', { plan: t('pricing.tiers.startup') }),
      t('pricing.tiers.xEvMo', { amount: '1m' }),
      t('pricing.tiers.xMoDataRetention', { amount: 24 }),
    ],
  },
]

const Pricing = ({ t }) => {
  const dispatch = useDispatch()
  const { authenticated, user } = useSelector(state => state.auth)
  const [planCodeLoading, setPlanCodeLoading] = useState(null)
  const tiers = getTiers(t)

  const onPlanChange = async (planCode) => {
    if (planCodeLoading === null && user.planCode !== planCode) {
      setPlanCodeLoading(planCode)
      try {
        const { data: { url, message } } = await upgradePlan(planCode)

        if (_isString(message)) {
          try {
            const me = await authMe()
  
            dispatch(authActions.loginSuccess(me))
            dispatch(authActions.finishLoading())
          } catch (e) {
            dispatch(authActions.logout())
          }

          dispatch(alertsActions.accountUpdated(message))
        }
        if (!_isEmpty(url)) {
          window.location.href = url
        }
      } catch ({ message }) {
        if (_isString(message)) {
          dispatch(errorsActions.genericError(message))
        }
      } finally {
        setPlanCodeLoading(null)
      }
    }
  }

  const userPlancodeID = _findIndex(tiers, (el) => el.planCode === user.planCode)

  return (
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

            return (
              <div key={tier.name} className={cx('relative border rounded-lg shadow-sm divide-y divide-gray-200', {
                'border-indigo-400': user.planCode === tier.planCode,
                'border-gray-200': user.planCode !== tier.planCode,
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
                <div className='p-6'>
                  <h2 className='text-lg leading-6 font-medium text-gray-900 dark:text-gray-50'>{tier.name}</h2>
                  <p className='mt-4'>
                    {_isNil(tier.priceMonthly) ? (
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
                  {_isNil(tier.priceMonthly) ? (
                    authenticated ? (
                      <span
                        onClick={() => onPlanChange(tier.planCode)}
                        className={cx('inline-flex items-center justify-center mt-8 w-full rounded-md py-2 text-sm font-semibold text-white text-center cursor-pointer select-none', {
                          'bg-indigo-600 hover:bg-indigo-700': planCodeLoading === null && tier.planCode !== user.planCode,
                          'bg-indigo-400 cursor-default': planCodeLoading !== null || tier.planCode === user.planCode,
                        })}
                      >
                        {planCodeLoading === tier.planCode && (
                          <Spin />
                        )}
                        {tier.planCode === user.planCode ? t('pricing.yourPlan') : t('pricing.downgrade')}
                      </span>
                    ) : (
                      <Link
                        className='inline-flex items-center justify-center mt-8 w-full rounded-md py-2 text-sm font-semibold text-white text-center cursor-pointer select-none bg-indigo-600 hover:bg-indigo-700'
                        to={routes.signup}
                      >
                        {t('common.getStarted')}
                      </Link>
                    )
                  ) : authenticated ? (
                    <span
                      onClick={() => onPlanChange(tier.planCode)}
                      className={cx('inline-flex items-center justify-center mt-8 w-full rounded-md py-2 text-sm font-semibold text-white text-center cursor-pointer select-none', {
                        'bg-indigo-600 hover:bg-indigo-700': planCodeLoading === null && tier.planCode !== user.planCode,
                        'bg-indigo-400 cursor-default': planCodeLoading !== null || tier.planCode === user.planCode,
                      })}
                    >
                      {planCodeLoading === tier.planCode && (
                        <Spin />
                      )}
                      {planCodeID > userPlancodeID ? t('pricing.upgrade') : planCodeID < userPlancodeID ? t('pricing.downgrade') : t('pricing.yourPlan')}
                    </span>
                  ) : (
                    <Link
                      className='mt-8 block w-full bg-indigo-600 rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-indigo-700'
                      to={routes.signup}
                    >
                      {t('pricing.upgrade')}
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
  )
}

export default memo(Pricing)
