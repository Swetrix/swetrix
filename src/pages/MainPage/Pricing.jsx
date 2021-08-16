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
import { upgradePlan } from 'api'
import routes from 'routes'

const tiers = [
  {
    name: 'Hobby',
    planCode: 'free',
    priceMonthly: null,
    includedFeatures: [
      'Up to 3000 events per month.',
      'Create up to 5 projects.',
      '3 months of data retention.',
      'High standard security.',
    ],
  },
  {
    name: 'Freelancer',
    planCode: 'freelancer',
    priceMonthly: 24,
    includedFeatures: [
      'Everything \'Hobby\' plan includes.',
      '100k events per month.',
      'Create up to 10 projects.',
      '12 months of data retention.',
      'By buying this in you are supporting a small business.',
      'Your subscription contributes to carbon removal.',
    ],
  },
  {
    name: 'Startup',
    planCode: 'startup',
    priceMonthly: 72,
    includedFeatures: [
      'Everything \'Freelancer\' plan includes.',
      '500k events per month.',
      '12 months of data retention.',
    ],
  },
  {
    name: 'Enterprise',
    planCode: 'enterprise',
    priceMonthly: 110,
    includedFeatures: [
      'Everything \'Startup\' plan includes.',
      '1m events per month.',
      '24 months of data retention.',
    ],
  },
]

const Pricing = () => {
  const dispatch = useDispatch()
  const { authenticated, user } = useSelector(state => state.auth)
  const [planCodeLoading, setPlanCodeLoading] = useState(null)

  const onPlanChange = async (planCode) => {
    if (planCodeLoading === null && user.planCode !== planCode) {
      setPlanCodeLoading(planCode)
      try {
        const { data: { url } } = await upgradePlan(planCode)

        if (_isEmpty(url)) {
          dispatch('Payment error: No Stripe URL was provided')
        } else {
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
    <div id='pricing' className={cx({ 'bg-white': !authenticated })}>
      <div className={cx('w-11/12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8', { 'py-24': !authenticated })}>
        <div className='sm:flex sm:flex-col sm:align-center'>
          {!authenticated && (
            <>
              <h1 className='text-3xl font-extrabold text-gray-900 sm:text-center'>Pricing Plans</h1>
              <p className='mt-5 text-xl text-gray-500 sm:text-center'>
                Start out for free, no credit card needed.<br />
                When your business grows, you can upgrade your plan at any time.
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
                        Current plan
                      </span>
                    </div>
                  </div>
                )}
                <div className='p-6'>
                  <h2 className='text-lg leading-6 font-medium text-gray-900'>{tier.name}</h2>
                  <p className='mt-4'>
                    {_isNil(tier.priceMonthly) ? (
                      <span className='text-4xl font-extrabold text-gray-900'>Free</span>
                    ) : (
                      <>
                        <span className='text-4xl font-extrabold text-gray-900'>${tier.priceMonthly}</span>{' '}
                        <span className='text-base font-medium text-gray-500'>/mo</span>
                      </>
                    )}
                  </p>
                  {_isNil(tier.priceMonthly) ? (
                    authenticated ? (
                      <span
                        className={cx('inline-flex items-center justify-center mt-8 w-full rounded-md py-2 text-sm font-semibold text-white text-center cursor-pointer select-none', {
                          'bg-indigo-600 hover:bg-indigo-700': planCodeLoading === null && tier.planCode !== user.planCode,
                          'bg-indigo-400': planCodeLoading !== null || tier.planCode === user.planCode,
                        })}
                      >
                        {planCodeLoading === tier.planCode && (
                          <Spin />
                        )}
                        {tier.planCode === user.planCode ? 'Your plan' : 'Downgrade'}
                      </span>
                    ) : (
                      <Link
                        className={cx('inline-flex items-center justify-center mt-8 w-full rounded-md py-2 text-sm font-semibold text-white text-center cursor-pointer select-none', {
                          'bg-indigo-600 hover:bg-indigo-700': planCodeLoading === null && tier.planCode !== user.planCode,
                          'bg-indigo-400': planCodeLoading !== null || tier.planCode === user.planCode,
                        })}
                        to={routes.signup}
                      >
                        Get started
                      </Link>
                    )
                  ) : authenticated ? (
                    <span
                      onClick={() => onPlanChange(tier.planCode)}
                      className={cx('inline-flex items-center justify-center mt-8 w-full rounded-md py-2 text-sm font-semibold text-white text-center cursor-pointer select-none', {
                        'bg-indigo-600 hover:bg-indigo-700': planCodeLoading === null,
                        'bg-indigo-400': planCodeLoading !== null,
                      })}
                    >
                      {planCodeLoading === tier.planCode && (
                        <Spin />
                      )}
                      {planCodeID > userPlancodeID ? 'Upgrade' : planCodeID < userPlancodeID ? 'Downgrade' : 'Your plan'}
                    </span>
                  ) : (
                    <Link
                      className='mt-8 block w-full bg-indigo-600 rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-indigo-700'
                      to={routes.signup}
                    >
                      Upgrade
                    </Link>
                  )}
                </div>
                <div className='pt-6 pb-8 px-6'>
                  <h3 className='text-xs font-medium text-gray-900 tracking-wide uppercase'>What's included</h3>
                  <ul className='mt-6 space-y-4'>
                    {_map(tier.includedFeatures, (feature) => (
                      <li key={feature} className='flex space-x-3'>
                        <CheckIcon className='flex-shrink-0 h-5 w-5 text-green-500' aria-hidden='true' />
                        <span className='text-sm text-gray-500'>{feature}</span>
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
