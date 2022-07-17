import React, { memo, useState } from 'react'
import cx from 'clsx'
import { Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { useSelector } from 'react-redux'
import { ExternalLinkIcon, ArrowSmRightIcon, CheckCircleIcon } from '@heroicons/react/solid'
import _map from 'lodash/map'

import routes from 'routes'
// import { nFormatter } from 'utils/generic'
import { CONTACT_EMAIL } from 'redux/constants'
import Title from 'components/Title'
import Button from 'ui/Button'
import { withAuthentication, auth } from '../../hoc/protected'
import SignUp from '../Auth/Signup/BasicSignup'
import Pricing from './Pricing'

import './NewMainPage.css'

const LIVE_DEMO_URL = '/projects/STEzHcB1rALV'

const FAQs = ({ t }) => (
  <div id='faqs' className='bg-gray-50 dark:bg-gray-800'>
    <div className='w-11/12 mx-auto py-16 px-4 sm:px-6 lg:py-20 lg:px-8'>
      <div className='lg:grid lg:grid-cols-3 lg:gap-8'>
        <div>
          <h2 className='text-3xl font-extrabold text-gray-900 dark:text-gray-50'>
            {t('main.faq.title')}
          </h2>
          <p className='mt-4 text-lg text-gray-500 dark:text-gray-200'>
            <Trans
              t={t}
              i18nKey='main.custSupport'
              components={{
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                mail: <a href={`mailto:${CONTACT_EMAIL}`} className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400' />,
              }}
            />
          </p>
        </div>
        <div className='mt-12 lg:mt-0 lg:col-span-2'>
          <dl className='space-y-12'>
            {_map(t('main.faq.list', { returnObjects: true }), (faq) => (
              <div key={faq.question}>
                <dt className='text-lg leading-6 font-medium text-gray-900 dark:text-gray-50'>{faq.question}</dt>
                <dd className='mt-2 text-base text-gray-500 dark:text-gray-300 whitespace-pre-line'>{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  </div>
)

const Features = ({ t }) => (
  <div className='bg-white dark:bg-gray-800'>
    <div className='w-11/12 mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8'>
      <h2 className='text-3xl font-extrabold text-gray-900 dark:text-gray-50 text-center'>
        {t('main.whyUs')}
      </h2>
      <div className='mt-12'>
        <dl className='space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:grid-rows-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-3'>
          {_map(t('main.features', { returnObjects: true }), (feature) => (
            <div key={feature.name}>
              <dt className='text-lg leading-6 font-semibold text-gray-900 dark:text-gray-50'>{feature.name}</dt>
              <dd className='mt-2 text-base text-gray-500 dark:text-gray-300'>{feature.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  </div>
)

const Main = () => {
  const { t, i18n: { language } } = useTranslation('common')
  const { theme } = useSelector(state => state.ui.theme)
  // const stats = useSelector(state => state.ui.misc.stats)
  const [liveDemoHover, setLiveDemoHover] = useState(false)

  return (
    <Title title='Privacy Respecting Web Analytics Platform'>
      <div className='relative flex justify-center items-center bg-gray-900 py-2 px-2'>
        <a href='https://bank.gov.ua/en/news/all/natsionalniy-bank-vidkriv-spetsrahunok-dlya-zboru-koshtiv-na-potrebi-armiyi' target='_blank' rel='noreferrer noopener' className='text-white border-gray-900 border-b-2 hover:border-white text-center'>
          {t('main.ukrSupport')}
        </a>
        <ExternalLinkIcon className='h-4 w-4 text-white ml-1 hidden md:block' />
      </div>
      <div>
        <div className='bg-gray-800'>
          <main>
            <div className='relativ overflow-x-hidden'>
              <div
                className='relative pt-10 lg:pt-24 pb-5 xl:px-8 lg:px-6 sm:px-3 mx-auto min-h-[740px]'
                style={{
                  backgroundPosition: 'bottom',
                  backgroundRepeat: 'no-repeat',
                  backgroundImage: 'url(\'/assets/Elipse.png\')',
                }}
              >
                <div className='flex flex-row content-between 2xl:mr-[14vw] 2xl:justify-center justify-center lg:justify-start'>
                  <div className='lg:mt-0 text-left relative lg:mr-14 px-4'>
                    <h1 className='max-w-2xl text-4xl sm:text-5xl md:text-[4rem] font-extrabold text-white sm:leading-none lg:text-5xl xl:text-[4.1rem] xl:leading-[110%]'>
                      <span className='from-indigo-600 text-transparent bg-clip-text bg-gradient-to-r to-indigo-400'>Ultimate open-source</span>
                      <br />
                      <span className='from-indigo-600 text-transparent bg-clip-text bg-gradient-to-r to-indigo-400'>analytics</span>
                      {' '}
                      to satisfy all your needs.
                    </h1>
                    <p className='mt-3 text-base text-gray-300 sm:mt-[24px] sm:text-xl lg:text-lg xl:text-[1.1rem]'>
                      Swetrix brings an advanced and customisable analytics service
                      <br />
                      for your web applications.
                      <br />
                      {t('main.trackEveryMetric')}
                    </p>
                    <div className='mt-10 flex flex-col items-center sm:flex-row'>
                      <Link to={routes.signup} className='rounded-md border !duration-300 transition-all w-full max-w-[350px] sm:max-w-[210px] h-[50px] flex items-center justify-center sm:mr-6 shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 border-transparent'>
                        <span className='text-base font-semibold mr-1'>Start for free</span>
                        <ArrowSmRightIcon className='w-[20px] h-[16px] mt-[1px]' />
                      </Link>
                      <Link to={LIVE_DEMO_URL} className='rounded-md !duration-300 transition-all sm:mt-0 mt-2 !border-[#E6E8EC] border w-full max-w-[350px] sm:max-w-[210px] h-[50px] flex items-center justify-center shadow-sm text-white bg-transparent hover:bg-[#1a273b]'>
                        <span className='text-base font-semibold'>{t('common.liveDemo')}</span>
                      </Link>
                    </div>
                  </div>
                  <div className='max-w-md xl:max-w-lg hidden lg:block'>
                    <img className='rounded-xl border' style={{ height: '100%', minWidth: '880px' }} src='/assets/mainSectionDemo.png' width='100%' height='auto' alt='demo-main-section' />
                  </div>
                </div>
                <div className='my-10 block lg:hidden'>
                  <img className='rounded-xl border shadow-colored-2xl w-full' src='/assets/mainSectionDemo.png' alt='Swetrix analytics dashboard' width='100%' height='auto' />
                </div>
              </div>
            </div>

            <div className='bg-white px-4 pb-24'>
              <section className='flex pt-[86px] md:pt-[190px] flex-col-reverse md:flex-row items-center md:items-start md:justify-between max-w-[1300px] m-auto'>
                <img className='md:max-w-[450px] lg:max-w-full' src='/assets/section-demo-1.png' alt='Core Analytics Features' />
                <div className='max-w-[516px]'>
                  <h1 className='font-extrabold text-4xl text-[#293451]'>Core Analytics Features</h1>
                  <p className='mt-6 text-[#7D818C] mb-11'>
                    Powerful and easy analytic to display all main metrics that you need. Cookie less.
                    You don&apos;t need to be data scientist to understand
                    our analytic.
                  </p>
                  <Button className='text-[#4E46DD] !font-bold border-0'>
                    Traffic Insights
                    <ArrowSmRightIcon className='w-[20px] h-[16px] mt-[1px]' />
                  </Button>
                </div>
              </section>
              <section className='flex pt-[86px] md:pt-[190px] flex-col md:flex-row items-center md:items-start md:justify-between max-w-[1300px] m-auto'>
                <div className='max-w-[516px]'>
                  <h1 className='font-extrabold text-4xl text-[#293451]'>Marketplace & build-in Extensions</h1>
                  <p className='mt-6 text-[#7D818C] mb-3'>
                    Need additional features? Connect extensions or write your own! Now you do not need to use many sources from different systems - expand and supplement everything in one!
                  </p>
                  <p className='text-[#7D818C] mb-11'>
                    Install extensions and sell your own. Come up with a great extension for your company - great! Publish it on the marketplace and share your insights with the whole community.
                  </p>
                  <Button className='text-[#4E46DD] !font-bold border-0'>
                    Traffic Insights
                    <ArrowSmRightIcon className='w-[20px] h-[16px] mt-[1px]' />
                  </Button>
                </div>
                <img className='md:max-w-[450px] lg:max-w-full' src='/assets/section-demo-1.png' alt='Core Analytics Features' />
              </section>
              <section className='flex pt-[86px] md:pt-[190px] flex-col-reverse md:flex-row items-center md:items-start md:justify-between max-w-[1300px] m-auto'>
                <img className='md:max-w-[360px] lg:max-w-full' src='/assets/privacy-section.png' alt='Core Analytics Features' />
                <div className='max-w-[516px] w-full md:min-w-[370px] pb-16 md:pb-0'>
                  <h1 className='font-extrabold text-4xl text-[#293451]'>Privacy compliance.</h1>
                  <div className='mt-6 mb-4 flex items-center text-[16px]'>
                    <div className='mr-3'>
                      <CheckCircleIcon className='fill-[#FDBC64] w-[24px] h-[24px]' />
                    </div>
                    <p>
                      <span className=''>GDPR</span>
                      <span className='mr-1 ml-1'>-</span>
                      <span className='text-[#7D818C]'>data and processing based in EU zone.</span>
                    </p>
                  </div>
                  <div className='mb-4 flex items-center'>
                    <div className='mr-3'>
                      <CheckCircleIcon className='fill-[#FDBC64] w-[24px] h-[24px]' />
                    </div>
                    <p>
                      <span className=''>HIPAA</span>
                      <span className='mr-1 ml-1'>-</span>
                      <span className='text-[#7D818C]'>protect sensitive info.</span>
                    </p>
                  </div>
                  <div className='mb-4 flex items-center'>
                    <div className='mr-3'>
                      <CheckCircleIcon className='fill-[#FDBC64] w-[24px] h-[24px]' />
                    </div>
                    <p>
                      <span className=''>PCI DSS</span>
                      <span className='mr-1 ml-1'>-</span>
                      <span className='text-[#7D818C]'>payment data security.</span>
                    </p>
                  </div>
                  <div className='mb-10 flex items-center'>
                    <div className='mr-3'>
                      <CheckCircleIcon className='fill-[#FDBC64] w-[24px] h-[24px]' />
                    </div>
                    <p>
                      <span className=''>CCPA</span>
                      <span className='mr-1 ml-1'>-</span>
                      <span className='text-[#7D818C]'>control over the personal information.</span>
                    </p>
                  </div>
                  <Button className='text-[#4E46DD] !font-bold border-0'>
                    More about Data Protection
                    <ArrowSmRightIcon className='w-[20px] h-[16px] mt-[1px]' />
                  </Button>
                </div>
              </section>
            </div>
            <div className='overflow-hidden'>
              <div className='py-24 max-w-[1280px] w-full flex justify-between items-center mx-auto'>
                <div className='mt-16 sm:mt-24 lg:mt-0 lg:col-span-6'>
                  <div className='bg-white dark:bg-gray-700 sm:max-w-md sm:w-full sm:mx-auto sm:rounded-lg sm:overflow-hidden'>
                    <div className='px-4 py-8 sm:px-10'>
                      <p className='text-lg text-gray-900 dark:text-white text-center'>
                        {t('main.signup')}
                      </p>
                      <div className='mt-6'>
                        <SignUp />
                      </div>
                    </div>
                    <div className='px-4 py-6 bg-gray-50 dark:bg-gray-700 border-t-2 border-gray-200 dark:border-gray-500 sm:px-10'>
                      <p className='text-xs leading-5 text-gray-500 dark:text-gray-100'>
                        <Trans
                          t={t}
                          i18nKey='main.signupTerms'
                          components={{
                            tos: <Link to={routes.terms} className='font-medium text-gray-900 dark:text-gray-300 hover:underline' />,
                            pp: <Link to={routes.privacy} className='font-medium text-gray-900 dark:text-gray-300 hover:underline' />,
                          }}
                        />
                      </p>
                    </div>
                  </div>
                </div>
                <div className='relative'>
                  <div
                    className='absolute w-[446px] h-[558px] z-40 left-[10vw]'
                    style={{
                      background: 'linear-gradient(67.59deg, #408B9B 25.75%, #0B145F 61.14%)',
                      filter: 'blur(150px)',
                      transform: 'rotate(-50.32deg)',
                    }}
                  >
                    <p className='sr-only'>elipse gradient</p>
                  </div>
                  <img className='relative z-50' src='/assets/section-singup-image.png' alt='Swetrix core analytics' />
                </div>
              </div>
            </div>
            {/* Core features section */}
            <section className='bg-white pt-20 relative'>
              <h1 className='mx-auto text-[#293451] font-bold text-[45px] w-fit'>Core features</h1>
              <div className='mt-[60px] flex items-center max-w-[1300px] w-full mx-auto flex-wrap justify-center xl:justify-between'>
                <div className='w-[416px] h-[250px] px-7 py-11 text-center hover:shadow-2xl hover:rounded-xl duration-300 hover:-translate-y-2 transition-all ease-in cursor-pointer'>
                  <span className='text-[#FDBC64] text-3xl font-semibold'>1</span>
                  <div className='mt-2'>
                    <h2 className='text-[#293451] text-[20px] font-semibold max-w-[300px] mx-auto mb-3'>Measure website traffic with 99% of accuracy</h2>
                    <p className='text-gray-500 max-w-[320px] mx-auto'>The most accurate analytics solution to track all basic metrics and see the RIGHT data.</p>
                  </div>
                </div>
                <div className='w-[416px] h-[250px]  px-7 py-11 text-center hover:shadow-2xl hover:rounded-xl duration-300 hover:-translate-y-2 transition-all ease-in cursor-pointer'>
                  <span className='text-[#FDBC64] text-3xl font-semibold'>2</span>
                  <div className='mt-2'>
                    <h2 className='text-[#293451] text-[20px] font-semibold max-w-[300px] mx-auto mb-3'>Demo & Geo reports</h2>
                    <p className='text-gray-500 max-w-[303px] mx-auto'>Yes, it&apos;s standard. But keep track of exactly where your users are from as it is.</p>
                  </div>
                </div>
                <div className='w-[416px] h-[250px] px-7 py-11 text-center hover:shadow-2xl hover:rounded-xl duration-300 hover:-translate-y-2 transition-all ease-in cursor-pointer'>
                  <span className='text-[#FDBC64] text-3xl font-semibold'>3</span>
                  <div className='mt-2'>
                    <h2 className='text-[#293451] text-[20px] font-semibold max-w-[300px] mx-auto mb-3'>UTM & Reffers tracking</h2>
                    <p className='text-gray-500 max-w-[320px] mx-auto'>All traffic from your companies and websites will be shown without data loss.</p>
                  </div>
                </div>
                <div className='w-[416px] h-[250px] px-7 py-11 text-center hover:shadow-2xl hover:rounded-xl duration-300 hover:-translate-y-2 transition-all ease-in cursor-pointer'>
                  <span className='text-[#FDBC64] text-3xl font-semibold'>4</span>
                  <div className='mt-2'>
                    <h2 className='text-[#293451] text-[20px] font-semibold max-w-[300px] mx-auto mb-3'>Agile system</h2>
                    <p className='text-gray-500 max-w-[303px] mx-auto'>A flexible system of settings for the basic rules of use - such as session definition, traffic accounting, and so on, is easy to set up and customize.</p>
                  </div>
                </div>
                <div className='w-[416px] h-[250px] px-7 py-11 text-center hover:shadow-2xl hover:rounded-xl duration-300 hover:-translate-y-2 transition-all ease-in cursor-pointer'>
                  <span className='text-[#FDBC64] text-3xl font-semibold'>5</span>
                  <div className='mt-2'>
                    <h2 className='text-[#293451] text-[20px] font-semibold max-w-[300px] mx-auto mb-3'>
                      Custom events
                      <br />
                      (really easy to setup)
                    </h2>
                    <p className='text-gray-500 max-w-[303px] mx-auto'>User-friendly interface and ease of setting goals will help you measure the effectiveness of your website.</p>
                  </div>
                </div>
                <div className='w-[416px] h-[250px] px-7 py-11 text-center hover:shadow-2xl hover:rounded-xl duration-300 hover:-translate-y-2 transition-all ease-in cursor-pointer '>
                  <span className='text-[#FDBC64] text-3xl font-semibold'>6</span>
                  <div className='mt-2'>
                    <h2 className='text-[#293451] text-[20px] font-semibold max-w-[300px] mx-auto mb-3'>User flow</h2>
                    <p className='text-gray-500 max-w-[303px] mx-auto text-base'>Track how users get to your site and where they go. Study the behavior and patterns of your visitor.</p>
                  </div>
                </div>
              </div>
            </section>

          </main>
        </div>
        {/* form singup */}
        {/* <div className='mt-16 sm:mt-24 lg:mt-0 lg:col-span-6'>
                  <div className='bg-white dark:bg-gray-700 sm:max-w-md sm:w-full sm:mx-auto sm:rounded-lg sm:overflow-hidden'>
                    <div className='px-4 py-8 sm:px-10'>
                      <p className='text-lg text-gray-900 dark:text-white text-center'>
                        {t('main.signup')}
                      </p>
                      <div className='mt-6'>
                        <SignUp />
                      </div>
                    </div>
                    <div className='px-4 py-6 bg-gray-50 dark:bg-gray-700 border-t-2 border-gray-200 dark:border-gray-500 sm:px-10'>
                      <p className='text-xs leading-5 text-gray-500 dark:text-gray-100'>
                        <Trans
                          t={t}
                          i18nKey='main.signupTerms'
                          components={{
                            tos: <Link to={routes.terms} className='font-medium text-gray-900 dark:text-gray-300 hover:underline' />,
                            pp: <Link to={routes.privacy} className='font-medium text-gray-900 dark:text-gray-300 hover:underline' />,
                          }}
                        />
                      </p>
                    </div>
                  </div>
                </div> */}
        {/* live demo */}
        {/* <div className='relative'>
          <div className='absolute inset-0 flex flex-col' aria-hidden='true'>
            <div className='flex-1' />
            <div className='flex-1 w-full bg-white dark:bg-gray-800' />
          </div>
          <div className='w-11/12 mx-auto relative' onMouseEnter={() => setLiveDemoHover(true)} onMouseLeave={() => setLiveDemoHover(false)}>
            {theme === 'dark' ? (
              <img
                className={cx('relative rounded-md md:rounded-lg shadow-lg w-full transition-all', {
                  'brightness-75': liveDemoHover,
                })}
                src='/assets/screenshot_dark.png'
                alt=''
              />
            ) : (
              <img
                className={cx('relative rounded-md md:rounded-lg shadow-lg w-full transition-all', {
                  'brightness-75': liveDemoHover,
                })}
                src='/assets/screenshot_light.png'
                alt=''
              />
            )}
            {liveDemoHover && (
              <a
                href={LIVE_DEMO_URL}
                className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center whitespace-nowrap px-3 py-2 border border-transparent text-lg font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700'
                target='_blank'
                rel='noreferrer noopener'
              >
                {t('common.liveDemo')}
              </a>
            )}
          </div>
        </div> */}

        {/* <div className='py-6 overflow-hidden bg-gray-50 dark:bg-gray-700'>
          <div className='w-11/12 container mx-auto'>
            <h2 className='text-3xl font-extrabold text-gray-900 dark:text-gray-50 text-center'>
              {t('main.ourStats')}
            </h2>
            <p className='max-w-3xl mx-auto mt-3 text-xl text-center text-gray-500 dark:text-gray-200 sm:mt-4'>
              {t('main.statsDesc')}
            </p>
            <div className='pb-12 mt-10 bg-gray-50 dark:bg-gray-700 sm:pb-16'>
              <div className='relative w-full'>
                <div className='mx-auto'>
                  <dl className='bg-gray-50 dark:bg-gray-700 rounded-lg sm:grid sm:grid-cols-3'>
                    <div className='flex flex-col p-6 text-center border-b border-gray-100 sm:border-0 sm:border-r'>
                      <dt className='order-2 mt-2 text-lg font-medium text-gray-500 dark:text-gray-100 leading-6'>
                        {t('main.users')}
                      </dt>
                      <dd className='order-1 text-5xl font-extrabold text-indigo-600 dark:text-indigo-500'>
                        {Number(stats.users).toLocaleString()}
                      </dd>
                    </div>
                    <div className='flex flex-col p-6 text-center border-t border-b border-gray-100 sm:border-0 sm:border-l sm:border-r'>
                      <dt className='order-2 mt-2 text-lg font-medium text-gray-500 dark:text-gray-100 leading-6'>
                        {t('main.websites')}
                      </dt>
                      <dd className='order-1 text-5xl font-extrabold text-indigo-600 dark:text-indigo-500'>
                        {Number(stats.projects).toLocaleString()}
                      </dd>
                    </div>
                    <div className='flex flex-col p-6 text-center border-t border-gray-100 sm:border-0 sm:border-l'>
                      <dt className='order-2 mt-2 text-lg font-medium text-gray-500 dark:text-gray-100 leading-6'>
                        {t('main.pageviews')}
                      </dt>
                      <dd className='order-1 text-5xl font-extrabold text-indigo-600 dark:text-indigo-500'>
                        {nFormatter(Number(stats.pageviews), 1)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div> */}

        <Pricing t={t} language={language} />
        <FAQs t={t} />

        <div className='bg-white dark:bg-gray-750'>
          <div className='w-11/12 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:w-11/12 lg:px-8 lg:flex lg:items-center lg:justify-between'>
            <h2 className='text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50'>
              <span className='block'>
                {t('main.readyToStart')}
              </span>
              <span className='block bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-indigo-300 dark:to-indigo-500 bg-clip-text text-transparent'>
                {t('main.exploreService')}
              </span>
            </h2>
            <div className='mt-6 space-y-4 sm:space-y-0 sm:flex sm:space-x-5'>
              <Link
                to={routes.features}
                className='flex items-center justify-center whitespace-nowrap bg-gradient-to-r from-purple-600 to-indigo-600 bg-origin-border px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white hover:from-purple-700 hover:to-indigo-700'
              >
                {t('common.features')}
              </Link>
              <Link
                to={routes.signup}
                className='flex items-center justify-center whitespace-nowrap px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
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

export default memo(withAuthentication(Main, auth.notAuthenticated))
