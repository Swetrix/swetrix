/* eslint-disable jsx-a11y/anchor-has-content */
import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import _map from 'lodash/map'

import routes from 'routes'
import { notAuthenticated } from '../../hoc/protected'
import Title from 'components/Title'
import SignUp from '../Auth/Signup/BasicSignup'
import Pricing from './Pricing'

const LIVE_DEMO_URL = '/projects/STEzHcB1rALV'

const SquareDots = ({ className }) => (
  <div className='hidden lg:block lg:absolute lg:inset-0 pointer-events-none' aria-hidden='true'>
    <svg
      className={className}
      width={364}
      height={384}
      viewBox='0 0 364 384'
      fill='none'
    >
      <defs>
        <pattern
          id='eab71dd9-9d7a-47bd-8044-256344ee00d0'
          x={0}
          y={0}
          width={20}
          height={20}
          patternUnits='userSpaceOnUse'
        >
          <rect x={0} y={0} width={4} height={4} fill='currentColor' />
        </pattern>
      </defs>
      <rect width={364} height={384} fill='url(#eab71dd9-9d7a-47bd-8044-256344ee00d0)' />
    </svg>
  </div>
)

const FAQs = ({ t }) => (
  <div id='faqs' className='bg-gray-50'>
    <div className='w-11/12 mx-auto py-16 px-4 sm:px-6 lg:py-20 lg:px-8'>
      <div className='lg:grid lg:grid-cols-3 lg:gap-8'>
        <div>
          <h2 className='text-3xl font-extrabold text-gray-900'>
            {t('main.faq.title')}
          </h2>
          <p className='mt-4 text-lg text-gray-500'>
            <Trans
              t={t}
              i18nKey='main.custSupport'
              components={{
                mail: <a href='mailto:contact@swetrix.com' className='font-medium text-indigo-600 hover:text-indigo-500' />,
              }}
            />
          </p>
        </div>
        <div className='mt-12 lg:mt-0 lg:col-span-2'>
          <dl className='space-y-12'>
          {_map(t('main.faq.list', { returnObjects: true }), (faq) => (
            <div key={faq.question}>
              <dt className='text-lg leading-6 font-medium text-gray-900'>{faq.question}</dt>
              <dd className='mt-2 text-base text-gray-500 whitespace-pre-line'>{faq.answer}</dd>
            </div>
          ))}
          </dl>
        </div>
      </div>
    </div>
  </div>
)

const Features = ({ t }) => (
  <div className='bg-white'>
    <div className='w-11/12 mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8'>
      <h2 className='text-3xl font-extrabold text-gray-900 text-center'>
        {t('main.whyUs')}
      </h2>
      <div className='mt-12'>
        <dl className='space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:grid-rows-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-3'>
          {_map(t('main.features', { returnObjects: true }), (feature) => (
            <div key={feature.name}>
              <dt className='text-lg leading-6 font-semibold text-gray-900'>{feature.name}</dt>
              <dd className='mt-2 text-base text-gray-500'>{feature.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  </div>
)

const Main = () => {
  const { t } = useTranslation('common')

  return (
    <Title title='Privacy Respecting Web Analytics Platform'>
      <div className='relative bg-gray-800'>
        <SquareDots className='absolute bottom-0 left-0 transform translate-x-0 mb-0 text-gray-700 lg:top-0 xl:transform-none lg:mt-72' />
        <SquareDots className='absolute bottom-0 right-0 transform translate-x-0 mb-48 text-gray-700 lg:top-0 lg:mb-0 xl:transform-none lg:mt-16' />
        <div className='relative pt-6 pb-16 sm:pb-24'>
          <main className='mt-8 sm:mt-24'>
            <div className='mx-auto w-11/12'>
              <div className='lg:grid lg:grid-cols-12 lg:gap-8'>
                <div className='px-4 sm:px-6 sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left lg:flex lg:items-center'>
                  <div>
                    <h1 className='mt-4 text-4xl tracking-tight font-extrabold text-white sm:mt-5 sm:leading-none lg:mt-6 lg:text-5xl xl:text-6xl'>
                      <Trans
                        t={t}
                        i18nKey='main.slogan'
                        components={{
                          span: <span className='text-indigo-400' />,
                        }}
                      />
                    </h1>
                    <p className='mt-3 text-base text-gray-300 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl'>
                      {t('main.description')}
                      <br />
                      {t('main.trackEveryMetric')}
                    </p>
                  </div>
                </div>
                <div className='mt-16 sm:mt-24 lg:mt-0 lg:col-span-6'>
                  <div className='bg-white sm:max-w-md sm:w-full sm:mx-auto sm:rounded-lg sm:overflow-hidden'>
                    <div className='px-4 py-8 sm:px-10'>
                      <p className='text-lg text-gray-900 text-center'>
                        {t('main.signup')}
                      </p>
                      <div className='mt-6'>
                        <SignUp />
                      </div>
                    </div>
                    <div className='px-4 py-6 bg-gray-50 border-t-2 border-gray-200 sm:px-10'>
                      <p className='text-xs leading-5 text-gray-500'>
                        <Trans
                          t={t}
                          i18nKey='main.signupTerms'
                          components={{
                            tos: <Link to={routes.terms} className='font-medium text-gray-900 hover:underline' />,
                            pp: <Link to={routes.privacy} className='font-medium text-gray-900 hover:underline' />,
                          }}
                        />
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>

        <div className='relative'>
          <div className='absolute inset-0 flex flex-col' aria-hidden='true'>
            <div className='flex-1' />
            <div className='flex-1 w-full bg-white' />
          </div>
          <div className='w-11/12 mx-auto'>
            <img className='relative rounded-md md:rounded-lg shadow-lg' src='/assets/screenshot.png' alt='' />
          </div>
        </div>

        <Features t={t} />
        <div className='bg-indigo-600'>
          <div className='w-11/12 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 lg:flex lg:items-center lg:justify-between'>
            <h2 className='text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900'>
              <span className='block text-white'>
                {t('main.description')}
              </span>
              <span className='block text-gray-300'>
                {t('main.lookAtDocs')}
              </span>
            </h2>
            <div className='mt-6 space-y-4 sm:space-y-0 sm:flex sm:space-x-5'>
              <Link
                to={LIVE_DEMO_URL}
                className='flex items-center justify-center px-3 py-2 border border-transparent text-lg font-medium rounded-md shadow-sm text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
              >
                {t('common.liveDemo')}
              </Link>
              <Link
                to={routes.docs}
                className='flex items-center justify-center px-3 py-2 border border-transparent text-lg font-medium rounded-md shadow-sm text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
              >
                {t('common.docs')}
              </Link>
            </div>
          </div>
        </div>
        <Pricing t={t} />
        <FAQs t={t} />

        <div className='bg-white'>
          <div className='w-11/12 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:w-11/12 lg:px-8 lg:flex lg:items-center lg:justify-between'>
            <h2 className='text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900'>
              <span className='block'>
                {t('main.readyToStart')}
              </span>
              <span className='block bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent'>
                {t('main.exploreService')}
              </span>
            </h2>
            <div className='mt-6 space-y-4 sm:space-y-0 sm:flex sm:space-x-5'>
              <Link
                to={routes.features}
                className='flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600 bg-origin-border px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white hover:from-purple-700 hover:to-indigo-700'
              >
                {t('common.features')}
              </Link>
              <Link
                to={routes.signup}
                className='flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
              >
                {t('common.getStarted')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Title>
  )
}

export default notAuthenticated(Main)
