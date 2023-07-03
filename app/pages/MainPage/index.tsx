import { Link } from '@remix-run/react'
import React, { memo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import cx from 'clsx'
import { useSelector } from 'react-redux'
import { ClientOnly } from 'remix-utils'
import {
  ArrowTopRightOnSquareIcon, ArrowSmallRightIcon, CheckCircleIcon, CheckIcon, XMarkIcon, ChevronRightIcon,
} from '@heroicons/react/24/solid'
import {
  CodeBracketIcon, PuzzlePieceIcon, ShareIcon, ArrowsPointingOutIcon, LightBulbIcon, ArrowTrendingUpIcon,
} from '@heroicons/react/20/solid'
import { TypeAnimation } from 'react-type-animation'
import _map from 'lodash/map'
import _reduce from 'lodash/reduce'
import _isEmpty from 'lodash/isEmpty'

import routesPath from 'routesPath'
import { getAccessToken } from 'utils/accessToken'
import { nFormatterSeparated } from 'utils/generic'
import {
  GITHUB_URL, MARKETPLACE_URL, LIVE_DEMO_URL, isBrowser, BLOG_URL,
} from 'redux/constants'
import { StateType } from 'redux/store/index'
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

import Header from 'components/Header'
import SignUp from '../Auth/Signup/BasicSignup'
import Pricing from './Pricing'

const COMPETITORS_LIST = ['Google Analytics', 'Fathom', 'Plausible', 'Simple Analytics']
const SWETRIX_AND_COMPETITORS_LIST = ['Swetrix', ...COMPETITORS_LIST]
const COMPETITOR_SEQUENCE_DELAY = 5000 // in milliseconds
const processedList = _reduce(COMPETITORS_LIST, (acc: any[], curr: any) => {
  acc.push(curr)
  acc.push(COMPETITOR_SEQUENCE_DELAY)
  return acc
}, [])

// The order in the table is defined by the Swetrix object
const COMPETITOR_FEATURE_TABLE: {
  [key: string]: {
    [key: string]: boolean | null
  }
} = {
  Swetrix: {
    'main.competitiveFeatures.gdpr': true, // GDPR-compatible
    'main.competitiveFeatures.open': true, // Open-source
    'main.competitiveFeatures.perf': true, // Performance
    'main.competitiveFeatures.usfl': true, // User Flow
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
    'main.competitiveFeatures.usfl': true,
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
    'main.competitiveFeatures.usfl': false,
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
    'main.competitiveFeatures.usfl': false,
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
    'main.competitiveFeatures.usfl': false,
    'main.competitiveFeatures.ext': false,
    'main.competitiveFeatures.alrt': false,
    'main.competitiveFeatures.pbld': true,
    'main.competitiveFeatures.shad': false,
    'main.competitiveFeatures.ckfree': true,
    'main.competitiveFeatures.api': true,
    'main.competitiveFeatures.2fa': false,
  },
}

const Lines = (): JSX.Element => (
  <div className='relative pointer-events-none'>
    <div className='absolute rotate-6 right-[-48rem] top-[32rem] h-px w-[800%] bg-gradient-to-l from-slate-600 dark:from-slate-400 opacity-10' />
    <div className='absolute rotate-[96deg] top-[22.26rem] xl:top-[23.5rem] -left-60 ml-[-0.5px] h-96 w-[2px] rounded-full bg-gradient-to-t from-emerald-600 dark:from-emerald-700 opacity-50' />
  </div>
)

const M_FEATURES_ICONS = [
  <ArrowsPointingOutIcon className='w-5 h-5' key='ArrowsPointingOutIcon' />,
  <CodeBracketIcon className='w-5 h-5' key='CodeBracketIcon' />,
  <PuzzlePieceIcon className='w-5 h-5' key='PuzzlePieceIcon' />,
  <ArrowTrendingUpIcon className='w-5 h-5' key='ArrowTrendingUpIcon' />,
  <LightBulbIcon className='w-5 h-5' key='LightBulbIcon' />,
  <ShareIcon className='w-5 h-5' key='ShareIcon' />,
]

interface IMain {
  ssrTheme: 'dark' | 'light'
  ssrAuthenticated: boolean
}

const Main: React.FC<IMain> = ({ ssrTheme, ssrAuthenticated }): JSX.Element => {
  const { t, i18n: { language } }: {
    t: (key: string, options?: {
      [key: string]: any
    }) => string,
    i18n: {
      language: string
    },
  } = useTranslation('common')
  const reduxTheme = useSelector((state: StateType) => state.ui.theme.theme)
  const {
    authenticated: reduxAuthenticated,
    loading,
  } = useSelector((state: StateType) => state.auth)
  const { stats, lastBlogPost } = useSelector((state: StateType) => state.ui.misc)
  const theme = isBrowser ? reduxTheme : ssrTheme
  const accessToken = getAccessToken()
  const authenticated = isBrowser
    ? (loading ? !!accessToken : reduxAuthenticated)
    : ssrAuthenticated

  const events = nFormatterSeparated(Number(stats.events))
  const users = nFormatterSeparated(Number(stats.users))
  const websites = nFormatterSeparated(Number(stats.projects))

  return (
    <div className='overflow-hidden'>
      <main className='bg-white dark:bg-slate-900'>
        {/* first block with live demo */}
        <div className='relative overflow-x-clip isolate'>
          <svg
            className='absolute inset-0 -z-10 h-full w-full stroke-gray-200 dark:stroke-white/10 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]'
            aria-hidden='true'
          >
            <defs>
              <pattern
                id='rect-pattern'
                width={200}
                height={200}
                x='50%'
                y={-1}
                patternUnits='userSpaceOnUse'
              >
                <path d='M.5 200V.5H200' fill='none' />
              </pattern>
            </defs>
            <svg x='50%' y={-1} className='overflow-visible fill-white dark:fill-gray-800/20'>
              <path
                d='M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z'
                strokeWidth={0}
              />
            </svg>
            <rect width='100%' height='100%' strokeWidth={0} fill='url(#rect-pattern)' />
          </svg>
          <div
            className='absolute left-[calc(50%-4rem)] top-10 -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:left-48 lg:top-[calc(50%-30rem)] xl:left-[calc(50%-24rem)]'
            aria-hidden='true'
          >
            <div
              className='aspect-[1108/632] w-[69.25rem] bg-gradient-to-r from-[#80caff] to-[#4f46e5] opacity-20'
              style={{
                clipPath:
                  'polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)',
              }}
            />
          </div>
          <Header ssrTheme={ssrTheme} authenticated={authenticated} />
          <div className='flex justify-center items-center py-2 px-2'>
            <a
              href='https://bank.gov.ua/en/news/all/natsionalniy-bank-vidkriv-spetsrahunok-dlya-zboru-koshtiv-na-potrebi-armiyi'
              target='_blank'
              rel='noreferrer noopener'
              className='text-slate-900 dark:text-white border-transparent border-b-2 hover:border-slate-900 dark:hover:border-white text-center'
            >
              {t('main.ukrSupport')}
            </a>
            <ArrowTopRightOnSquareIcon className='h-4 w-4 text-slate-800 dark:text-white ml-1 hidden md:block' />
          </div>
          <div
            className='relative pt-10 lg:pt-24 pb-5 xl:px-8 lg:px-6 sm:px-3 mx-auto min-h-[740px]'
          >
            <div className='relative z-20 flex flex-row content-between 2xl:mr-[14vw] 2xl:justify-center justify-center lg:justify-start'>
              <div className='lg:mt-0 text-left relative lg:mr-14 px-4'>
                <h1 className='max-w-2xl text-3xl sm:text-5xl md:text-5xl font-extrabold text-slate-900 dark:text-white sm:leading-none lg:text-5xl xl:text-6xl xl:leading-[110%]'>
                  <Trans
                    // @ts-ignore
                    t={t}
                    i18nKey='main.slogan'
                    components={{
                      span: <span className='from-indigo-700 to-indigo-700 dark:from-indigo-600 dark:to-indigo-400 text-transparent bg-clip-text bg-gradient-to-r' />,
                    }}
                  />
                </h1>
                <div className='flex items-center overflow-hidden mt-2 mb-2 sm:text-xl lg:text-lg xl:text-lg'>
                  <p className='rounded-full bg-indigo-500/10 px-3 py-1 text-sm text-center font-semibold leading-6 text-indigo-600 dark:text-indigo-400 ring-1 ring-inset ring-indigo-500/20'>
                    Latest news
                  </p>
                  {_isEmpty(lastBlogPost) ? (
                    <div className='h-6 ml-1 bg-slate-300 dark:bg-slate-700 w-80 rounded-md animate-pulse' />
                  ) : (
                    <ClientOnly fallback={<div className='h-6 ml-1 bg-slate-300 dark:bg-slate-700 w-80 rounded-md animate-pulse' />}>
                      {() => (
                        <a
                          className='inline-flex ml-1 items-center space-x-1 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-300 hover:underline'
                          href={`${BLOG_URL}post/${lastBlogPost.url_path}`}
                          target='_blank'
                          rel='noopener noreferrer'
                        >
                          <span>
                            {lastBlogPost.title}
                          </span>
                          <ChevronRightIcon className='h-4 w-4 text-slate-500' aria-hidden='true' />
                        </a>
                      )}
                    </ClientOnly>
                  )}
                </div>
                <p className='text-base text-slate-700 dark:text-slate-300 sm:text-xl lg:text-lg xl:text-lg'>
                  {t('main.description')}
                  <br />
                  {t('main.trackEveryMetric')}
                </p>
                <div className='mt-10 flex flex-col items-center sm:flex-row'>
                  <Link
                    to={routesPath.signup}
                    className='rounded-md !duration-300 transition-all w-full sm:max-w-[210px] h-12 flex items-center justify-center sm:mr-6 shadow-sm ring-1 text-white bg-slate-900 ring-slate-900 hover:bg-slate-700 dark:bg-indigo-700 dark:ring-indigo-700 dark:hover:bg-indigo-600'
                    aria-label={t('titles.signup')}
                  >
                    <span className='text-base font-semibold mr-1'>
                      {t('common.getStarted')}
                    </span>
                    <ArrowSmallRightIcon className='h-4 w-5 mt-[1px]' />
                  </Link>
                  <a
                    href={LIVE_DEMO_URL}
                    className='rounded-md !duration-300 transition-all sm:mt-0 mt-2 ring-1 ring-slate-900 dark:ring-white/20 w-full sm:max-w-[210px] h-12 flex items-center justify-center shadow-sm text-slate-900 dark:text-white bg-transparent hover:bg-slate-200 dark:hover:bg-gray-800'
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
                  <img
                    src={theme === 'dark' ? '/assets/screenshot_dark.png' : '/assets/screenshot_light.png'}
                    className='h-full min-w-[880px] rounded-xl relative shadow-2xl ring-1 ring-gray-900/10 dark:ring-white/10'
                    width='100%'
                    height='auto'
                    alt='Swetrix Analytics dashboard'
                  />
                </picture>
              </div>
            </div>
            <div className='my-10 block lg:hidden relative z-20 px-4 md:px-0'>
              <picture>
                <source srcSet={theme === 'dark' ? '/assets/screenshot_dark.webp' : '/assets/screenshot_light.webp'} type='image/webp' />
                <img
                  src={theme === 'dark' ? '/assets/screenshot_dark.png' : '/assets/screenshot_light.png'}
                  className='rounded-xl relative shadow-2xl w-full ring-1 ring-gray-900/10 dark:ring-white/10'
                  width='100%'
                  height='auto'
                  alt='Swetrix Analytics dashboard'
                />
              </picture>
            </div>
          </div>
        </div>
        {/* end first block with live demo */}
        {/* section Core Analytics Features */}
        <div className='dark:bg-slate-900 bg-white px-4 pb-24'>
          <section className='flex pt-16 md:pt-48 flex-col-reverse md:flex-row items-center md:items-start md:justify-between max-w-7xl m-auto'>
            <picture>
              <source srcSet='/assets/CoreFeaturesLight.webp' type='image/webp' />
              <img src='/assets/CoreFeaturesLight.png' className='md:max-w-md md:mr-3 mt-3 md:mt-0 lg:max-w-full md:relative md:-top-10' alt='Core Analytics Features' />
            </picture>
            <div className='max-w-lg'>
              <h2 className='font-extrabold text-4xl dark:text-white text-slate-900'>
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
          <section className='flex flex-col md:flex-row items-center md:justify-between max-w-7xl m-auto'>
            <div className='max-w-[516px]'>
              <h2 className='font-extrabold text-4xl text-slate-900 dark:text-white'>
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
          <section className='flex pt-20 md:pt-28 flex-col-reverse md:flex-row items-center md:items-start md:justify-between max-w-7xl m-auto'>
            <img className='md:max-w-[360px] md:mr-3 mt-3 md:mt-0 lg:max-w-lg' src='/assets/gdpr.svg' alt='GDPR compliant' />
            <div className='max-w-[516px] w-full md:min-w-[370px] pb-16 md:pb-0 md:pt-8'>
              <h2 className='font-extrabold mb-6 text-4xl text-slate-900 dark:text-white'>
                {t('main.privacy.title')}
              </h2>
              {_map(t('main.privacy.list', { returnObjects: true }), (item: {
                label: string
                desc: string
              }) => (
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
              {/* mt-7 because mb-4 in upper component + mt-7 = 11. mb-11 is used for spacing the links in other sections. */}
              <Link to={routesPath.privacy} className='mt-7 dark:text-indigo-400 text-indigo-700 hover:underline font-bold border-0 flex items-center' aria-label={t('footer.pp')}>
                {t('main.dataProtection')}
                <ArrowSmallRightIcon className='w-5 h-4 mt-[1px]' />
              </Link>
            </div>
          </section>
          {/* end section Privacy compliance. */}
        </div>
        {/*  block singup */}
        {!authenticated && (
          <div className='overflow-x-clip'>
            <div className='py-20 max-w-7xl w-full flex justify-center md:justify-between items-center mx-auto px-5 relative isolate'>
              <div
                className='absolute inset-x-0 -top-3 -z-10 transform-gpu overflow-hidden px-36 blur-3xl'
                aria-hidden='true'
              >
                <div
                  className='mx-auto aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30'
                  style={{
                    clipPath:
                      'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                  }}
                />
              </div>
              <div className='relative z-50 lg:col-span-6 rounded-xl'>
                <div className='bg-white dark:bg-slate-800/20 ring-1 ring-slate-200 dark:ring-slate-800 sm:max-w-md sm:w-full sm:mx-auto sm:rounded-lg sm:overflow-hidden'>
                  <div className='px-4 py-8 sm:px-10'>
                    <p className='text-lg text-gray-900 dark:text-white text-center md:text-xl font-semibold'>
                      {t('main.signup')}
                    </p>
                    <div className='mt-6'>
                      <SignUp ssrTheme={ssrTheme} />
                    </div>
                  </div>
                  <div className='px-4 sm:px-10'>
                    <div className='py-6 bg-transparent border-t border-gray-200 dark:border-slate-700'>
                      <p className='text-xs leading-5 text-gray-500 dark:text-gray-100'>
                        <Trans
                          // @ts-ignore
                          t={t}
                          i18nKey='main.signupTerms'
                          components={{
                            tos: <Link to={routesPath.terms} className='font-medium text-gray-900 dark:text-gray-300 hover:underline' aria-label={t('footer.tos')} />,
                            pp: <Link to={routesPath.privacy} className='font-medium text-gray-900 dark:text-gray-300 hover:underline' aria-label={t('footer.pp')} />,
                          }}
                        />
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className='relative'>
                <picture>
                  <source srcSet={theme === 'dark' ? '/assets/section-signup-dark.webp' : '/assets/section-signup-light.webp'} type='image/webp' />
                  <img
                    src={theme === 'dark' ? '/assets/section-signup-dark.png' : '/assets/section-signup-light.png'}
                    className='relative z-50 hidden md:block'
                    alt='Swetrix Dashboard overview'
                  />
                </picture>
              </div>
            </div>
          </div>
        )}
        {/* end block singup */}
        {/* Core features section */}
        <section className='bg-white dark:bg-slate-900 pt-14 relative pb-14'>
          <BackgroundSvg theme={theme} className='absolute -left-8' type='shapes' />
          <div className='mx-auto text-slate-900 font-extrabold text-3xl sm:text-5xl w-fit relative'>
            <h2 className='relative z-20 dark:text-white'>
              {t('main.coreFeaturesBlock')}
            </h2>
            <BackgroundSvg theme={theme} className='absolute right-0 sm:-right-16 top-9 z-10 opacity-30' type='semicircle' />
          </div>
          <div className='mt-[60px] flex items-center max-w-7xl w-full mx-auto flex-wrap justify-center xl:justify-between'>
            {_map(t('main.features', { returnObjects: true }), (item: {
              name: string
              desc: string
            }, index: number) => (
              <div key={item.name} className='w-[416px] h-64 px-7 py-11 text-center'>
                <span className='text-indigo-500 text-3xl font-semibold'>{1 + index}</span>
                <div className='mt-2'>
                  <h2 className='text-slate-900 dark:text-white text-xl font-semibold max-w-[300px] mx-auto mb-3 whitespace-pre-line'>{item.name}</h2>
                  <p className='text-gray-500 max-w-xs mx-auto dark:text-gray-400'>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <BackgroundSvg theme={theme} className='absolute right-0 bottom-0 z-10' type='twolinecircle' />
        </section>
        {/* end Core features section */}
        {/* section supports */}
        <section className='bg-white dark:bg-slate-900 pt-24 sm:px-5 px-3 relative'>
          <h2 className='mx-auto text-slate-900 dark:text-white font-bold text-3xl sm:ext-5xl w-fit text-center'>
            {t('main.supports')}
          </h2>
          <div className='mt-20 grid sm:grid-cols-4 md:grid-cols-6 grid-cols-3 gap-x-4 gap-y-10 justify-items-center items-center lg:gap-x-10 lg:gap-y-16 max-w-7xl w-full mx-auto justify-between'>
            <Telegram className='max-w-[64px] sm:max-w-[150px] max-h-16' />
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
          <div className='relative w-full mx-auto pt-10 mt-10 isolate'>
            <svg
              className='absolute w-full inset-0 -z-10 hidden h-full stroke-gray-200 dark:stroke-white/10 [mask-image:radial-gradient(64rem_64rem_at_top,white,transparent)] sm:block'
              aria-hidden='true'
            >
              <defs>
                <pattern
                  id='rect-pattern-2'
                  width={200}
                  height={200}
                  x='50%'
                  y={0}
                  patternUnits='userSpaceOnUse'
                >
                  <path d='M.5 200V.5H200' fill='none' />
                </pattern>
              </defs>
              <svg x='50%' y={0} className='overflow-visible fill-gray-50 dark:fill-slate-800/30'>
                <path
                  d='M-200.5 0h201v201h-201Z M599.5 0h201v201h-201Z M399.5 400h201v201h-201Z M-400.5 600h201v201h-201Z'
                  strokeWidth={0}
                />
              </svg>
              <rect width='100%' height='100%' strokeWidth={0} fill='url(#rect-pattern-2)' />
            </svg>
            <section className='relative z-20 px-3 max-w-7xl mx-auto'>
              <h2 className='mt-20 text-center text-3xl sm:text-5xl text-slate-900 dark:text-white font-extrabold max-w-lg w-full mx-auto'>
                {t('main.marketplaceBlock')}
              </h2>
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-10 sm:gap-y-24 justify-between justify-items-center text-slate-900 dark:text-white pt-20 pb-36'>
                {_map(t('main.mFeatures', { returnObjects: true }), (item: {
                  name: string
                  desc: string
                }, index: number) => (
                  <div key={item.name} className='max-w-[310px] w-full'>
                    <div className='flex items-center'>
                      <span className='text-slate-900 dark:text-gray-200 text-xl mr-4'>
                        {M_FEATURES_ICONS[index]}
                      </span>
                      <h2 className='font-semibold text-xl'>
                        {item.name}
                      </h2>
                    </div>
                    <p className='pl-9 text-slate-700 dark:text-gray-300'>{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
        {/* end Marketplace and extension features */}

        {/* For now let's hide Pricing for authenticated users on the main page as the Paddle script only loads on the Billing page */}
        {!authenticated && (
          <Pricing authenticated={false} t={t} language={language} />
        )}

        {/* section: Why use Swetrix when there is .... */}
        <div className='overflow-hidden'>
          <div className='relative max-w-7xl w-full mx-auto isolate'>
            <div
              className='absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2 transform-gpu overflow-hidden opacity-30 blur-3xl'
              aria-hidden='true'
            >
              <div
                className='ml-[max(50%,38rem)] aspect-[1313/771] w-[82.0625rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc]'
                style={{
                  clipPath:
                    'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                }}
              />
            </div>
            <div
              className='absolute inset-x-0 top-0 -z-10 flex transform-gpu overflow-hidden pt-8 opacity-25 blur-3xl xl:justify-end'
              aria-hidden='true'
            >
              <div
                className='ml-[-22rem] aspect-[1313/771] w-[82.0625rem] flex-none origin-top-right rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] xl:ml-0 xl:mr-[calc(50%-12rem)]'
                style={{
                  clipPath:
                    'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                }}
              />
            </div>
            <section className='relative z-20 px-3'>
              <h1 className='mt-20 text-center h-8 mb-5 text-3xl sm:text-5xl text-slate-900 dark:text-white font-extrabold max-w-prose w-full mx-auto'>
                <Trans
                  // @ts-ignore
                  t={t}
                  i18nKey='main.whyUseSwetrix'
                  components={{
                    // eslint-disable-next-line jsx-a11y/anchor-has-content
                    competitor: (
                      <TypeAnimation
                        sequence={processedList}
                        className='text-slate-500 dark:text-gray-400'
                        wrapper='span'
                        speed={10}
                        repeat={Infinity}
                        cursor
                      />
                    ),
                    swetrix: <span className='text-indigo-600 dark:text-indigo-500'>Swetrix</span>,
                  }}
                />
              </h1>
              <div className='py-20 text-lg text-gray-50 tracking-tight'>
                <div className='mt-2 flex flex-col'>
                  <div className='-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8'>
                    <div className='inline-block min-w-full py-2 align-middle md:px-6 lg:px-8'>
                      <div className='overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg'>
                        <table className='w-full min-w-full divide-y divide-slate-500'>
                          <thead className='bg-gray-100 dark:bg-slate-800'>
                            <tr>
                              <th />
                              {_map(SWETRIX_AND_COMPETITORS_LIST, (item, key) => (
                                <th
                                  scope='col'
                                  key={key}
                                  className='w-1/6 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-800 dark:text-gray-50 sm:pl-6'
                                >
                                  {item}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className='divide-y divide-slate-300 dark:divide-slate-700 bg-gray-50 dark:bg-slate-800'>
                            {_map(COMPETITOR_FEATURE_TABLE.Swetrix, (_, key) => (
                              <tr key={key}>
                                <td className='w-1/6 px-3 py-4 text-sm text-slate-700 dark:text-gray-50 sm:pl-6'>
                                  {t(key)}
                                </td>
                                {_map(SWETRIX_AND_COMPETITORS_LIST, (service) => (
                                  <td
                                    key={`${key}-${service}`}
                                    className='w-1/6 px-3 py-4 text-sm text-gray-50 sm:pl-6'
                                  >
                                    {COMPETITOR_FEATURE_TABLE[service][key] && (
                                      <CheckIcon className='flex-shrink-0 h-5 w-5 text-green-600 dark:text-green-500' aria-label={t('common.yes')} />
                                    )}
                                    {COMPETITOR_FEATURE_TABLE[service][key] === false && (
                                      <XMarkIcon className='flex-shrink-0 h-5 w-5 text-red-600 dark:text-red-500' aria-label={t('common.no')} />
                                    )}
                                    {COMPETITOR_FEATURE_TABLE[service][key] === null && (
                                      <p className='text-slate-700 dark:text-gray-50 h-5 w-5 text-center'>
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
          </div>
        </div>

        {/* section Testimonials */}
        <section className='bg-white dark:bg-slate-900 pt-20 pb-20 relative'>
          <div className='absolute right-0 top-0'>
            <BackgroundSvg theme={theme} type='twolinecircle2' />
          </div>
          <div className='absolute rotate-[135deg] left-0 z-0'>
            <BackgroundSvg theme={theme} type='shapes' />
          </div>
          <div className='max-w-[1000px] w-full mx-auto'>
            <h2 className='text-slate-900 text-center font-extrabold text-5xl relative z-20 dark:text-white'>
              {t('main.testimonials')}
            </h2>
            <div className='flex items-center flex-col md:flex-row justify-between mt-16'>
              {_map(t('main.lTestimonials', { returnObjects: true }), (item: {
                name: string;
                role: string;
                desc: string;
              }, index: number) => (
                <div
                  key={item.name}
                  className={cx('max-w-xs w-full dark:bg-slate-900', {
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
                    <p className='text-slate-900 dark:text-white text-md text mt-2 leading-9 whitespace-pre-line'>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* end section Testimonials */}

        <div className='bg-white dark:bg-slate-900 px-4 md:px-8 pb-12'>
          <section className='relative isolate max-w-7xl w-full mx-auto bg-slate-800 overflow-hidden lg:h-[450px]' style={{ borderRadius: '100px 30px 30px 30px' }}>
            <div className='absolute -z-10 inset-0 overflow-hidden' aria-hidden='true'>
              <div className='absolute left-[calc(20%-19rem)] top-[calc(50%-36rem)] transform-gpu blur-3xl'>
                <div
                  className='aspect-[1097/1023] w-[68.5625rem] bg-gradient-to-r from-[#ff4694] to-[#776fff] opacity-25 dark:opacity-10'
                  style={{
                    clipPath:
                      'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                  }}
                />
              </div>
            </div>
            <div className='flex items-start justify-between pt-8 pl-8 sm:pl-14 lg:pl-28 md:flex-row flex-col'>
              <div className='max-w-[430px] w-full pt-14 pr-3 mb-16 md:mb-0'>
                <h2 className='font-bold text-2xl leading-9 sm:text-4xl sm:leading-[48px] md:text-[28px] md:leading-10 lg:text-[33px] lg:leading-[48px] text-white mb-3'>
                  <Trans
                    // @ts-ignore
                    t={t}
                    i18nKey='main.os'
                    components={{
                      // eslint-disable-next-line jsx-a11y/anchor-has-content
                      gradi: <span className='text-transparent !bg-clip-text' style={{ background: 'linear-gradient(91.37deg, #4E46DD 10%, #5C3CDA 55%, #A274EF 100%)' }} />,
                    }}
                  />
                </h2>
                <p className='text-gray-300 mb-9 font-medium text-base sm:text-lg'>
                  {t('main.demoGeoReports')}
                </p>
                <Link to={routesPath.signup} className='rounded-md border !duration-300 transition-all w-full max-w-[210px] h-[50px] flex items-center justify-center sm:mr-6 shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 border-transparent' aria-label={t('titles.signup')}>
                  <span className='text-base font-semibold mr-1'>{t('main.start')}</span>
                  <ArrowSmallRightIcon className='w-5 h-4 mt-[1px]' />
                </Link>
              </div>
              <div className='max-w-md xl:max-w-lg block h-[450px] md:shadow-[8px_8px_10px_3px] md:rounded-md '>
                <img
                  className='rounded-xl ring-1 ring-gray-900/10'
                  style={{ minHeight: '600px', minWidth: '880px' }}
                  src={theme === 'dark' ? '/assets/screenshot_dark.png' : '/assets/screenshot_light.png'}
                  width='100%'
                  height='auto'
                  alt='Swetrix Analytics dashboard'
                />
              </div>
            </div>
          </section>
        </div>

        {/* Advantages of using open source */}
        <section className='flex items-center lg:flex-row flex-col-reverse justify-between max-w-7xl w-full mx-auto py-20 lg:py-32 px-5'>
          <picture>
            <source srcSet={theme === 'dark' ? '/assets/opensource_dark.webp' : '/assets/opensource_light.webp'} type='image/webp' />
            <img
              className='ring-1 md:max-w-xl ring-gray-900/10 dark:ring-white/10 rounded-xl'
              src={theme === 'dark' ? '/assets/opensource_dark.png' : '/assets/opensource_light.png'}
              loading='lazy'
              alt='Swetrix open source'
            />
          </picture>
          <div className='max-w-lg w-full lg:ml-5'>
            <h2 className='text-3xl md:text-4xl text-slate-900 dark:text-white font-extrabold'>
              <Trans
                // @ts-ignore
                t={t}
                i18nKey='main.opensourceAdv'
                components={{
                  // eslint-disable-next-line jsx-a11y/anchor-has-content
                  url: <a href={GITHUB_URL} className='hover:underline' target='_blank' rel='noopener noreferrer' aria-label='Source code (opens in a new tab)' />,
                }}
              />
            </h2>
            <hr className='border-slate-300 dark:border-slate-700 border-1 max-w-[346px] my-6' />
            <div className='max-w-md w-full lg:mb-0 mb-9'>
              {_map(t('main.opensource', { returnObjects: true }), (item: {
                desc: string
              }) => (
                <p key={item.desc} className='text-slate-700 dark:text-gray-300 text-sm leading-6 flex items-center mb-3'>
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
        <section className='bg-white dark:bg-slate-900 pt-20 pb-44 relative'>
          <div className='absolute right-0 top-16 z-0'>
            <BackgroundSvg theme={theme} type='threecircle' />
          </div>
          <div className='absolute -left-9 top-52 rotate-90'>
            <BackgroundSvg theme={theme} type='shapes' />
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
                <ClientOnly fallback={<p className='text-indigo-700 text-5xl font-extrabold text-center'>0</p>}>
                  {() => (
                    <p className='text-indigo-700 text-5xl font-extrabold text-center'>
                      {users[0]}
                      {users[1] && (
                        <span className='text-gray-900 dark:text-indigo-200'>
                          {users[1]}
                          +
                        </span>
                      )}
                    </p>
                  )}
                </ClientOnly>
                <p className='text-gray-600 text-lg dark:text-gray-200'>
                  {t('main.users')}
                </p>
              </div>
              <div className='bg-gray-800 dark:bg-gray-200 w-2 h-2 rounded-full mx-5 mb-14 mt-16 md:mb-0 md:mt-0' />
              <div className='text-center'>
                <ClientOnly fallback={<p className='text-indigo-700 text-5xl font-extrabold text-center'>0</p>}>
                  {() => (
                    <p className='text-indigo-700 text-5xl font-extrabold text-center'>
                      {websites[0]}
                      {websites[1] && (
                        <span className='text-gray-900 dark:text-indigo-200'>
                          {websites[1]}
                          +
                        </span>
                      )}
                    </p>
                  )}
                </ClientOnly>
                <p className='text-gray-600 text-lg dark:text-gray-200'>
                  {t('main.websites')}
                </p>
              </div>
              <div className='bg-gray-800 dark:bg-gray-200 w-2 h-2 rounded-full mx-5 mb-14 mt-16 md:mb-0 md:mt-0' />
              <div className='text-center'>
                <ClientOnly fallback={<p className='text-indigo-700 text-5xl font-extrabold text-center'>0</p>}>
                  {() => (
                    <p className='text-indigo-700 text-5xl font-extrabold text-center'>
                      {events[0]}
                      {events[1] && (
                        <span className='text-gray-900 dark:text-indigo-200'>
                          {events[1]}
                          +
                        </span>
                      )}
                    </p>
                  )}
                </ClientOnly>
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
  )
}

export default memo(Main)
