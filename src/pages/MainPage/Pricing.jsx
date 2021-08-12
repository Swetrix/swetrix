import React from 'react'
import { Link } from 'react-router-dom'
import { CheckIcon } from '@heroicons/react/solid'
import _map from 'lodash/map'
import _isNil from 'lodash/isNil'

import routes from 'routes'

const tiers = [
  {
    name: 'Hobby',
    priceMonthly: null,
    includedFeatures: [
      'Up to 3000 events per month.',
      'Create up to 5 projects.',
      '1 month of data retention.',
      'High standard security.',
    ],
  },
  {
    name: 'Freelancer',
    href: '#',
    priceMonthly: 24,
    includedFeatures: [
      'Everything \'Hobby\' plan includes.',
      '100k events per month.',
      'Create up to 10 projects.',
      '12 months of data retention.',
      'By buying this in you are supporting a small business.',
    ],
  },
  {
    name: 'Startup',
    href: '#',
    priceMonthly: 32,
    includedFeatures: [
      'Everything \'Freelancer\' plan includes.',
      '500k events per month.',
      '12 months of data retention.',
    ],
  },
  {
    name: 'Enterprise',
    href: '#',
    priceMonthly: 48,
    includedFeatures: [
      'Everything \'Startup\' plan includes.',
      '1m events per month.',
      '24 months of data retention.',
    ],
  },
]

const Pricing = () => (
  <div id='pricing' className='bg-white'>
    <div className='w-11/12 max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8'>
      <div className='sm:flex sm:flex-col sm:align-center'>
        <h1 className='text-3xl font-extrabold text-gray-900 sm:text-center'>Pricing Plans</h1>
        <p className='mt-5 text-xl text-gray-500 sm:text-center'>
          Start out for free, no credit card needed.<br />
          When your business grows, you can upgrade your plan at any time.
        </p>
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
        {_map(tiers, (tier) => (
          <div key={tier.name} className='border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200'>
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
                <Link
                  className='mt-8 block w-full bg-indigo-600 rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-indigo-700'
                  to={routes.signup}
                >
                  Get started
                </Link>
              ) : (
                <a
                  href={tier.href}
                  className='mt-8 block w-full bg-indigo-600 rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-indigo-700'
                >
                  Buy {tier.name}
                </a>
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
        ))}
      </div>
    </div>
  </div>
)

export default Pricing
