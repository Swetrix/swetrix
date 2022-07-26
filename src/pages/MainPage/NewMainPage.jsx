import React, { memo } from 'react'
import { Link, useHistory } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { useSelector } from 'react-redux'
import { ExternalLinkIcon, ArrowSmRightIcon, CheckCircleIcon } from '@heroicons/react/solid'
import { CheckCircleIcon as CheckCircleIconOutline, CogIcon, ClockIcon } from '@heroicons/react/outline'
import _map from 'lodash/map'

import routes from 'routes'
import { nFormatterSeparated } from 'utils/generic'
import Title from 'components/Title'
import Button from 'ui/Button'
import { GITHUB_URL } from 'redux/constants'
import BackgroundSvg from 'ui/icons/BackgroundSvg'
import Webflow from 'ui/icons/Webflow'
import NextJS from 'ui/icons/NextJS'
import NuxtJS from 'ui/icons/NuxtJS'
import Quote from 'ui/icons/Quote'
import Slack from 'ui/icons/Slack'
import Wordpress from 'ui/icons/Wordpress'
import Cloudflare from 'ui/icons/Cloudflare'
import Notion from 'ui/icons/Notion'
import Ghost from 'ui/icons/Ghost'
import Gatsby from 'ui/icons/Gatsby'
import Wix from 'ui/icons/Wix'
import { withAuthentication, auth } from '../../hoc/protected'
import SignUp from '../Auth/Signup/BasicSignup'
import Pricing from './Pricing'
import './NewMainPage.css'

const LIVE_DEMO_URL = '/projects/STEzHcB1rALV'

