import React, { memo, useState } from 'react'
import cx from 'clsx'
import { Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { useSelector } from 'react-redux'
import { ExternalLinkIcon, ArrowSmRightIcon, CheckCircleIcon } from '@heroicons/react/solid'
import { CheckCircleIcon as CheckCircleIconOutline, CogIcon, ClockIcon } from '@heroicons/react/outline'
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
            {/* first block with live demo */}
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
              {/* section Core Analytics Features */}
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
              {/* section Marketplace & build-in Extensions */}
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
              {/* section Privacy compliance. */}
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
            {/*  block singup */}
            <div className='overflow-hidden'>
              <div className='py-24 max-w-[1280px] w-full flex justify-center md:justify-between items-center mx-auto px-5'>
                <div className='relative z-50 lg:col-span-6 rounded-xl'>
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
                  />
                  <img className='relative z-50 hidden md:block' src='/assets/section-singup-image.png' alt='Swetrix core analytics' />
                </div>
              </div>
            </div>
            {/* Core features section */}
            <section className='bg-white pt-20 relative pb-14'>
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
            <section className='bg-white pt-24 sm:px-5 px-3 relative pb-28'>
              <h1 className='mx-auto text-[#293451] font-bold text-[30px] sm:text-[45px] w-fit text-center'>Support all popular platforms</h1>
              <div className='mt-20 grid sm:grid-cols-4 md:grid-cols-6 grid-cols-3 gap-x-4 gap-y-10 justify-items-center items-center lg:gap-x-10 lg:gap-y-16 max-w-[1300px] w-full mx-auto justify-between'>
                <img src='/assets/supports/Slack.png' alt='Slack' />
                <img src='/assets/supports/NuxtJS.png' alt='NuxtJS' />
                <img src='/assets/supports/Webflow.png' alt='Webflow' />
                <img src='/assets/supports/next-js.png' alt='next-js' />
                <img src='/assets/supports/Notion.png' alt='Notion' />
                <img src='/assets/supports/react.png' alt='react' />
                <img src='/assets/supports/angular.png' alt='angular' />
                <img src='/assets/supports/WordPress.png' alt='WordPress' />
                <img src='/assets/supports/Wix.png' alt='Wix' />
                <img src='/assets/supports/ghost.png' alt='ghost' />
                <img src='/assets/supports/Gatsby.png' alt='Gatsby' />
                <img src='/assets/supports/Cloudflare.png' alt='Cloudflare' />
              </div>
            </section>
            <div className='overflow-hidden'>
              <div className='relative max-w-[1300px] w-full mx-auto'>
                <div
                  className='absolute w-[446px] h-[558px] z-10 left-[10vw] -top-[10vh]'
                  style={{
                    background: 'linear-gradient(67.59deg, #408B9B 25.75%, #0B145F 61.14%)',
                    filter: 'blur(200px)',
                    transform: 'rotate(-50.32deg)',
                  }}
                />
                <section className='relative z-20 px-3'>
                  <h1 className='mt-20 text-center text-[30px] sm:text-[45px] text-white font-extrabold max-w-[512px] w-full mx-auto'>Marketplace and extension features</h1>
                  <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-24 justify-between justify-items-center text-white pt-20 pb-36'>
                    <div className='max-w-[290px] w-full'>
                      <div className='flex items-center'>
                        <span className='text-[#E0E9FF] font-bold text-[26px] mr-6'>1</span>
                        <h2 className='font-semibold text-[20px]'>Аdditional features</h2>
                      </div>
                      <p className='pl-9 text-[#CECDD7]'>Browser, notifications and two-factor authentication</p>
                    </div>
                    <div className='max-w-[290px] w-full'>
                      <div className='flex items-center'>
                        <span className='text-[#E0E9FF] font-bold text-[26px] mr-6'>2</span>
                        <h2 className='font-semibold text-[20px]'>Open source code</h2>
                      </div>
                      <p className='pl-9 text-[#CECDD7]'>Browser, notifications and two-factor authentication</p>
                    </div>
                    <div className='max-w-[290px] w-full'>
                      <div className='flex items-center'>
                        <span className='text-[#E0E9FF] font-bold text-[26px] mr-6'>3</span>
                        <h2 className='font-semibold text-[20px]'>Marketplace</h2>
                      </div>
                      <p className='pl-9 text-[#CECDD7]'>Browser, notifications and two-factor authentication</p>
                    </div>
                    <div className='max-w-[290px] w-full'>
                      <div className='flex items-center'>
                        <span className='text-[#E0E9FF] font-bold text-[26px] mr-6'>4</span>
                        <h2 className='font-semibold text-[20px]'>Easy integration</h2>
                      </div>
                      <p className='pl-9 text-[#CECDD7]'>Browser, notifications and two-factor authentication</p>
                    </div>
                    <div className='max-w-[290px] w-full'>
                      <div className='flex items-center'>
                        <span className='text-[#E0E9FF] font-bold text-[26px] mr-6'>5</span>
                        <h2 className='font-semibold text-[20px]'>Solve your tasks, not create</h2>
                      </div>
                      <p className='pl-9 text-[#CECDD7]'>Browser, notifications and two-factor authentication</p>
                    </div>
                    <div className='max-w-[290px] w-full'>
                      <div className='flex items-center'>
                        <span className='text-[#E0E9FF] font-bold text-[26px] mr-6'>6</span>
                        <h2 className='font-semibold text-[20px]'>Share your best solutions</h2>
                      </div>
                      <p className='pl-9 text-[#CECDD7]'>Browser, notifications and two-factor authentication</p>
                    </div>
                  </div>
                </section>
                <div
                  className='absolute w-[446px] h-[558px] z-10 -left-[30vw] top-[80vh] sm:left-[70vw] sm:top-[30vh]'
                  style={{
                    background: 'linear-gradient(67.59deg, #408B9B 25.75%, #0B145F 61.14%)',
                    filter: 'blur(200px)',
                    transform: 'rotate(-50.32deg)',
                  }}
                />
              </div>
            </div>
            <Pricing t={t} language={language} />
            <section className='bg-white pt-20 pb-20'>
              <div className='max-w-[1000px] w-full mx-auto'>
                <h1 className='text-[#293451] text-center font-extrabold text-[45px]'>Testimonials</h1>
                <div className='flex items-center flex-col md:flex-row justify-between mt-16'>
                  <div
                    className='max-w-[310px] w-full'
                    style={{
                      boxShadow: '-22px -11px 40px rgba(0, 0, 0, 0.02), 3px -5px 16px rgba(0, 0, 0, 0.02), 17px 24px 20px rgba(0, 0, 0, 0.02)',
                      borderRadius: '100px 30px 30px 30px',
                    }}
                  >
                    <img className='mx-auto relative -top-4' src='/assets/Quote.png' alt='quote' />
                    <div className='px-14 mb-12'>
                      <p className='text-[#707482] text-[14px] mt-8'>Joe Massad</p>
                      <p className='text-[#212936] text-[18px] mt-2 leading-9'>
                        Start out for free, no credit card needed.
                        When your business grows, you can upgrade your plan at any time.
                      </p>
                    </div>
                  </div>
                  <div
                    className='max-w-[310px] w-full md:mx-4 mt-10 md:mt-0'
                    style={{
                      boxShadow: '-22px -11px 40px rgba(0, 0, 0, 0.02), 3px -5px 16px rgba(0, 0, 0, 0.02), 17px 24px 20px rgba(0, 0, 0, 0.02)',
                      borderRadius: '100px 30px 30px 30px',
                    }}
                  >
                    <img className='mx-auto relative -top-4' src='/assets/Quote-yellow.png' alt='quote' />
                    <div className='px-14 mb-12'>
                      <p className='text-[#707482] text-[14px] mt-8'>Joe Massad</p>
                      <p className='text-[#212936] text-[18px] mt-2 leading-9'>
                        Start out for free, no credit card needed.
                        When your business grows, you can upgrade your plan at any time.
                      </p>
                    </div>
                  </div>
                  <div
                    className='max-w-[310px] w-full mt-10 md:mt-0'
                    style={{
                      boxShadow: '-22px -11px 40px rgba(0, 0, 0, 0.02), 3px -5px 16px rgba(0, 0, 0, 0.02), 17px 24px 20px rgba(0, 0, 0, 0.02)',
                      borderRadius: '100px 30px 30px 30px',
                    }}
                  >
                    <img className='mx-auto relative -top-4' src='/assets/Quote.png' alt='quote' />
                    <div className='px-14 mb-12'>
                      <p className='text-[#707482] text-[14px] mt-8'>Joe Massad</p>
                      <p className='text-[#212936] text-[18px] mt-2 leading-9'>
                        Start out for free, no credit card needed.
                        When your business grows, you can upgrade your plan at any time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className='bg-white px-4 md:px-8'>
              <section className='max-w-[1300px] w-full mx-auto bg-[#212936] overflow-hidden lg:h-[450px]' style={{ borderRadius: '100px 30px 30px 30px' }}>
                <div className='flex items-start justify-between pt-8 pl-8 sm:pl-14 lg:pl-28 md:flex-row flex-col'>
                  <div className='max-w-[430px] w-full pt-[60px] pr-3 mb-16 md:mb-0'>
                    <h1 className='font-bold text-[24px] leading-9 sm:text-[36px] sm:leading-[48px] md:text-[28px] md:leading-10 lg:text-[36px] lg:leading-[48px] text-white mb-3'>
                      <span className='text-transparent bg-clip-text' style={{ background: 'linear-gradient(91.37deg, #4E46DD 10%, #5C3CDA 55%, #A274EF 100%)' }}>Open source</span>
                      {' '}
                      analytics - a powerful and simple tool.
                    </h1>
                    <p className='text-[#C8D1E2] mb-9 font-medium text-base sm:text-lg'>Yes, it&apos;s standard. But keep track of exactly where your users are from as it is.</p>
                    <Link to={routes.signup} className='rounded-md border !duration-300 transition-all w-full max-w-[210px] h-[50px] flex items-center justify-center sm:mr-6 shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 border-transparent'>
                      <span className='text-base font-semibold mr-1'>Start for free</span>
                      <ArrowSmRightIcon className='w-[20px] h-[16px] mt-[1px]' />
                    </Link>
                  </div>
                  <div className='max-w-md xl:max-w-lg block h-[450px]'>
                    <img className='rounded-xl border' style={{ minheight: '600px', minWidth: '880px' }} src='/assets/mainSectionDemo.png' width='100%' height='auto' alt='demo-main-section' />
                  </div>
                </div>
              </section>
            </div>

            <section className='bg-white px-4 md:px-8 pt-24 pb-32'>
              <h1 className='text-[#293451] text-[45px] font-extrabold text-center'>Checklist</h1>
              <div className='flex flex-col lg:flex-row items-center justify-between max-w-[1080px] w-full mx-auto mt-16'>
                <div
                  className='max-w-[310px] w-full mx-auto shadow-lg overflow-hidden'
                  style={{ borderRadius: '20px 10px 10px 10px' }}
                >
                  <div className='flex items-center justify-between pl-[43px] pr-[26px] bg-[#FDBC64] py-4'>
                    <h2 className='text-[20px] text-white font-semibold'>Done</h2>
                    <CheckCircleIconOutline className='w-[26px] h-[26px] text-white' />
                  </div>
                  <div className='mt-14 px-11 pb-12'>
                    <p className='text-[#707482] text-xs flex items-center mb-3'>
                      <CheckCircleIconOutline className='w-[18px] h-[18px] text-[#FDBC64] mr-2' />
                      {' '}
                      Up to 5,000 visits per month.
                    </p>
                    <p className='text-[#707482] text-xs flex items-center mb-3'>
                      <CheckCircleIconOutline className='w-[18px] h-[18px] text-[#FDBC64] mr-2' />
                      {' '}
                      Add up to 10 websites.
                    </p>
                    <p className='text-[#707482] text-xs flex items-center mb-3'>
                      <CheckCircleIconOutline className='w-[18px] h-[18px] text-[#FDBC64] mr-2' />
                      {' '}
                      Unlimited data exports.
                    </p>
                    <p className='text-[#707482] text-xs flex items-center mb-3'>
                      <CheckCircleIconOutline className='w-[18px] h-[18px] text-[#FDBC64] mr-2' />
                      {' '}
                      100% data ownership.
                    </p>
                    <p className='text-[#707482] text-xs flex items-center mb-3'>
                      <CheckCircleIconOutline className='w-[18px] h-[18px] text-[#FDBC64] mr-2' />
                      {' '}
                      No cookie banners required.
                    </p>
                    <p className='text-[#707482] text-xs flex items-center mb-3'>
                      <CheckCircleIconOutline className='w-[18px] h-[18px] text-[#FDBC64] mr-2' />
                      {' '}
                      Shared & Public Dashboards.
                    </p>
                    <p className='text-[#707482] text-xs flex items-center'>
                      <CheckCircleIconOutline className='w-[18px] h-[18px] text-[#FDBC64] mr-2' />
                      {' '}
                      Email reports.
                    </p>
                  </div>
                </div>
                <div
                  className='max-w-[310px] w-full mx-auto shadow-lg overflow-hidden my-[38px] lg:my-0'
                  style={{ borderRadius: '20px 10px 10px 10px' }}
                >
                  <div className='flex items-center justify-between pl-[43px] pr-[26px] bg-[#9970E7] py-4'>
                    <h2 className='text-[20px] text-white font-semibold'>In progress</h2>
                    <CogIcon alt='Swetrix settings icon' className='w-[26px] h-[26px] text-white' />
                  </div>
                  <div className='mt-14 px-11 pb-12'>
                    <p className='text-[#707482] text-xs flex items-center mb-3'>
                      <CogIcon className='w-[18px] h-[18px] text-[#9970E7] mr-2' />
                      {' '}
                      Up to 5,000 visits per month.
                    </p>
                    <p className='text-[#707482] text-xs flex items-center mb-3'>
                      <CogIcon className='w-[18px] h-[18px] text-[#9970E7] mr-2' />
                      {' '}
                      Add up to 10 websites.
                    </p>
                    <p className='text-[#707482] text-xs flex items-center mb-3'>
                      <CogIcon className='w-[18px] h-[18px] text-[#9970E7] mr-2' />
                      {' '}
                      Unlimited data exports.
                    </p>
                    <p className='text-[#707482] text-xs flex items-center mb-3'>
                      <CogIcon className='w-[18px] h-[18px] text-[#9970E7] mr-2' />
                      {' '}
                      100% data ownership.
                    </p>
                    <p className='text-[#707482] text-xs flex items-center mb-3'>
                      <CogIcon className='w-[18px] h-[18px] text-[#9970E7] mr-2' />
                      {' '}
                      No cookie banners required.
                    </p>
                    <p className='text-[#707482] text-xs flex items-center mb-3'>
                      <CogIcon className='w-[18px] h-[18px] text-[#9970E7] mr-2' />
                      {' '}
                      Shared & Public Dashboards.
                    </p>
                    <p className='text-[#707482] text-xs flex items-center'>
                      <CogIcon className='w-[18px] h-[18px] text-[#9970E7] mr-2' />
                      {' '}
                      Email reports.
                    </p>
                  </div>
                </div>
                <div
                  className='max-w-[310px] w-full mx-auto shadow-lg overflow-hidden'
                  style={{ borderRadius: '20px 10px 10px 10px' }}
                >
                  <div className='flex items-center justify-between pl-[43px] pr-[26px] bg-[#212936] py-4'>
                    <h2 className='text-[20px] text-white font-semibold'>Plans</h2>
                    <ClockIcon className='w-[26px] h-[26px] text-white' />
                  </div>
                  <div className='mt-14 px-11 pb-12'>
                    <p className='text-[#707482] text-xs flex items-center mb-3'>
                      <ClockIcon className='w-[18px] h-[18px] text-[#212936] mr-2' />
                      {' '}
                      Up to 5,000 visits per month.
                    </p>
                    <p className='text-[#707482] text-xs flex items-center mb-3'>
                      <ClockIcon className='w-[18px] h-[18px] text-[#212936] mr-2' />
                      {' '}
                      Add up to 10 websites.
                    </p>
                    <p className='text-[#707482] text-xs flex items-center mb-3'>
                      <ClockIcon className='w-[18px] h-[18px] text-[#212936] mr-2' />
                      {' '}
                      Unlimited data exports.
                    </p>
                    <p className='text-[#707482] text-xs flex items-center mb-3'>
                      <ClockIcon className='w-[18px] h-[18px] text-[#212936] mr-2' />
                      {' '}
                      100% data ownership.
                    </p>
                    <p className='text-[#707482] text-xs flex items-center mb-3'>
                      <ClockIcon className='w-[18px] h-[18px] text-[#212936] mr-2' />
                      {' '}
                      No cookie banners required.
                    </p>
                    <p className='text-[#707482] text-xs flex items-center mb-3'>
                      <ClockIcon className='w-[18px] h-[18px] text-[#212936] mr-2' />
                      {' '}
                      Shared & Public Dashboards.
                    </p>
                    <p className='text-[#707482] text-xs flex items-center'>
                      <ClockIcon className='w-[18px] h-[18px] text-[#212936] mr-2' />
                      {' '}
                      Email reports.
                    </p>
                  </div>
                </div>
              </div>
            </section>
            <section className='flex items-center lg:flex-row flex-col-reverse justify-between max-w-[1300px] w-full mx-auto py-20 lg:py-32 px-5'>
              <img src='/assets/openSource.png' alt='Swetrix open source' />
              <div className='max-w-[516px] w-full lg:ml-5'>
                <h1 className='text-[30px] md:text-[38px] text-white font-extrabold'>Adventages of using Open source + link to github</h1>
                <hr className='border-[#535151] border-1 max-w-[346px] my-6' />
                <div className='max-w-[438px] w-full lg:mb-0 mb-9'>
                  <p className='text-[#CECDD7] text-sm leading-6 flex items-center mb-3'>
                    <span>
                      <CheckCircleIcon className='w-[24px] h-[24px] text-[#FDBC64] mr-[14px]' />
                    </span>
                    {' '}
                    Install analytics on your own servers - the source code is available to everyone.
                  </p>
                  <p className='text-[#CECDD7] text-sm leading-6 flex items-center mb-3'>
                    <span>
                      <CheckCircleIcon className='w-[24px] h-[24px] text-[#FDBC64] mr-[14px]' />
                    </span>
                    {' '}
                    Find bugs and suggest improvements - the community will be grateful to you.
                  </p>
                  <p className='text-[#CECDD7] text-sm leading-6 flex items-center mb-3'>
                    <span>
                      <CheckCircleIcon className='w-[24px] h-[24px] text-[#FDBC64] mr-[14px]' />
                    </span>
                    {' '}
                    Your data is protected, all errors and features are implemented in a matter of days by our developers.
                  </p>
                </div>
              </div>
            </section>
            <section className='bg-white pt-20 pb-44'>
              <div className='max-w-[1080px] w-full mx-auto'>
                <div className='max-w-[400px] w-full mx-auto'>
                  <h1 className='text-[#170F49] text-[38px] font-extrabold text-center'>Become a developer</h1>
                  <p className='text-[#7D818C] text-base font-medium text-center'>Write your extensions, follow the news and join our developer community.</p>
                </div>
                <div className='flex items-center justify-between mt-32'>
                  <div>
                    <p className='text-[#4E46DD] text-[50px] font-extrabold text-center'>
                      99
                      <span className='text-[#170F49]'>k+</span>
                    </p>
                    <p className='text-[#6F6C90] text-[18px]'>Developer community</p>
                  </div>
                  <div className='bg-[#212936] w-2 h-2 rounded-full mx-5' />
                  <div>
                    <p className='text-[#4E46DD] text-[50px] font-extrabold text-center'>
                      99
                      <span className='text-[#170F49]'>k+</span>
                    </p>
                    <p className='text-[#6F6C90] text-[18px]'>Developer community</p>
                  </div>
                  <div className='bg-[#212936] w-2 h-2 rounded-full mx-5' />
                  <div>
                    <p className='text-[#4E46DD] text-[50px] font-extrabold text-center'>
                      99
                      <span className='text-[#170F49]'>k+</span>
                    </p>
                    <p className='text-[#6F6C90] text-[18px]'>Developer community</p>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
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
      </div>
    </Title>
  )
}

export default memo(withAuthentication(Main, auth.notAuthenticated))
