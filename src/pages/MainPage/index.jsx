/* eslint-disable react/jsx-no-target-blank */
import React, { memo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import cx from 'clsx'
import { useSelector } from 'react-redux'
import {
  ArrowTopRightOnSquareIcon, ArrowSmallRightIcon, CheckCircleIcon, CheckIcon, XMarkIcon,
} from '@heroicons/react/24/solid'
import { TypeAnimation } from 'react-type-animation'
import _map from 'lodash/map'
import _reduce from 'lodash/reduce'
import _isEmpty from 'lodash/isEmpty'

import routes from 'routes'
import { nFormatterSeparated } from 'utils/generic'
import Title from 'components/Title'
import { GITHUB_URL, MARKETPLACE_URL } from 'redux/constants'
import BackgroundSvg from 'ui/icons/BackgroundSvg'
import Webflow from 'ui/icons/Webflow'
import NextJS from 'ui/icons/NextJS'
import NuxtJS from 'ui/icons/NuxtJS'
import Angular from 'ui/icons/Angular'
import ReactSVG from 'ui/icons/ReactSVG'
import Quote from 'ui/icons/Quote'
import Telegram from 'ui/icons/Telegram'
import Wordpress from 'ui/icons/Wordpress'
import Cloudflare from 'ui/icons/Cloudflare'
import Notion from 'ui/icons/Notion'
import Ghost from 'ui/icons/Ghost'
import Gatsby from 'ui/icons/Gatsby'
import Wix from 'ui/icons/Wix'

import SignUp from '../Auth/Signup/BasicSignup'
import Pricing from './Pricing'

import './styles.css'

const LIVE_DEMO_URL = '/projects/STEzHcB1rALV'

const COMPETITORS_LIST = ['Google Analytics', 'Fathom', 'Plausible', 'Simple Analytics']
const SWETRIX_AND_COMPETITORS_LIST = ['Swetrix', ...COMPETITORS_LIST]
const COMPETITOR_SEQUENCE_DELAY = 5000 // in milliseconds
const processedList = _reduce(COMPETITORS_LIST, (acc, curr) => {
  acc.push(curr)
  acc.push(COMPETITOR_SEQUENCE_DELAY)
  return acc
}, [])

// The order in the table is defined by the Swetrix object
const COMPETITOR_FEATURE_TABLE = {
  Swetrix: {
    'main.competitiveFeatures.gdpr': true, // GDPR-compatible
    'main.competitiveFeatures.open': true, // Open-source
    'main.competitiveFeatures.perf': true, // Performance
    'main.competitiveFeatures.ext': true, // Custom extensions
    'main.competitiveFeatures.alrt': true, // Custom alerts
    'main.competitiveFeatures.pbld': true, // Public dashboards
    'main.competitiveFeatures.shad': true, // Dashboard sharing
    'main.competitiveFeatures.ckfree': true, // Has a free plan
    'main.competitiveFeatures.api': true, // Has a free plan
    'main.competitiveFeatures.2fa': true, // 2FA
  },
  'Google Analytics': {
    'main.competitiveFeatures.gdpr': false,
    'main.competitiveFeatures.open': false,
    'main.competitiveFeatures.perf': false,
    'main.competitiveFeatures.ext': false,
    'main.competitiveFeatures.alrt': false,
    'main.competitiveFeatures.pbld': false,
    'main.competitiveFeatures.shad': false,
    'main.competitiveFeatures.ckfree': false,
    'main.competitiveFeatures.api': true,
    'main.competitiveFeatures.2fa': true,
  },
  Fathom: {
    'main.competitiveFeatures.gdpr': true,
    'main.competitiveFeatures.open': null,
    'main.competitiveFeatures.perf': false,
    'main.competitiveFeatures.ext': false,
    'main.competitiveFeatures.alrt': true,
    'main.competitiveFeatures.pbld': true,
    'main.competitiveFeatures.shad': true,
    'main.competitiveFeatures.ckfree': true,
    'main.competitiveFeatures.api': true,
    'main.competitiveFeatures.2fa': true,
  },
  Plausible: {
    'main.competitiveFeatures.gdpr': true,
    'main.competitiveFeatures.open': true,
    'main.competitiveFeatures.perf': false,
    'main.competitiveFeatures.ext': false,
    'main.competitiveFeatures.alrt': false,
    'main.competitiveFeatures.pbld': true,
    'main.competitiveFeatures.shad': true,
    'main.competitiveFeatures.ckfree': true,
    'main.competitiveFeatures.api': true,
    'main.competitiveFeatures.2fa': false,
  },
  'Simple Analytics': {
    'main.competitiveFeatures.gdpr': true,
    'main.competitiveFeatures.open': false,
    'main.competitiveFeatures.perf': false,
    'main.competitiveFeatures.ext': false,
    'main.competitiveFeatures.alrt': false,
    'main.competitiveFeatures.pbld': true,
    'main.competitiveFeatures.shad': false,
    'main.competitiveFeatures.ckfree': true,
    'main.competitiveFeatures.api': true,
    'main.competitiveFeatures.2fa': false,
  },
}

const Lines = () => (
  <div className='relative pointer-events-none'>
    {/* 1 */}
    <div className='absolute rotate-12 -right-0 bottom-[4.2rem] xl:bottom-20 h-px w-[400%] bg-gradient-to-l from-slate-400 opacity-20' />
    <div className='absolute rotate-12 -left-32 top-3 xl:top-[0.78rem] mt-[-0.5px] h-[2px] w-28 rounded-full bg-gradient-to-r from-blue-500' />

    {/* 2 */}
    <div className='absolute rotate-6 right-[-48rem] top-[32rem] h-px w-[800%] bg-gradient-to-l from-slate-400 opacity-10' />
    <div className='absolute rotate-[96deg] top-[22.26rem] xl:top-[23.5rem] -left-60 ml-[-0.5px] h-96 w-[2px] rounded-full bg-gradient-to-t from-emerald-700 opacity-50' />

    {/* 3 */}
    <div className='absolute rotate-0 top-44 right-0 bottom-0 h-px w-[400%] bg-gradient-to-l from-slate-400 opacity-20' />
    <div className='absolute -rotate-90 top-[7.03rem] -left-28 ml-[-0.5px] h-32 w-[2px] rounded-full bg-gradient-to-t from-violet-400' />
  </div>
)

const Main = () => {
  const { t, i18n: { language } } = useTranslation('common')
  const { theme } = useSelector(state => state.ui.theme)
  const { stats, lastBlogPost } = useSelector(state => state.ui.misc)

  const events = nFormatterSeparated(Number(stats.pageviews), 0)
  const users = nFormatterSeparated(Number(stats.users), 0)
  const websites = nFormatterSeparated(Number(stats.projects), 0)

  return (
    <Title title={t('titles.main')}>
      <div className='flex justify-center items-center bg-gray-900 py-2 px-2'>
        <a href='https://bank.gov.ua/en/news/all/natsionalniy-bank-vidkriv-spetsrahunok-dlya-zboru-koshtiv-na-potrebi-armiyi' target='_blank' rel='noreferrer noopener' className='text-white border-gray-900 border-b-2 hover:border-white text-center'>
          {t('main.ukrSupport')}
        </a>
        <ArrowTopRightOnSquareIcon className='h-4 w-4 text-white ml-1 hidden md:block' />
      </div>
      <div className='overflow-hidden'>
        <div className='bg-gray-800 dark:bg-gray-900'>
          <main>
            {/* first block with live demo */}
            <div className='relative overflow-x-clip'>
              <div
                className='relative pt-10 lg:pt-24 pb-5 xl:px-8 lg:px-6 sm:px-3 mx-auto min-h-[740px]'
              >
                <div
                  className='absolute w-36 h-[558px] z-10 bottom-0 right-[50vw] filter_blur'
                  style={{
                    background: 'linear-gradient(67.59deg, #408B9B 25.75%, #0B145F 61.14%)',
                    transform: 'rotate(-50.32deg)',
                  }}
                />
                <div className='relative z-20 flex flex-row content-between 2xl:mr-[14vw] 2xl:justify-center justify-center lg:justify-start'>
                  <div className='lg:mt-0 text-left relative lg:mr-14 px-4'>
                    <h1 className='max-w-2xl text-3xl sm:text-5xl md:text-5xl font-extrabold text-white sm:leading-none lg:text-5xl xl:text-6xl xl:leading-[110%]'>
                      <Trans
                        t={t}
                        i18nKey='main.slogan'
                        components={{
                          span: <span className='from-indigo-600 text-transparent bg-clip-text bg-gradient-to-r to-indigo-400' />,
                        }}
                      />
                    </h1>
                    <div
                      className={cx('flex items-center overflow-hidden mt-2 mb-2 sm:text-xl lg:text-lg xl:text-lg', {
                        'animate-pulse': _isEmpty(lastBlogPost),
                      })}
                    >
                      <p className='text-base text-gray-50 dark:text-gray-100 bg-indigo-700 dark:bg-indigo-800 px-1 rounded-lg mr-2'>
                        {t('footer.blog')}
                      </p>
                      {_isEmpty(lastBlogPost) ? (
                        <div className='h-6 bg-slate-700 w-full rounded-md' />
                      ) : (
                        <a
                          className='text-indigo-400 hover:underline font-semibold'
                          href={`${process.env.REACT_APP_BLOG_URL}post/${lastBlogPost.url_path}`}
                          target='_blank'
                          rel='noopener'
                        >
                          {lastBlogPost.title}
                        </a>
                      )}
                    </div>
                    <p className='text-base text-gray-300 sm:text-xl lg:text-lg xl:text-lg'>
                      {t('main.description')}
                      <br />
                      {t('main.trackEveryMetric')}
                    </p>
                    <div className='mt-10 flex flex-col items-center sm:flex-row'>
                      <Link
                        to={routes.signup}
                        className='rounded-md border !duration-300 transition-all w-full sm:max-w-[210px] h-12 flex items-center justify-center sm:mr-6 shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 border-transparent'
                        aria-label={t('titles.signup')}
                      >
                        <span className='text-base font-semibold mr-1'>
                          {t('common.getStarted')}
                        </span>
                        <ArrowSmallRightIcon className='h-4 w-5 mt-[1px]' />
                      </Link>
                      <a
                        href={LIVE_DEMO_URL}
                        className='rounded-md !duration-300 transition-all sm:mt-0 mt-2 !border-gray-200 border w-full sm:max-w-[210px] h-12 flex items-center justify-center shadow-sm text-white bg-transparent hover:bg-gray-800'
                        target='_blank'
                        rel='noopener noreferrer'
                        aria-label={`${t('common.liveDemo')} (opens in a new tab)`}
                      >
                        <span className='text-base font-semibold'>{t('common.liveDemo')}</span>
                      </a>
                    </div>
                  </div>
                  <div className='max-w-md xl:max-w-lg hidden lg:block'>
                    <Lines />
                    <picture>
                      <source srcSet={theme === 'dark' ? '/assets/screenshot_dark.webp' : '/assets/screenshot_light.webp'} type='image/webp' />
                      <img src={theme === 'dark' ? '/assets/screenshot_dark.png' : '/assets/screenshot_light.png'} className='rounded-xl relative' style={{ height: '100%', minWidth: '880px' }} width='100%' height='auto' alt='Swetrix Analytics dashboard' />
                    </picture>
                  </div>
                </div>
                <div className='my-10 block lg:hidden relative z-20 px-4 md:px-0'>
                  <picture>
                    <source srcSet={theme === 'dark' ? '/assets/screenshot_dark.webp' : '/assets/screenshot_light.webp'} type='image/webp' />
                    <img src={theme === 'dark' ? '/assets/screenshot_dark.png' : '/assets/screenshot_light.png'} className='rounded-xl relative shadow-colored-2xl w-full' width='100%' height='auto' alt='Swetrix Analytics dashboard' />
                  </picture>
                </div>
              </div>
            </div>
            {/* end first block with live demo */}
            {/* section Core Analytics Features */}
            <div className='dark:bg-gray-900 bg-white px-4 pb-24'>
              <section className='flex pt-20 md:pt-48 flex-col-reverse md:flex-row items-center md:items-start md:justify-between max-w-7xl m-auto'>
                <picture>
                  <source srcSet='/assets/CoreFeaturesLight.webp' type='image/webp' />
                  <img src='/assets/CoreFeaturesLight.png' className='md:max-w-md md:mr-3 mt-3 md:mt-0 lg:max-w-full md:relative md:-top-10' alt='Core Analytics Features' />
                </picture>
                <div className='max-w-lg'>
                  <h2 className='font-extrabold text-4xl dark:text-white text-gray-800'>
                    {t('main.coreFeatures.title')}
                  </h2>
                  <p className='mt-6 dark:text-gray-400 text-gray-600 mb-11'>
                    {t('main.coreFeatures.desc')}
                  </p>
                  <a
                    href={LIVE_DEMO_URL}
                    className='dark:text-indigo-400 text-indigo-700 hover:underline font-bold border-0 flex items-center'
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={`${t('common.liveDemo')} (opens in a new tab)`}
                  >
                    {t('common.liveDemo')}
                    <ArrowSmallRightIcon className='w-5 h-4 mt-[1px]' />
                  </a>
                </div>
              </section>
              {/* end section Core Analytics Features */}
              {/* section Marketplace & build-in Extensions */}
              <section className='flex pt-20 md:pt-30 flex-col md:flex-row items-center md:justify-between max-w-7xl m-auto'>
                <div className='max-w-[516px]'>
                  <h2 className='font-extrabold text-4xl text-gray-800 dark:text-white'>
                    {t('main.marketplace.title')}
                  </h2>
                  <p className='mt-6 text-gray-600 dark:text-gray-400 mb-3'>
                    {t('main.marketplace.desc1')}
                  </p>
                  <p className='text-gray-600 dark:text-gray-400 mb-11'>
                    {t('main.marketplace.desc2')}
                  </p>
                  <a
                    href={MARKETPLACE_URL}
                    className='dark:text-indigo-400 text-indigo-700 hover:underline font-bold border-0 flex items-center'
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label='Swetrix Marketplace (opens in a new tab)'
                  >
                    {t('main.visitAddons')}
                    <ArrowSmallRightIcon className='w-5 h-4 mt-[1px]' />
                  </a>
                </div>
                <img className='md:max-w-[450px] lg:max-w-lg md:ml-5 mt-8 md:mt-0' src='/assets/teardown.svg' alt='Marketplace' />
              </section>
              {/* end section Marketplace & build-in Extensions */}
              {/* section Privacy compliance. */}
              <section className='flex pt-20 md:pt-48 flex-col-reverse md:flex-row items-center md:items-start md:justify-between max-w-7xl m-auto'>
                <img className='md:max-w-[360px] md:mr-3 mt-3 md:mt-0 lg:max-w-lg' src='/assets/gdpr.svg' alt='GDPR compliant' />
                <div className='max-w-[516px] w-full md:min-w-[370px] pb-16 md:pb-0 md:pt-8'>
                  <h2 className='font-extrabold mb-6 text-4xl text-gray-800 dark:text-white'>
                    {t('main.privacy.title')}
                  </h2>
                  {_map(t('main.privacy.list', { returnObjects: true }), (item) => (
                    <div key={item.label} className='mb-4 flex items-center'>
                      <div className='mr-3'>
                        <CheckCircleIcon className='fill-indigo-500 w-[24px] h-[24px]' />
                      </div>
                      <p>
                        <span className='dark:text-white'>{item.label}</span>
                        <span className='mr-1 ml-1 dark:text-white'>-</span>
                        <span className='text-gray-600 dark:text-gray-400'>{item.desc}</span>
                      </p>
                    </div>
                  ))}
                  <Link to={routes.privacy} className='dark:text-indigo-400 text-indigo-700 hover:underline font-bold border-0 flex items-center' aria-label={t('footer.pp')}>
                    {t('main.dataProtection')}
                    <ArrowSmallRightIcon className='w-5 h-4 mt-[1px]' />
                  </Link>
                </div>
              </section>
              {/* end section Privacy compliance. */}
            </div>
            {/*  block singup */}
            <div className='overflow-x-clip'>
              <div className='py-24 max-w-7xl w-full flex justify-center md:justify-between items-center mx-auto px-5'>
                <div className='relative z-50 lg:col-span-6 rounded-xl'>
                  <div className='bg-white dark:bg-gray-800 sm:max-w-md sm:w-full sm:mx-auto sm:rounded-lg sm:overflow-hidden'>
                    <div className='px-4 py-8 sm:px-10'>
                      <p className='text-lg text-gray-900 dark:text-white text-center md:text-xl font-semibold'>
                        {t('main.signup')}
                      </p>
                      <div className='mt-6'>
                        <SignUp />
                      </div>
                    </div>
                    <div className='px-4 sm:px-10'>
                      <div className='py-6 bg-gray-50 dark:bg-gray-800  border-t-2 border-gray-200 dark:border-gray-500'>
                        <p className='text-xs leading-5 text-gray-500 dark:text-gray-100'>
                          <Trans
                            t={t}
                            i18nKey='main.signupTerms'
                            components={{
                              tos: <Link to={routes.terms} className='font-medium text-gray-900 dark:text-gray-300 hover:underline' aria-label={t('footer.tos')} />,
                              pp: <Link to={routes.privacy} className='font-medium text-gray-900 dark:text-gray-300 hover:underline' aria-label={t('footer.pp')} />,
                            }}
                          />
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className='relative'>
                  <div
                    className='absolute w-36 h-[558px] z-40 left-[10vw] filter_blur'
                    style={{
                      background: 'linear-gradient(67.59deg, #408B9B 25.75%, #0B145F 61.14%)',
                      transform: 'rotate(-50.32deg)',
                    }}
                  />
                  <picture>
                    <source srcSet={theme === 'dark' ? '/assets/section-signup-dark.webp' : '/assets/section-signup-light.webp'} type='image/webp' />
                    <img src={theme === 'dark' ? '/assets/section-signup-dark.png' : '/assets/section-signup-light.png'} className='relative z-50 hidden md:block' alt='Swetrix Dashboard overview' />
                  </picture>
                </div>
              </div>
            </div>
            {/* end block singup */}
            {/* Core features section */}
            <section className='bg-white dark:bg-gray-900 pt-20 relative pb-14'>
              <BackgroundSvg className='absolute -left-8' type='shapes' />
              <div className='mx-auto text-gray-800 font-extrabold text-3xl sm:text-5xl w-fit relative'>
                <h2 className='relative z-20 dark:text-white'>
                  {t('main.coreFeaturesBlock')}
                </h2>
                <BackgroundSvg className='absolute right-0 sm:-right-16 top-9 z-10 opacity-30' type='semicircle' />
              </div>
              <div className='mt-[60px] flex items-center max-w-7xl w-full mx-auto flex-wrap justify-center xl:justify-between'>
                {_map(t('main.features', { returnObjects: true }), (item, index) => (
                  <div key={item.name} className='w-[416px] h-64 px-7 py-11 text-center'>
                    <span className='text-indigo-500 text-3xl font-semibold'>{1 + index}</span>
                    <div className='mt-2'>
                      <h2 className='text-gray-800 dark:text-white text-xl font-semibold max-w-[300px] mx-auto mb-3 whitespace-pre-line'>{item.name}</h2>
                      <p className='text-gray-500 max-w-xs mx-auto dark:text-gray-400'>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <BackgroundSvg className='absolute right-0 bottom-0 z-10' type='twolinecircle' />
            </section>
            {/* end Core features section */}
            {/* section supports */}
            <section className='bg-white dark:bg-gray-800 pt-24 sm:px-5 px-3 relative pb-28'>
              <h2 className='mx-auto text-gray-800 dark:text-white font-bold text-3xl sm:ext-5xl w-fit text-center'>
                {t('main.supports')}
              </h2>
              <div className='mt-20 grid sm:grid-cols-4 md:grid-cols-6 grid-cols-3 gap-x-4 gap-y-10 justify-items-center items-center lg:gap-x-10 lg:gap-y-16 max-w-7xl w-full mx-auto justify-between'>
                <Telegram theme={theme} className='max-w-[64px] sm:max-w-[150px] max-h-16' />
                <NuxtJS theme={theme} className='max-w-[106px] sm:max-w-[150px] max-h-12' />
                <Webflow theme={theme} className='max-w-[106px] sm:max-w-[150px] max-h-12' />
                <NextJS theme={theme} className='max-w-[78px] sm:max-w-[80px] max-h-12' />
                <Notion theme={theme} className='max-w-[106px] sm:max-w-[130px] max-h-12' />
                <ReactSVG className='max-w-[71px] sm:max-w-[150px] max-h-16' />
                <Angular className='max-w-[60px] sm:max-w-[160px] max-h-20' />
                <Wordpress theme={theme} className='max-w-[100px] sm:max-w-[160px] max-h-16' />
                <Wix theme={theme} className='max-w-[105px] sm:max-w-[120px] max-h-12' />
                <Ghost theme={theme} className='max-w-[105px] sm:max-w-[150px] max-h-20' />
                <Gatsby theme={theme} className='max-w-[105px] sm:max-w-[150px] max-h-12' />
                <Cloudflare theme={theme} className='max-w-[105px] sm:max-w-[140px] max-h-12' />
              </div>
            </section>
            {/* end section supports */}
            {/* Marketplace and extension features */}
            <div className='overflow-hidden'>
              <div className='relative max-w-7xl w-full mx-auto'>
                <div
                  className='absolute w-60 h-[458px] z-10 left-[10vw] -top-[10vh] filter_blur'
                  style={{
                    background: 'linear-gradient(67.59deg, #408B9B 25.75%, #0B145F 61.14%)',
                    transform: 'rotate(-50.32deg)',
                  }}
                />
                <section className='relative z-20 px-3'>
                  <h2 className='mt-20 text-center text-3xl sm:text-5xl text-white font-extrabold max-w-lg w-full mx-auto'>
                    {t('main.marketplaceBlock')}
                  </h2>
                  <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-24 justify-between justify-items-center text-white pt-20 pb-36'>
                    {_map(t('main.mFeatures', { returnObjects: true }), (item, index) => (
                      <div key={item.name} className='max-w-[310px] w-full'>
                        <div className='flex items-center'>
                          <span className='text-gray-200 font-bold text-[26px] mr-[18px]'>{1 + index}</span>
                          <h2 className='font-semibold text-xl'>{item.name}</h2>
                        </div>
                        <p className='pl-9 text-gray-300'>{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <div
                  className='absolute w-80 h-[558px] z-10 -left-[30vw] top-[80vh] sm:left-[70vw] sm:top-[30vh] filter_blur'
                  style={{
                    background: 'linear-gradient(67.59deg, #408B9B 25.75%, #0B145F 61.14%)',
                    transform: 'rotate(-50.32deg)',
                  }}
                />
              </div>
            </div>
            {/* end Marketplace and extension features */}
            <Pricing t={t} language={language} />

            {/* section: Why use Swetrix when there is .... */}
            <div className='overflow-hidden'>
              <div className='relative max-w-7xl w-full mx-auto'>
                <div
                  className='absolute w-60 h-[458px] z-10 left-[10vw] -top-[10vh] filter_blur'
                  style={{
                    background: 'linear-gradient(67.59deg, #408B9B 25.75%, #0B145F 61.14%)',
                    transform: 'rotate(-50.32deg)',
                  }}
                />
                <section className='relative z-20 px-3'>
                  <h1 className='mt-20 text-center text-3xl sm:text-5xl text-white font-extrabold max-w-prose w-full mx-auto'>
                    <Trans
                      t={t}
                      i18nKey='main.whyUseSwetrix'
                      components={{
                        // eslint-disable-next-line jsx-a11y/anchor-has-content
                        competitor: (
                          <TypeAnimation
                            sequence={processedList}
                            className='text-gray-400'
                            wrapper='span'
                            speed={10}
                            repeat={Infinity}
                            cursor
                          />
                        ),
                        swetrix: <span className='text-indigo-500'>Swetrix</span>,
                      }}
                    />
                  </h1>
                  <div className='py-20 text-lg text-gray-50 tracking-tight'>
                    <div className='mt-2 flex flex-col'>
                      <div className='-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8'>
                        <div className='inline-block min-w-full py-2 align-middle md:px-6 lg:px-8'>
                          <div className='overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg'>
                            <table className='w-full min-w-full divide-y divide-gray-500'>
                              <thead className='bg-gray-800'>
                                <tr>
                                  <th />
                                  {_map(SWETRIX_AND_COMPETITORS_LIST, (item, key) => (
                                    <th
                                      scope='col'
                                      key={key}
                                      className='w-1/6 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-50 sm:pl-6'
                                    >
                                      {item}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className='divide-y divide-gray-600 bg-gray-800'>
                                {_map(COMPETITOR_FEATURE_TABLE.Swetrix, (_, key) => (
                                  <tr key={key}>
                                    <td className='w-1/6 px-3 py-4 text-sm text-gray-50 sm:pl-6'>
                                      {t(key)}
                                    </td>
                                    {_map(SWETRIX_AND_COMPETITORS_LIST, (service) => (
                                      <td
                                        key={`${key}-${service}`}
                                        className='w-1/6 px-3 py-4 text-sm text-gray-50 sm:pl-6'
                                      >
                                        {COMPETITOR_FEATURE_TABLE[service][key] && (
                                          <CheckIcon className='flex-shrink-0 h-5 w-5 text-green-500' aria-label={t('common.yes')} />
                                        )}
                                        {COMPETITOR_FEATURE_TABLE[service][key] === false && (
                                          <XMarkIcon className='flex-shrink-0 h-5 w-5 text-red-500' aria-label={t('common.no')} />
                                        )}
                                        {COMPETITOR_FEATURE_TABLE[service][key] === null && (
                                          <p className='text-gray-50 h-5 w-5 text-center'>
                                            -
                                          </p>
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
                <div
                  className='absolute w-80 h-[558px] z-10 -right-[30vw] top-[80vh] sm:right-[70vw] sm:top-[30vh] filter_blur'
                  style={{
                    background: 'linear-gradient(67.59deg, #408B9B 25.75%, #0B145F 61.14%)',
                    transform: 'rotate(-50.32deg)',
                  }}
                />
              </div>
            </div>

            {/* section Testimonials */}
            <section className='bg-white dark:bg-gray-900 pt-20 pb-20 relative'>
              <div className='absolute right-0 top-0'>
                <BackgroundSvg type='twolinecircle2' />
              </div>
              <div className='absolute rotate-[135deg] left-0 z-0'>
                <BackgroundSvg type='shapes' />
              </div>
              <div className='max-w-[1000px] w-full mx-auto'>
                <h2 className='text-gray-800 text-center font-extrabold text-5xl relative z-20 dark:text-white'>
                  {t('main.testimonials')}
                </h2>
                <div className='flex items-center flex-col md:flex-row justify-between mt-16'>
                  {_map(t('main.lTestimonials', { returnObjects: true }), (item, index) => (
                    <div
                      key={item.name}
                      className={cx('max-w-xs w-full dark:bg-gray-800', {
                        'mt-5 md:mt-0': index > 0,
                      })}
                      style={{
                        boxShadow: '-22px -11px 40px rgba(0, 0, 0, 0.02), 3px -5px 16px rgba(0, 0, 0, 0.02), 17px 24px 20px rgba(0, 0, 0, 0.02)',
                        borderRadius: '100px 30px 30px 30px',
                      }}
                    >
                      <Quote theme={theme} color={index === 1 ? 'indigo' : 'black'} className='mx-auto relative -top-4' />
                      <div className='px-10 mb-10 max-h-80 overflow-auto'>
                        <p className='text-gray-500 text-sm mt-8 dark:text-gray-400'>
                          {item.name}
                          <br />
                          {item.role}
                        </p>
                        <p className='text-gray-800 dark:text-white text-md text mt-2 leading-9 whitespace-pre-line'>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            {/* end section Testimonials */}
            <div className='bg-white dark:bg-gray-900 px-4 md:px-8 pb-12'>
              <section className='max-w-7xl w-full mx-auto bg-gray-800 overflow-hidden lg:h-[450px]' style={{ borderRadius: '100px 30px 30px 30px' }}>
                <div className='flex items-start justify-between pt-8 pl-8 sm:pl-14 lg:pl-28 md:flex-row flex-col'>
                  <div className='max-w-[430px] w-full pt-14 pr-3 mb-16 md:mb-0'>
                    <h2 className='font-bold text-2xl leading-9 sm:text-4xl sm:leading-[48px] md:text-[28px] md:leading-10 lg:text-[33px] lg:leading-[48px] text-white mb-3'>
                      <Trans
                        t={t}
                        i18nKey='main.os'
                        components={{
                          // eslint-disable-next-line jsx-a11y/anchor-has-content
                          gradi: <span className='text-transparent bg-clip-text' style={{ background: 'linear-gradient(91.37deg, #4E46DD 10%, #5C3CDA 55%, #A274EF 100%)' }} />,
                        }}
                      />
                    </h2>
                    <p className='text-gray-300 mb-9 font-medium text-base sm:text-lg'>
                      {t('main.demoGeoReports')}
                    </p>
                    <Link to={routes.signup} className='rounded-md border !duration-300 transition-all w-full max-w-[210px] h-[50px] flex items-center justify-center sm:mr-6 shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 border-transparent' aria-label={t('titles.signup')}>
                      <span className='text-base font-semibold mr-1'>{t('main.start')}</span>
                      <ArrowSmallRightIcon className='w-5 h-4 mt-[1px]' />
                    </Link>
                  </div>
                  <div className='max-w-md xl:max-w-lg block h-[450px] md:shadow-[8px_8px_10px_3px] md:rounded-md '>
                    <img className='rounded-xl' style={{ minheight: '600px', minWidth: '880px' }} src={theme === 'dark' ? '/assets/screenshot_dark.png' : '/assets/screenshot_light.png'} width='100%' height='auto' alt='Swetrix Analytics dashboard' />
                  </div>
                </div>
              </section>
            </div>

            {/* Advantages of using open source */}
            <section className='flex items-center lg:flex-row flex-col-reverse justify-between max-w-7xl w-full mx-auto py-20 lg:py-32 px-5'>
              <picture>
                <source srcSet={theme === 'dark' ? '/assets/opensource_dark.webp' : '/assets/opensource_light.webp'} type='image/webp' />
                <img src={theme === 'dark' ? '/assets/opensource_dark.png' : '/assets/opensource_light.png'} loading='lazy' alt='Swetrix open source' />
              </picture>
              <div className='max-w-lg w-full lg:ml-5'>
                <h2 className='text-3xl md:text-4xl text-white font-extrabold'>
                  <Trans
                    t={t}
                    i18nKey='main.opensourceAdv'
                    components={{
                      // eslint-disable-next-line jsx-a11y/anchor-has-content
                      url: <a href={GITHUB_URL} className='hover:underline' target='_blank' rel='noopener noreferrer' aria-label='Source code (opens in a new tab)' />,
                    }}
                  />
                </h2>
                <hr className='border-gray-600 border-1 max-w-[346px] my-6' />
                <div className='max-w-md w-full lg:mb-0 mb-9'>
                  {_map(t('main.opensource', { returnObjects: true }), (item) => (
                    <p key={item.desc} className='text-gray-300 text-sm leading-6 flex items-center mb-3'>
                      <span>
                        <CheckCircleIcon className='w-6 h-6 text-indigo-500 mr-4' />
                      </span>
                      {item.desc}
                    </p>
                  ))}
                </div>
              </div>
            </section>
            {/* end Advantages of using open source */}
            {/* Become a developer */}
            <section className='bg-white dark:bg-gray-800 pt-20 pb-44 relative'>
              <div className='absolute right-0 top-16 z-0'>
                <BackgroundSvg type='threecircle' />
              </div>
              <div className='absolute -left-9 top-52 rotate-90'>
                <BackgroundSvg type='shapes' />
              </div>
              <div className='max-w-5xl w-full mx-auto px-3'>
                <div className='max-w-sm w-full mx-auto'>
                  <h2 className='text-gray-900 dark:text-white text-3xl md:text-4xl font-extrabold text-center'>
                    {t('main.becomeDev')}
                  </h2>
                  <p className='text-gray-600 dark:text-gray-400 text-base font-medium text-center mt-2'>
                    {t('main.becomeDevDesc')}
                  </p>
                </div>
                <div className='flex items-center justify-between mt-20 md:mt-32 md:flex-row flex-col'>
                  <div className='text-center'>
                    <p className='text-indigo-700 text-5xl font-extrabold text-center'>
                      {users[0]}
                      {users[1] && (
                        <span className='text-gray-900 dark:text-indigo-200'>
                          {users[1]}
                          +
                        </span>
                      )}
                    </p>
                    <p className='text-gray-600 text-lg dark:text-gray-200'>
                      {t('main.users')}
                    </p>
                  </div>
                  <div className='bg-gray-800 dark:bg-gray-200 w-2 h-2 rounded-full mx-5 mb-14 mt-16 md:mb-0 md:mt-0' />
                  <div className='text-center'>
                    <p className='text-indigo-700 text-5xl font-extrabold text-center'>
                      {websites[0]}
                      {websites[1] && (
                        <span className='text-gray-900 dark:text-indigo-200'>
                          {websites[1]}
                          +
                        </span>
                      )}
                    </p>
                    <p className='text-gray-600 text-lg dark:text-gray-200'>
                      {t('main.websites')}
                    </p>
                  </div>
                  <div className='bg-gray-800 dark:bg-gray-200 w-2 h-2 rounded-full mx-5 mb-14 mt-16 md:mb-0 md:mt-0' />
                  <div className='text-center'>
                    <p className='text-indigo-700 text-5xl font-extrabold text-center'>
                      {events[0]}
                      {events[1] && (
                        <span className='text-gray-900 dark:text-indigo-200'>
                          {events[1]}
                          +
                        </span>
                      )}
                    </p>
                    <p className='text-gray-600 text-lg dark:text-gray-200'>
                      {t('main.pageviews')}
                    </p>
                  </div>
                </div>
              </div>
            </section>
            {/* end Become a developer */}
          </main>
        </div>
      </div>
    </Title>
  )
}

export default memo(Main)