const Main = () => {
  const history = useHistory()
  const { t, i18n: { language } } = useTranslation('common')
  const { theme } = useSelector(state => state.ui.theme)
  const stats = useSelector(state => state.ui.misc.stats)

  const events = nFormatterSeparated(Number(stats.pageviews), 0)
  const users = nFormatterSeparated(Number(stats.users), 0)
  const websites = nFormatterSeparated(Number(stats.projects), 0)

  return (
    <Title title={t('titles.main')}>
      <div className='relative flex justify-center items-center bg-gray-900 py-2 px-2'>
        <a href='https://bank.gov.ua/en/news/all/natsionalniy-bank-vidkriv-spetsrahunok-dlya-zboru-koshtiv-na-potrebi-armiyi' target='_blank' rel='noreferrer noopener' className='text-white border-gray-900 border-b-2 hover:border-white text-center'>
          {t('main.ukrSupport')}
        </a>
        <ExternalLinkIcon className='h-4 w-4 text-white ml-1 hidden md:block' />
      </div>
      <div>
        <div className='bg-gray-800 dark:bg-[#181F29]'>
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
                      <Trans
                        t={t}
                        i18nKey='main.slogan'
                        components={{
                          span: <span className='from-indigo-600 text-transparent bg-clip-text bg-gradient-to-r to-indigo-400' />,
                        }}
                      />
                    </h1>
                    <p className='mt-3 text-base text-gray-300 sm:mt-[24px] sm:text-xl lg:text-lg xl:text-[1.1rem]'>
                      {t('main.description')}
                      <br />
                      {t('main.trackEveryMetric')}
                    </p>
                    <div className='mt-10 flex flex-col items-center sm:flex-row'>
                      <Link to={routes.signup} className='rounded-md border !duration-300 transition-all w-full max-w-[350px] sm:max-w-[210px] h-[50px] flex items-center justify-center sm:mr-6 shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 border-transparent'>
                        <span className='text-base font-semibold mr-1'>
                          {t('main.start')}
                        </span>
                        <ArrowSmRightIcon className='w-[20px] h-[16px] mt-[1px]' />
                      </Link>
                      <a href={LIVE_DEMO_URL} className='rounded-md !duration-300 transition-all sm:mt-0 mt-2 !border-[#E6E8EC] border w-full max-w-[350px] sm:max-w-[210px] h-[50px] flex items-center justify-center shadow-sm text-white bg-transparent hover:bg-[#1a273b]' target='_blank' rel='noopener noreferrer'>
                        <span className='text-base font-semibold'>{t('common.liveDemo')}</span>
                      </a>
                    </div>
                  </div>
                  <div className='max-w-md xl:max-w-lg hidden lg:block'>
                    <img className='rounded-xl' style={{ height: '100%', minWidth: '880px' }} src={theme === 'dark' ? '/assets/screenshot_dark.png' : '/assets/screenshot_light.png'} width='100%' height='auto' alt='Swetrix Analytics dashboard' />
                  </div>
                </div>
                <div className='my-10 block lg:hidden'>
                  <img className='rounded-xl shadow-colored-2xl w-full' src={theme === 'dark' ? '/assets/screenshot_dark.png' : '/assets/screenshot_light.png'} alt='Swetrix Analytics dashboard' width='100%' height='auto' />
                </div>
              </div>
            </div>

            <div className='dark:bg-[#181F29] bg-white px-4 pb-24'>
              {/* section Core Analytics Features */}
              <section className='flex pt-[86px] md:pt-[190px] flex-col-reverse md:flex-row items-center md:items-start md:justify-between max-w-[1300px] m-auto'>
                <img className='md:max-w-[450px] lg:max-w-full' src='/assets/section-demo-1.png' alt='Core Analytics Features' />
                <div className='max-w-[516px]'>
                  <h1 className='font-extrabold text-4xl dark:text-[#FFFFFF] text-[#293451]'>
                    {t('main.coreFeatures.title')}
                  </h1>
                  <p className='mt-6 dark:text-[#BEBFC2] text-[#7D818C] mb-11'>
                    {t('main.coreFeatures.desc')}
                  </p>
                  <Button className='dark:text-[#8A84FB] text-[#4E46DD] !font-bold border-0'>
                    Traffic Insights
                    <ArrowSmRightIcon className='w-[20px] h-[16px] mt-[1px]' />
                  </Button>
                </div>
              </section>
              {/* section Marketplace & build-in Extensions */}
              <section className='flex pt-[86px] md:pt-[190px] flex-col md:flex-row items-center md:items-start md:justify-between max-w-[1300px] m-auto'>
                <div className='max-w-[516px]'>
                  <h1 className='font-extrabold text-4xl text-[#293451] dark:text-[#FFFFFF]'>
                    {t('main.marketplace.title')}
                  </h1>
                  <p className='mt-6 text-[#7D818C] dark:text-[#BEBFC2] mb-3'>
                    {t('main.marketplace.desc1')}
                  </p>
                  <p className='text-[#7D818C] dark:text-[#BEBFC2] mb-11'>
                    {t('main.marketplace.desc2')}
                  </p>
                  <Button className='text-[#4E46DD] dark:text-[#8A84FB] !font-bold border-0'>
                    Traffic Insights
                    <ArrowSmRightIcon className='w-[20px] h-[16px] mt-[1px]' />
                  </Button>
                </div>
                <img className='md:max-w-[450px] lg:max-w-full' src='/assets/section-demo-1.png' alt='Marketplace' />
              </section>
              {/* section Privacy compliance. */}
              <section className='flex pt-[86px] md:pt-[190px] flex-col-reverse md:flex-row items-center md:items-start md:justify-between max-w-[1300px] m-auto'>
                <img className='md:max-w-[360px] lg:max-w-lg' src='/assets/gdpr.svg' alt='GDPR compliant' />
                <div className='max-w-[516px] w-full md:min-w-[370px] pb-16 md:pb-0'>
                  <h1 className='font-extrabold mb-6 text-4xl text-[#293451] dark:text-[#FFFFFF]'>
                    {t('main.privacy.title')}
                  </h1>
                  {_map(t('main.privacy.list', { returnObjects: true }), (item) => (
                    <div key={item.label} className='mb-4 flex items-center'>
                      <div className='mr-3'>
                        <CheckCircleIcon className='fill-indigo-500 w-[24px] h-[24px]' />
                      </div>
                      <p>
                        <span className='dark:text-white'>{item.label}</span>
                        <span className='mr-1 ml-1 dark:text-white'>-</span>
                        <span className='text-[#7D818C] dark:text-[#BEBFC2]'>{item.desc}</span>
                      </p>
                    </div>
                  ))}
                  <Button onClick={() => history.push(routes.privacy)} className='mt-10 text-[#4E46DD] dark:text-[#8A84FB] !font-bold border-0'>
                    {t('main.dataProtection')}
                    <ArrowSmRightIcon className='w-[20px] h-[16px] mt-[1px]' />
                  </Button>
                </div>
              </section>
            </div>
            {/*  block singup */}
            <div className='overflow-hidden'>
              <div className='py-24 max-w-[1280px] w-full flex justify-center md:justify-between items-center mx-auto px-5'>
                <div className='relative z-50 lg:col-span-6 rounded-xl'>
                  <div className='bg-white dark:bg-[#202A3A] sm:max-w-md sm:w-full sm:mx-auto sm:rounded-lg sm:overflow-hidden'>
                    <div className='px-4 py-8 sm:px-10'>
                      <p className='text-lg text-gray-900 dark:text-white text-center md:text-xl font-semibold'>
                        {t('main.signup')}
                      </p>
                      <div className='mt-6'>
                        <SignUp />
                      </div>
                    </div>
                    <div className='px-4 sm:px-10'>
                      <div className='py-6 bg-gray-50 dark:bg-[#202A3A]  border-t-2 border-gray-200 dark:border-gray-500'>
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
                </div>
                <div className='relative'>
                  <div
                    className='absolute w-[146px] h-[558px] z-40 left-[10vw] filter_blur'
                    style={{
                      background: 'linear-gradient(67.59deg, #408B9B 25.75%, #0B145F 61.14%)',
                      transform: 'rotate(-50.32deg)',
                    }}
                  />
                  <img
                    className='relative z-50 hidden md:block'
                    src={theme === 'dark' ? '/assets/section-signup-dark.png' : '/assets/section-signup-light.png'}
                    alt=''
                  />
                </div>
              </div>
            </div>
            {/* Core features section */}
            <section className='bg-white dark:bg-[#181F29] pt-20 relative pb-14'>
              <BackgroundSvg className='absolute -left-8' type='shapes' />
              <div className='mx-auto text-[#293451] font-extrabold text-[30px] sm:text-[45px] w-fit relative'>
                <h1 className='relative z-20 dark:text-white'>
                  {t('main.coreFeaturesBlock')}
                </h1>
                <BackgroundSvg className='absolute right-0 sm:-right-16 top-9 z-10 opacity-30' type='semicircle' />
              </div>
              <div className='mt-[60px] flex items-center max-w-[1300px] w-full mx-auto flex-wrap justify-center xl:justify-between'>
                {_map(t('main.features', { returnObjects: true }), (item, index) => (
                  <div key={item.name} className='w-[416px] h-[250px] px-7 py-11 text-center'>
                    <span className='text-indigo-500 text-3xl font-semibold'>{1 + index}</span>
                    <div className='mt-2'>
                      <h2 className='text-[#293451] dark:text-white text-[20px] font-semibold max-w-[300px] mx-auto mb-3 whitespace-pre-line'>{item.name}</h2>
                      <p className='text-gray-500 max-w-[320px] mx-auto dark:text-[#BEBFC2]'>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <BackgroundSvg className='absolute right-0 bottom-0 z-10' type='twolinecircle' />
            </section>
            <section className='bg-white dark:bg-[#202A3A] pt-24 sm:px-5 px-3 relative pb-28'>
              <h1 className='mx-auto text-[#293451] dark:text-white font-bold text-[30px] sm:text-[45px] w-fit text-center'>
                {t('main.supports')}
              </h1>
              <div className='mt-20 grid sm:grid-cols-4 md:grid-cols-6 grid-cols-3 gap-x-4 gap-y-10 justify-items-center items-center lg:gap-x-10 lg:gap-y-16 max-w-[1300px] w-full mx-auto justify-between'>
                {/* <img src={theme === 'dark' ? '/assets/supports/slack_w.png' : '/assets/supports/Slack.png'} alt='Slack' /> */}
                <Slack theme={theme} className='max-w-[150px] max-h-12' />
                <NuxtJS theme={theme} />
                <Webflow theme={theme} />
                <NextJS theme={theme} className='max-w-[150px]' />
                <Notion theme={theme} />
                <img src='/assets/supports/react.png' alt='React' title='React.js' />
                <img src='/assets/supports/angular.png' alt='Angular' title='Angular' />
                <Wordpress theme={theme} />
                <Wix theme={theme} className='max-w-[150px] max-h-12' />
                <Ghost theme={theme} />
                <Gatsby theme={theme} />
                <Cloudflare theme={theme} />
              </div>
            </section>
            <div className='overflow-hidden'>
              <div className='relative max-w-[1300px] w-full mx-auto'>
                <div
                  className='absolute w-[246px] h-[458px] z-10 left-[10vw] -top-[10vh] filter_blur'
                  style={{
                    background: 'linear-gradient(67.59deg, #408B9B 25.75%, #0B145F 61.14%)',
                    transform: 'rotate(-50.32deg)',
                  }}
                />
                <section className='relative z-20 px-3'>
                  <h1 className='mt-20 text-center text-[30px] sm:text-[45px] text-white font-extrabold max-w-[512px] w-full mx-auto'>
                    {t('main.marketplaceBlock')}
                  </h1>
                  <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-24 justify-between justify-items-center text-white pt-20 pb-36'>
                    {_map(t('main.mFeatures', { returnObjects: true }), (item, index) => (
                      <div key={item.name} className='max-w-[290px] w-full'>
                        <div className='flex items-center'>
                          <span className='text-[#E0E9FF] font-bold text-[26px] mr-6'>{1 + index}</span>
                          <h2 className='font-semibold text-[20px]'>{item.name}</h2>
                        </div>
                        <p className='pl-9 text-[#CECDD7]'>{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <div
                  className='absolute w-[346px] h-[558px] z-10 -left-[30vw] top-[80vh] sm:left-[70vw] sm:top-[30vh] filter_blur'
                  style={{
                    background: 'linear-gradient(67.59deg, #408B9B 25.75%, #0B145F 61.14%)',
                    transform: 'rotate(-50.32deg)',
                  }}
                />
              </div>
            </div>
            <Pricing t={t} language={language} />
            <section className='bg-white dark:bg-[#181F29] pt-20 pb-20 relative'>
              <div className='absolute right-0 top-0'>
                <BackgroundSvg type='twolinecircle2' />
              </div>
              <div className='absolute rotate-[135deg] left-0 z-0'>
                <BackgroundSvg type='shapes' />
              </div>
              <div className='max-w-[1000px] w-full mx-auto'>
                <h1 className='text-[#293451] text-center font-extrabold text-[45px] relative z-20 dark:text-white'>
                  {t('main.testimonials')}
                </h1>
                <div className='flex items-center flex-col md:flex-row justify-between mt-16'>
                  <div
                    className='max-w-[310px] w-full dark:bg-[#212B3B]'
                    style={{
                      boxShadow: '-22px -11px 40px rgba(0, 0, 0, 0.02), 3px -5px 16px rgba(0, 0, 0, 0.02), 17px 24px 20px rgba(0, 0, 0, 0.02)',
                      borderRadius: '100px 30px 30px 30px',
                    }}
                  >
                    <Quote theme={theme} color='black' className='mx-auto relative -top-4' />
                    <div className='px-14 mb-12'>
                      <p className='text-[#707482] text-[14px] mt-8 dark:text-[#BEBFC2]'>Joe Massad</p>
                      <p className='text-[#212936] dark:text-white text-[18px] mt-2 leading-9'>
                        Start out for free, no credit card needed.
                        When your business grows, you can upgrade your plan at any time.
                      </p>
                    </div>
                  </div>
                  <div
                    className='max-w-[310px] w-full md:mx-4 mt-10 md:mt-0 dark:bg-[#212B3B]'
                    style={{
                      boxShadow: '-22px -11px 40px rgba(0, 0, 0, 0.02), 3px -5px 16px rgba(0, 0, 0, 0.02), 17px 24px 20px rgba(0, 0, 0, 0.02)',
                      borderRadius: '100px 30px 30px 30px',
                    }}
                  >
                    <Quote theme={theme} color='yellow' className='mx-auto relative -top-4' />
                    <div className='px-14 mb-12'>
                      <p className='text-[#707482] text-[14px] mt-8 dark:text-[#BEBFC2]'>Joe Massad</p>
                      <p className='text-[#212936] dark:text-white text-[18px] mt-2 leading-9'>
                        Start out for free, no credit card needed.
                        When your business grows, you can upgrade your plan at any time.
                      </p>
                    </div>
                  </div>
                  <div
                    className='max-w-[310px] w-full mt-10 md:mt-0 dark:bg-[#212B3B]'
                    style={{
                      boxShadow: '-22px -11px 40px rgba(0, 0, 0, 0.02), 3px -5px 16px rgba(0, 0, 0, 0.02), 17px 24px 20px rgba(0, 0, 0, 0.02)',
                      borderRadius: '100px 30px 30px 30px',
                    }}
                  >
                    <Quote theme={theme} color='black' className='mx-auto relative -top-4' />
                    <div className='px-14 mb-12'>
                      <p className='text-[#707482] text-[14px] mt-8 dark:text-[#BEBFC2]'>Joe Massad</p>
                      <p className='text-[#212936] dark:text-white text-[18px] mt-2 leading-9'>
                        Start out for free, no credit card needed.
                        When your business grows, you can upgrade your plan at any time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className='bg-white dark:bg-[#181F29] px-4 md:px-8 dark:pb-12'>
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
                      <span className='text-base font-semibold mr-1'>{t('main.start')}</span>
                      <ArrowSmRightIcon className='w-[20px] h-[16px] mt-[1px]' />
                    </Link>
                  </div>
                  <div className='max-w-md xl:max-w-lg block h-[450px]'>
                    <img className='rounded-xl' style={{ minheight: '600px', minWidth: '880px' }} src={theme === 'dark' ? '/assets/screenshot_dark.png' : '/assets/screenshot_light.png'} width='100%' height='auto' alt='Swetrix Analytics dashboard' />
                  </div>
                </div>
              </section>
            </div>

            <section className='bg-white dark:bg-[#202A3A] px-4 md:px-8 pt-24 pb-32 relative'>
              <div className='absolute right-0 top-0 z-0 sm:top-28'>
                <BackgroundSvg type='circle' />
              </div>
              <div className='absolute left-10'>
                <BackgroundSvg type='shapes' />
              </div>
              <h1 className='text-[#293451] text-[45px] font-extrabold text-center relative z-20 dark:text-white'>Checklist</h1>
              <div className='flex flex-col lg:flex-row items-center justify-between max-w-[1080px] w-full mx-auto mt-16'>
                <div
                  className='max-w-[310px] w-full mx-auto shadow-lg overflow-hidden relative z-10'
                  style={{ borderRadius: '20px 10px 10px 10px' }}
                >
                  <div className='flex items-center justify-between pl-[43px] pr-[26px] bg-[#FDBC64] py-4'>
                    <h2 className='text-[20px] text-white font-semibold'>Done</h2>
                    <CheckCircleIconOutline className='w-[26px] h-[26px] text-white' />
                  </div>
                  <div className='mt-14 px-11 pb-12'>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center mb-3'>
                      <CheckCircleIconOutline className='w-[18px] h-[18px] text-[#FDBC64] mr-2' />
                      {' '}
                      Up to 5,000 visits per month.
                    </p>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center mb-3'>
                      <CheckCircleIconOutline className='w-[18px] h-[18px] text-[#FDBC64] mr-2' />
                      {' '}
                      Add up to 10 websites.
                    </p>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center mb-3'>
                      <CheckCircleIconOutline className='w-[18px] h-[18px] text-[#FDBC64] mr-2' />
                      {' '}
                      Unlimited data exports.
                    </p>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center mb-3'>
                      <CheckCircleIconOutline className='w-[18px] h-[18px] text-[#FDBC64] mr-2' />
                      {' '}
                      100% data ownership.
                    </p>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center mb-3'>
                      <CheckCircleIconOutline className='w-[18px] h-[18px] text-[#FDBC64] mr-2' />
                      {' '}
                      No cookie banners required.
                    </p>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center mb-3'>
                      <CheckCircleIconOutline className='w-[18px] h-[18px] text-[#FDBC64] mr-2' />
                      {' '}
                      Shared & Public Dashboards.
                    </p>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center'>
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
                    <p className='text-[#707482] dark:text-white text-xs flex items-center mb-3'>
                      <CogIcon className='w-[18px] h-[18px] text-[#9970E7] mr-2' />
                      {' '}
                      Up to 5,000 visits per month.
                    </p>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center mb-3'>
                      <CogIcon className='w-[18px] h-[18px] text-[#9970E7] mr-2' />
                      {' '}
                      Add up to 10 websites.
                    </p>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center mb-3'>
                      <CogIcon className='w-[18px] h-[18px] text-[#9970E7] mr-2' />
                      {' '}
                      Unlimited data exports.
                    </p>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center mb-3'>
                      <CogIcon className='w-[18px] h-[18px] text-[#9970E7] mr-2' />
                      {' '}
                      100% data ownership.
                    </p>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center mb-3'>
                      <CogIcon className='w-[18px] h-[18px] text-[#9970E7] mr-2' />
                      {' '}
                      No cookie banners required.
                    </p>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center mb-3'>
                      <CogIcon className='w-[18px] h-[18px] text-[#9970E7] mr-2' />
                      {' '}
                      Shared & Public Dashboards.
                    </p>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center'>
                      <CogIcon className='w-[18px] h-[18px] text-[#9970E7] mr-2' />
                      {' '}
                      Email reports.
                    </p>
                  </div>
                </div>
                <div
                  className='max-w-[310px] w-full mx-auto shadow-lg overflow-hidden relative z-10'
                  style={{ borderRadius: '20px 10px 10px 10px' }}
                >
                  <div className='flex items-center justify-between pl-[43px] pr-[26px] bg-[#212936] dark:bg-[#184388] py-4'>
                    <h2 className='text-[20px] text-white font-semibold'>Plans</h2>
                    <ClockIcon className='w-[26px] h-[26px] text-white' />
                  </div>
                  <div className='mt-14 px-11 pb-12'>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center mb-3'>
                      <ClockIcon className='w-[18px] h-[18px] text-[#212936] dark:text-[#184388] mr-2' />
                      {' '}
                      Up to 5,000 visits per month.
                    </p>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center mb-3'>
                      <ClockIcon className='w-[18px] h-[18px] text-[#212936] dark:text-[#184388] mr-2' />
                      {' '}
                      Add up to 10 websites.
                    </p>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center mb-3'>
                      <ClockIcon className='w-[18px] h-[18px] text-[#212936] dark:text-[#184388] mr-2' />
                      {' '}
                      Unlimited data exports.
                    </p>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center mb-3'>
                      <ClockIcon className='w-[18px] h-[18px] text-[#212936] dark:text-[#184388] mr-2' />
                      {' '}
                      100% data ownership.
                    </p>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center mb-3'>
                      <ClockIcon className='w-[18px] h-[18px] text-[#212936] dark:text-[#184388] mr-2' />
                      {' '}
                      No cookie banners required.
                    </p>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center mb-3'>
                      <ClockIcon className='w-[18px] h-[18px] text-[#212936] dark:text-[#184388] mr-2' />
                      {' '}
                      Shared & Public Dashboards.
                    </p>
                    <p className='text-[#707482] dark:text-white text-xs flex items-center'>
                      <ClockIcon className='w-[18px] h-[18px] text-[#212936] dark:text-[#184388] mr-2' />
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
                <h1 className='text-[30px] md:text-[38px] text-white font-extrabold'>
                  <Trans
                    t={t}
                    i18nKey='main.opensourceAdv'
                    components={{
                      // eslint-disable-next-line jsx-a11y/anchor-has-content
                      url: <a href={GITHUB_URL} className='hover:underline' target='_blank' rel='noopener noreferrer' />,
                    }}
                  />
                </h1>
                <hr className='border-[#535151] border-1 max-w-[346px] my-6' />
                <div className='max-w-[438px] w-full lg:mb-0 mb-9'>
                  {_map(t('main.opensource', { returnObjects: true }), (item) => (
                    <p key={item.desc} className='text-[#CECDD7] text-sm leading-6 flex items-center mb-3'>
                      <span>
                        <CheckCircleIcon className='w-[24px] h-[24px] text-indigo-500 mr-[14px]' />
                      </span>
                      {item.desc}
                    </p>
                  ))}
                </div>
              </div>
            </section>
            <section className='bg-white dark:bg-[#202A3A] pt-20 pb-44 relative'>
              <div className='absolute right-0 top-16 z-0'>
                <BackgroundSvg type='threecircle' />
              </div>
              <div className='absolute -left-9 top-52 rotate-90'>
                <BackgroundSvg type='shapes' />
              </div>
              <div className='max-w-[1080px] w-full mx-auto px-3'>
                <div className='max-w-[400px] w-full mx-auto'>
                  <h1 className='text-[#170F49] dark:text-white text-[30px] md:text-[38px] font-extrabold text-center'>
                    {t('main.becomeDev')}
                  </h1>
                  <p className='text-[#7D818C] dark:text-[#BEBFC2] text-base font-medium text-center'>
                    {t('main.becomeDevDesc')}
                  </p>
                </div>
                <div className='flex items-center justify-between mt-20 md:mt-32 md:flex-row flex-col'>
                  <div>
                    <p className='text-[#4E46DD] text-[50px] font-extrabold text-center'>
                      {users[0]}
                      {users[1] && (
                        <span className='text-[#170F49] dark:text-[#C8DCFC]'>
                          {users[1]}
                          +
                        </span>
                      )}
                    </p>
                    <p className='text-[#6F6C90] text-[18px] dark:text-[#DEE3EB]'>
                      {t('main.users')}
                    </p>
                  </div>
                  <div className='bg-[#212936] dark:bg-[#DEE3EB] w-2 h-2 rounded-full mx-5 mb-[60px] mt-[70px] md:mb-0 md:mt-0' />
                  <div>
                    <p className='text-[#4E46DD] text-[50px] font-extrabold text-center'>
                      {websites[0]}
                      {websites[1] && (
                        <span className='text-[#170F49] dark:text-[#C8DCFC]'>
                          {websites[1]}
                          +
                        </span>
                      )}
                    </p>
                    <p className='text-[#6F6C90] text-[18px] dark:text-[#DEE3EB]'>
                      {t('main.websites')}
                    </p>
                  </div>
                  <div className='bg-[#212936] dark:bg-[#DEE3EB] w-2 h-2 rounded-full mx-5 mb-[60px] mt-[70px] md:mb-0 md:mt-0' />
                  <div>
                    <p className='text-[#4E46DD] text-[50px] font-extrabold text-center'>
                      {events[0]}
                      {events[1] && (
                        <span className='text-[#170F49] dark:text-[#C8DCFC]'>
                          {events[1]}
                          +
                        </span>
                      )}
                    </p>
                    <p className='text-[#6F6C90] text-[18px] dark:text-[#DEE3EB]'>
                      {t('main.pageviews')}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </Title>
  )
}

export default memo(withAuthentication(Main, auth.notAuthenticated))
