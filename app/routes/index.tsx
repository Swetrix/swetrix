import type { LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Link } from '@remix-run/react'
import { json, redirect } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

import { detectTheme, isAuthenticated } from 'utils/server'

import { useTranslation, Trans } from 'react-i18next'
import { useSelector } from 'react-redux'
import { ClientOnly } from 'remix-utils/client-only'
import { ArrowTopRightOnSquareIcon, CheckCircleIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import {
  CodeBracketIcon,
  PuzzlePieceIcon,
  ShareIcon,
  ArrowsPointingOutIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ArrowRightIcon,
} from '@heroicons/react/20/solid'
import { TypeAnimation } from 'react-type-animation'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'

import routesPath from 'routesPath'
import { getAccessToken } from 'utils/accessToken'
import { nFormatterSeparated } from 'utils/generic'
import { GITHUB_URL, MARKETPLACE_URL, LIVE_DEMO_URL, BOOK_A_CALL_URL, isBrowser, isSelfhosted } from 'redux/constants'
import { StateType } from 'redux/store/index'
import BackgroundSvg from 'ui/icons/BackgroundSvg'
import Webflow from 'ui/icons/Webflow'
import NextJS from 'ui/icons/NextJS'
import NuxtJS from 'ui/icons/NuxtJS'
import Angular from 'ui/icons/Angular'
import ReactSVG from 'ui/icons/ReactSVG'
import Telegram from 'ui/icons/Telegram'
import Wordpress from 'ui/icons/Wordpress'
import Cloudflare from 'ui/icons/Cloudflare'
import Notion from 'ui/icons/Notion'
import Ghost from 'ui/icons/Ghost'
import Gatsby from 'ui/icons/Gatsby'
import Wix from 'ui/icons/Wix'

import Header from 'components/Header'
import SignUp from 'pages/Auth/Signup/BasicSignup'
import Pricing from 'components/marketing/Pricing'
import { PROCESSED_COMPETITORS_LIST, ComparisonTable } from 'components/marketing/ComparisonTable'
import { DitchGoogle } from 'components/marketing/DitchGoogle'
import { Lines } from 'components/marketing/Lines'

export const sitemap: SitemapFunction = () => ({
  priority: 1,
  exclude: isSelfhosted,
})

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const [theme] = detectTheme(request)
  const isAuth = isAuthenticated(request)

  return json({ theme, isAuth })
}

const M_FEATURES_ICONS = [
  <ArrowsPointingOutIcon className='h-5 w-5' key='ArrowsPointingOutIcon' />,
  <CodeBracketIcon className='h-5 w-5' key='CodeBracketIcon' />,
  <PuzzlePieceIcon className='h-5 w-5' key='PuzzlePieceIcon' />,
  <ArrowTrendingUpIcon className='h-5 w-5' key='ArrowTrendingUpIcon' />,
  <LightBulbIcon className='h-5 w-5' key='LightBulbIcon' />,
  <ShareIcon className='h-5 w-5' key='ShareIcon' />,
]

const TrustedBy = () => {
  const { t } = useTranslation('common')

  return (
    <div className='bg-white py-16 dark:bg-slate-900'>
      <div className='mx-auto max-w-7xl px-6 lg:px-8'>
        <h2 className='text-center text-lg font-semibold leading-8 text-gray-900 dark:text-gray-50'>
          {t('main.trustedBy')}
        </h2>
        <div className='mx-auto mt-10 grid max-w-lg grid-cols-4 items-center gap-x-8 gap-y-10 sm:max-w-xl sm:grid-cols-6 sm:gap-x-10 lg:mx-0 lg:max-w-none lg:grid-cols-5'>
          <img
            alt='STELP'
            src='/assets/users/stelp.png'
            width={158}
            height={48}
            className='col-span-2 max-h-12 w-full object-contain dark:invert lg:col-span-1'
          />
          <img
            alt='Datakyu'
            src='/assets/users/datakyu.svg'
            width={158}
            height={48}
            className='col-span-2 max-h-12 w-full object-contain dark:invert lg:col-span-1'
          />
          <img
            alt='Cardano Foundation'
            src='/assets/users/cardano-foundation.svg'
            width={158}
            height={48}
            className='col-span-2 max-h-12 w-full object-contain dark:invert lg:col-span-1'
          />
          <img
            alt='Casterlabs'
            src='/assets/users/casterlabs.svg'
            width={158}
            height={48}
            className='col-span-2 max-h-12 w-full object-contain dark:invert sm:col-start-2 lg:col-span-1'
          />
          <img
            alt='Phalcode'
            src='/assets/users/phalcode.svg'
            width={158}
            height={48}
            className='col-span-2 col-start-2 max-h-12 w-full object-contain dark:invert sm:col-start-auto lg:col-span-1'
          />
        </div>
      </div>
    </div>
  )
}

const SupportUkraine = () => {
  const { t } = useTranslation('common')

  return (
    <div className='flex items-center justify-center px-2 py-2'>
      <a
        href='https://u24.gov.ua/'
        target='_blank'
        rel='noreferrer noopener'
        className='border-b-2 border-transparent text-center text-slate-900 hover:border-slate-900 dark:text-white dark:hover:border-white'
      >
        {t('main.ukrSupport')}
      </a>
      <ArrowTopRightOnSquareIcon className='ml-1 hidden h-4 w-4 text-slate-800 dark:text-white md:block' />
    </div>
  )
}

interface IFeedback {
  name: string
  title: string
  feedback: string
  logoUrl: string
  photoUrl: string
}

const Feedback = ({ name, title, feedback, logoUrl, photoUrl }: IFeedback) => (
  <section className='relative isolate bg-white px-6 py-24 dark:bg-slate-900 sm:py-32 lg:px-8'>
    <div className='absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.indigo.100),white)] opacity-20 blur-3xl dark:bg-[radial-gradient(45rem_50rem_at_top,theme(colors.indigo.400),theme(colors.slate.900))]' />
    <div className='absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] border-r-2 border-slate-900/10 bg-white dark:border-slate-50/50 dark:bg-slate-900 sm:mr-28 lg:mr-0 xl:mr-16 xl:origin-center' />
    <div className='mx-auto max-w-2xl lg:max-w-4xl'>
      <img alt='' src={logoUrl} className='mx-auto h-12' />
      <figure className='mt-10'>
        <blockquote className='text-center text-xl font-semibold leading-8 text-gray-900 dark:text-gray-50 sm:text-2xl sm:leading-9'>
          <p>{`“${feedback}”`}</p>
        </blockquote>
        <figcaption className='mt-10'>
          <img alt='' src={photoUrl} className='mx-auto h-10 w-10 rounded-full' />
          <div className='mt-4 flex items-center justify-center space-x-3 text-base'>
            <p className='font-semibold text-gray-900 dark:text-gray-50'>{name}</p>
            <svg width={3} height={3} viewBox='0 0 2 2' aria-hidden='true' className='fill-gray-900'>
              <circle r={1} cx={1} cy={1} />
            </svg>
            <p className='text-gray-600 dark:text-gray-200'>{title}</p>
          </div>
        </figcaption>
      </figure>
    </div>
  </section>
)

const PeopleLoveSwetrix = ({ theme }: { theme: 'dark' | 'light' }) => {
  const { t } = useTranslation('common')
  const { stats } = useSelector((state: StateType) => state.ui.misc)

  const events = nFormatterSeparated(Number(stats.events))
  const users = nFormatterSeparated(Number(stats.users))
  const websites = nFormatterSeparated(Number(stats.projects))

  return (
    <section className='relative bg-white pb-44 pt-20 dark:bg-slate-900'>
      <div className='absolute right-0 top-16 z-0'>
        <BackgroundSvg theme={theme} type='threecircle' />
      </div>
      <div className='absolute -left-9 top-52 rotate-90'>
        <BackgroundSvg theme={theme} type='shapes' />
      </div>
      <div className='mx-auto w-full max-w-5xl px-3'>
        <div className='mx-auto w-full max-w-prose'>
          <h2 className='text-center text-4xl font-extrabold text-gray-900 dark:text-white md:text-4xl'>
            {t('main.peopleLoveSwetrix')}
          </h2>
          <p className='mx-auto mt-5 max-w-prose text-center text-xl text-gray-600 dark:text-gray-200'>
            {t('main.whyPeopleLoveSwetrix')}
          </p>
        </div>
        <div className='mt-20 flex flex-col items-center justify-between md:mt-32 md:flex-row'>
          <div className='text-center'>
            <ClientOnly fallback={<p className='text-center text-5xl font-extrabold text-indigo-700'>0</p>}>
              {() => (
                <p className='text-center text-5xl font-extrabold text-indigo-700'>
                  {users[0]}
                  {users[1] && <span className='text-gray-900 dark:text-indigo-200'>{users[1]}+</span>}
                </p>
              )}
            </ClientOnly>
            <p className='text-lg text-gray-600 dark:text-gray-200'>{t('main.users')}</p>
          </div>
          <div className='mx-5 mb-14 mt-16 h-2 w-2 rounded-full bg-gray-800 dark:bg-gray-200 md:mb-0 md:mt-0' />
          <div className='text-center'>
            <ClientOnly fallback={<p className='text-center text-5xl font-extrabold text-indigo-700'>0</p>}>
              {() => (
                <p className='text-center text-5xl font-extrabold text-indigo-700'>
                  {websites[0]}
                  {websites[1] && <span className='text-gray-900 dark:text-indigo-200'>{websites[1]}+</span>}
                </p>
              )}
            </ClientOnly>
            <p className='text-lg text-gray-600 dark:text-gray-200'>{t('main.websites')}</p>
          </div>
          <div className='mx-5 mb-14 mt-16 h-2 w-2 rounded-full bg-gray-800 dark:bg-gray-200 md:mb-0 md:mt-0' />
          <div className='text-center'>
            <ClientOnly fallback={<p className='text-center text-5xl font-extrabold text-indigo-700'>0</p>}>
              {() => (
                <p className='text-center text-5xl font-extrabold text-indigo-700'>
                  {events[0]}
                  {events[1] && <span className='text-gray-900 dark:text-indigo-200'>{events[1]}+</span>}
                </p>
              )}
            </ClientOnly>
            <p className='text-lg text-gray-600 dark:text-gray-200'>{t('main.pageviews')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

const FeatureGallery = ({ theme }: { theme: 'dark' | 'light' }) => {
  const { t } = useTranslation('common')

  return (
    <div className='space-y-16 bg-white px-4 py-16 dark:bg-slate-900'>
      <section
        id='core-analytics'
        className='m-auto flex max-w-7xl flex-col-reverse items-center md:flex-row md:items-start md:justify-between'
      >
        <picture>
          <source
            srcSet={theme === 'dark' ? '/assets/CoreFeaturesDark.webp' : '/assets/CoreFeaturesLight.webp'}
            type='image/webp'
          />
          <img
            src={theme === 'dark' ? '/assets/CoreFeaturesDark.png' : '/assets/CoreFeaturesLight.png'}
            className='mt-3 md:mr-3 md:mt-0 md:w-[450px] lg:w-[640px]'
            width='450'
            height='320'
            alt='Core Analytics Features'
          />
        </picture>
        <div className='max-w-lg md:ml-5'>
          <h2 className='text-4xl font-extrabold text-slate-900 dark:text-white'>{t('main.coreFeatures.title')}</h2>
          <p className='mb-6 mt-6 text-gray-600 dark:text-gray-400'>{t('main.coreFeatures.desc')}</p>
          <a
            href={LIVE_DEMO_URL}
            className='flex max-w-max items-center border-0 font-bold text-indigo-700 hover:underline dark:text-indigo-400'
            target='_blank'
            rel='noopener noreferrer'
            aria-label={`${t('common.liveDemo')} (opens in a new tab)`}
          >
            {t('common.liveDemo')}
            <ArrowRightIcon className='mt-[1px] h-4 w-5' />
          </a>
        </div>
      </section>
      <section className='m-auto flex max-w-7xl flex-col items-center md:flex-row md:justify-between'>
        <div className='max-w-[516px]'>
          <h2 className='text-4xl font-extrabold text-slate-900 dark:text-white'>{t('main.marketplace.title')}</h2>
          <p className='mb-3 mt-6 text-gray-600 dark:text-gray-400'>{t('main.marketplace.desc1')}</p>
          <p className='mb-6 text-gray-600 dark:text-gray-400'>{t('main.marketplace.desc2')}</p>
          <a
            href={MARKETPLACE_URL}
            className='flex max-w-max items-center border-0 font-bold text-indigo-700 hover:underline dark:text-indigo-400'
            target='_blank'
            rel='noopener noreferrer'
            aria-label='Swetrix Marketplace (opens in a new tab)'
          >
            {t('main.visitAddons')}
            <ArrowRightIcon className='mt-[1px] h-4 w-5' />
          </a>
        </div>
        <img
          src={
            theme === 'dark' ? '/assets/marketplace_extensions_dark.png' : '/assets/marketplace_extensions_light.png'
          }
          className='mt-3 md:mr-3 md:mt-0 md:w-[450px] lg:w-[640px]'
          width='450'
          height='320'
          alt='Marketplace illustration'
        />
      </section>
      <section className='m-auto flex max-w-7xl flex-col-reverse items-center md:flex-row md:items-start md:justify-between'>
        <img
          className='mt-3 md:mr-3 md:mt-0 md:w-[360px] lg:w-[512px]'
          width='360'
          height='210'
          src='/assets/gdpr.svg'
          alt='GDPR compliant'
        />
        <div className='w-full max-w-[516px] pb-16 md:min-w-[370px] md:pb-0 md:pt-8'>
          <h2 className='mb-6 text-4xl font-extrabold text-slate-900 dark:text-white'>{t('main.privacy.title')}</h2>
          {_map(t('main.privacy.list', { returnObjects: true }), (item: { label: string; desc: string }) => (
            <div key={item.label} className='mb-4 flex items-center'>
              <div className='mr-3'>
                <CheckCircleIcon className='h-[24px] w-[24px] fill-indigo-500' />
              </div>
              <p>
                <span className='dark:text-white'>{item.label}</span>
                <span className='ml-1 mr-1 dark:text-white'>-</span>
                <span className='text-gray-600 dark:text-gray-400'>{item.desc}</span>
              </p>
            </div>
          ))}
          {/* mt-7 because mb-4 in upper component + mt-7 = 11. mb-11 is used for spacing the links in other sections. */}
          <Link
            to={routesPath.privacy}
            className='mt-7 flex max-w-max items-center border-0 font-bold text-indigo-700 hover:underline dark:text-indigo-400'
            aria-label={t('footer.pp')}
          >
            {t('main.dataProtection')}
            <ArrowRightIcon className='mt-[1px] h-4 w-5' />
          </Link>
        </div>
      </section>
    </div>
  )
}

const OpensourceAdvantages = ({ theme }: { theme: 'dark' | 'light' }) => {
  const { t } = useTranslation('common')

  return (
    <section className='mx-auto flex w-full max-w-7xl flex-col-reverse items-center justify-between px-5 py-20 lg:flex-row lg:py-32'>
      <picture>
        <source
          srcSet={theme === 'dark' ? '/assets/opensource_dark.webp' : '/assets/opensource_light.webp'}
          type='image/webp'
        />
        <img
          className='rounded-xl ring-1 ring-gray-900/10 dark:ring-white/10'
          width='576'
          height='406'
          src={theme === 'dark' ? '/assets/opensource_dark.png' : '/assets/opensource_light.png'}
          loading='lazy'
          alt='Swetrix open source'
        />
      </picture>
      <div className='w-full max-w-lg lg:ml-5'>
        <h2 className='text-4xl font-extrabold text-slate-900 dark:text-white md:text-4xl'>
          <Trans
            t={t}
            i18nKey='main.opensourceAdv'
            components={{
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              url: (
                <a
                  href={GITHUB_URL}
                  className='hover:underline'
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='Source code (opens in a new tab)'
                />
              ),
            }}
          />
        </h2>
        <hr className='border-1 my-6 max-w-[346px] border-slate-300 dark:border-slate-700' />
        <div className='mb-9 w-full max-w-md lg:mb-0'>
          {_map(t('main.opensource', { returnObjects: true }), (item: { desc: string }) => (
            <p key={item.desc} className='mb-3 flex items-center text-sm leading-6 text-slate-700 dark:text-gray-300'>
              <span>
                <CheckCircleIcon className='mr-4 h-6 w-6 text-indigo-500' />
              </span>
              {item.desc}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}

const Comparison = () => {
  const { t } = useTranslation('common')

  return (
    <div className='overflow-hidden'>
      <div className='relative isolate mx-auto w-full max-w-7xl'>
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
          <h2 className='mx-auto mb-5 mt-20 h-8 w-full max-w-prose text-center text-3xl font-extrabold text-slate-900 dark:text-white sm:text-5xl'>
            <Trans
              t={t}
              i18nKey='main.whyUseSwetrix'
              components={{
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                competitor: (
                  <TypeAnimation
                    sequence={PROCESSED_COMPETITORS_LIST}
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
          </h2>
          <ComparisonTable />
        </section>
      </div>
    </div>
  )
}

const Marketplace = () => {
  const { t } = useTranslation('common')

  return (
    <div className='overflow-hidden'>
      <div className='relative isolate mx-auto mt-10 w-full pt-10'>
        <svg
          className='absolute inset-0 -z-10 hidden h-full w-full stroke-gray-200 [mask-image:radial-gradient(64rem_64rem_at_top,white,transparent)] dark:stroke-white/10 sm:block'
          aria-hidden='true'
        >
          <defs>
            <pattern id='rect-pattern-2' width={200} height={200} x='50%' y={0} patternUnits='userSpaceOnUse'>
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
        <section className='relative z-20 mx-auto max-w-7xl px-3'>
          <h2 className='mx-auto mt-20 w-full max-w-lg text-center text-4xl font-extrabold text-slate-900 dark:text-white sm:text-5xl'>
            {t('main.marketplaceBlock')}
          </h2>
          <div className='grid grid-cols-1 justify-between justify-items-center gap-y-10 pb-36 pt-20 text-slate-900 dark:text-white sm:grid-cols-2 sm:gap-y-24 md:grid-cols-3'>
            {_map(
              // @ts-expect-error
              t('main.mFeatures', { returnObjects: true }),
              (
                item: {
                  name: string
                  desc: string
                },
                index: number,
              ) => (
                <div key={item.name} className='w-full max-w-[310px]'>
                  <div className='flex items-center'>
                    <span className='mr-4 text-xl text-slate-900 dark:text-gray-200'>{M_FEATURES_ICONS[index]}</span>
                    <h2 className='text-xl font-semibold'>{item.name}</h2>
                  </div>
                  <p className='pl-9 text-slate-700 dark:text-gray-300'>{item.desc}</p>
                </div>
              ),
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

const CoreFeatures = ({ theme }: { theme: 'dark' | 'light' }) => {
  const { t } = useTranslation('common')

  return (
    <section className='relative bg-white pb-14 pt-14 dark:bg-slate-900'>
      <BackgroundSvg theme={theme} className='absolute -left-8' type='shapes' />
      <div className='relative mx-auto w-fit text-4xl font-extrabold text-slate-900 sm:text-5xl'>
        <h2 className='relative z-20 dark:text-white'>{t('main.coreFeaturesBlock')}</h2>
        <BackgroundSvg
          theme={theme}
          className='absolute right-0 top-9 z-10 opacity-30 sm:-right-16'
          type='semicircle'
        />
      </div>
      <div className='mx-auto mt-[60px] flex w-full max-w-7xl flex-wrap items-center justify-center xl:justify-between'>
        {_map(
          // @ts-expect-error
          t('main.features', { returnObjects: true }),
          (
            item: {
              name: string
              desc: string
            },
            index: number,
          ) => (
            <div key={item.name} className='h-64 w-[416px] px-7 py-11 text-center'>
              <span className='text-4xl font-semibold text-indigo-500'>{1 + index}</span>
              <div className='mt-2'>
                <h2 className='mx-auto mb-3 max-w-[300px] whitespace-pre-line text-xl font-semibold text-slate-900 dark:text-white'>
                  {item.name}
                </h2>
                <p className='mx-auto max-w-xs text-gray-600 dark:text-gray-400'>{item.desc}</p>
              </div>
            </div>
          ),
        )}
      </div>
      <BackgroundSvg theme={theme} className='absolute bottom-0 right-0 z-10' type='twolinecircle' />
    </section>
  )
}

const Signup = ({ theme, ssrTheme }: { theme: 'dark' | 'light'; ssrTheme: 'dark' | 'light' }) => {
  const { t } = useTranslation('common')

  return (
    <div className='relative isolate mx-auto flex w-full max-w-7xl items-center justify-center px-5 py-20 md:justify-between'>
      <div className='absolute inset-x-0 -top-3 -z-10 transform-gpu overflow-hidden px-36 blur-3xl' aria-hidden='true'>
        <div
          className='mx-auto aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30'
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>
      <div className='relative z-50 rounded-xl lg:col-span-6'>
        <div className='bg-white ring-1 ring-slate-200 dark:bg-slate-800/20 dark:ring-slate-800 sm:mx-auto sm:w-full sm:max-w-md sm:overflow-hidden sm:rounded-lg'>
          <div className='px-4 py-8 sm:px-10'>
            <p className='text-center text-lg font-semibold text-gray-900 dark:text-white md:text-xl'>
              {t('main.signup')}
            </p>
            <div className='mt-6'>
              <SignUp ssrTheme={ssrTheme} />
            </div>
          </div>
          <div className='px-4 sm:px-10'>
            <div className='border-t border-gray-200 bg-transparent py-6 dark:border-slate-700'>
              <p className='text-xs leading-5 text-gray-600 dark:text-gray-100'>
                <Trans
                  t={t}
                  i18nKey='main.signupTerms'
                  components={{
                    // eslint-disable-next-line jsx-a11y/anchor-has-content
                    tos: (
                      <Link
                        to={routesPath.terms}
                        className='font-medium text-gray-900 hover:underline dark:text-gray-300'
                        aria-label={t('footer.tos')}
                      />
                    ),
                    // eslint-disable-next-line jsx-a11y/anchor-has-content
                    pp: (
                      <Link
                        to={routesPath.privacy}
                        className='font-medium text-gray-900 hover:underline dark:text-gray-300'
                        aria-label={t('footer.pp')}
                      />
                    ),
                  }}
                />
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className='relative'>
        <picture>
          <source
            srcSet={theme === 'dark' ? '/assets/section-signup-dark.webp' : '/assets/section-signup-light.webp'}
            type='image/webp'
          />
          <img
            src={theme === 'dark' ? '/assets/section-signup-dark.png' : '/assets/section-signup-light.png'}
            className='relative z-50 hidden md:block'
            width='680'
            height='511'
            alt='Swetrix Dashboard overview'
          />
        </picture>
      </div>
    </div>
  )
}

const LatestNews = () => (
  <p className='rounded-full bg-indigo-500/10 px-3 py-1 text-center text-sm font-semibold leading-6 text-indigo-600 ring-1 ring-inset ring-indigo-500/20 dark:text-indigo-400'>
    Latest news
  </p>
)

const Hero = ({
  theme,
  ssrTheme,
  authenticated,
}: {
  theme: 'dark' | 'light'
  ssrTheme: 'dark' | 'light'
  authenticated: boolean
}) => {
  const { t } = useTranslation('common')
  const { lastBlogPost } = useSelector((state: StateType) => state.ui.misc)

  return (
    <div className='relative isolate overflow-x-clip'>
      <svg
        className='absolute inset-0 -z-10 h-full w-full stroke-gray-200 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)] dark:stroke-white/10'
        aria-hidden='true'
      >
        <defs>
          <pattern id='rect-pattern' width={200} height={200} x='50%' y={-1} patternUnits='userSpaceOnUse'>
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
      <Header ssrTheme={ssrTheme} authenticated={authenticated} transparent />
      <SupportUkraine />
      <div className='relative mx-auto min-h-[740px] pb-5 pt-10 sm:px-3 lg:px-6 lg:pt-24 xl:px-8'>
        <div className='relative z-20 flex flex-row content-between justify-center lg:justify-start 2xl:mr-[14vw] 2xl:justify-center'>
          <div className='relative px-4 text-left lg:mr-14 lg:mt-0'>
            <h1 className='max-w-2xl text-4xl font-extrabold text-slate-900 dark:text-white sm:text-5xl sm:leading-none md:text-5xl lg:text-5xl xl:text-6xl xl:leading-[110%]'>
              <Trans
                t={t}
                i18nKey='main.slogan'
                components={{
                  span: (
                    <span className='bg-gradient-to-r from-indigo-700 to-indigo-700 bg-clip-text text-transparent dark:from-indigo-600 dark:to-indigo-400' />
                  ),
                }}
              />
            </h1>
            <div className='mb-2 mt-3 flex items-center overflow-hidden sm:text-xl lg:text-lg xl:text-lg'>
              {_isEmpty(lastBlogPost) ? (
                <>
                  <LatestNews />
                  <div className='ml-1 h-6 w-full max-w-xs animate-pulse rounded-md bg-slate-300 dark:bg-slate-700' />
                </>
              ) : (
                <ClientOnly
                  fallback={
                    <>
                      <LatestNews />
                      <div className='ml-1 h-6 w-full max-w-xs animate-pulse rounded-md bg-slate-300 dark:bg-slate-700' />
                    </>
                  }
                >
                  {() => (
                    <Link
                      className='inline-flex items-center space-x-1 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-300'
                      to={`blog/${lastBlogPost.handle}`}
                    >
                      <LatestNews />
                      <small className='ml-1 text-sm'>{lastBlogPost.title}</small>
                      <ChevronRightIcon className='h-4 w-4 text-slate-500' aria-hidden='true' />
                    </Link>
                  )}
                </ClientOnly>
              )}
            </div>
            <div className='mt-5 space-y-2 text-base leading-8 text-slate-900 dark:text-slate-300 sm:text-xl lg:text-lg xl:text-lg'>
              <p>
                <Trans t={t} i18nKey='main.description'>
                  <Link
                    to={routesPath.forMarketers}
                    className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                  />
                  <Link
                    to={routesPath.forStartups}
                    className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                  />
                  <Link
                    to={routesPath.forSmallBusinesses}
                    className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                  />
                </Trans>
              </p>
              <p>{t('main.trackEveryMetric')}</p>
            </div>
            <div className='mt-10 flex flex-col items-center sm:flex-row'>
              <Link
                to={routesPath.signup}
                className='flex h-12 w-full items-center justify-center rounded-md bg-slate-900 text-white shadow-sm ring-1 ring-slate-900 transition-all !duration-300 hover:bg-slate-700 dark:bg-indigo-700 dark:ring-indigo-700 dark:hover:bg-indigo-600 sm:mr-6 sm:max-w-[210px]'
                aria-label={t('titles.signup')}
              >
                <span className='mr-1 text-base font-semibold'>{t('main.startAFreeTrial')}</span>
                <ArrowRightIcon className='mt-[1px] h-4 w-5' />
              </Link>
              <a
                href={LIVE_DEMO_URL}
                className='mt-2 flex h-12 w-full items-center justify-center rounded-md bg-transparent text-slate-900 shadow-sm ring-1 ring-slate-900 transition-all !duration-300 hover:bg-slate-200 dark:text-white dark:ring-white/20 dark:hover:bg-gray-800 sm:mt-0 sm:max-w-[210px]'
                target='_blank'
                rel='noopener noreferrer'
                aria-label={`${t('common.liveDemo')} (opens in a new tab)`}
              >
                <span className='text-base font-semibold'>{t('common.liveDemo')}</span>
              </a>
            </div>
            <a
              href={BOOK_A_CALL_URL}
              className='mt-8 flex max-w-max items-center border-0 font-bold text-slate-900 hover:underline dark:text-gray-100'
              target='_blank'
              rel='noopener noreferrer'
              aria-label={`${t('common.bookADemo')} (opens in a new tab)`}
            >
              <span className='text-base font-semibold'>{t('common.bookADemo')}</span>
              <ArrowRightIcon className='mt-[1px] h-4 w-5' />
            </a>
          </div>
          <div className='hidden max-w-md lg:block xl:max-w-lg'>
            <Lines />
            <picture>
              <source
                srcSet={theme === 'dark' ? '/assets/screenshot_dark.webp' : '/assets/screenshot_light.webp'}
                type='image/webp'
              />
              <img
                src={theme === 'dark' ? '/assets/screenshot_dark.png' : '/assets/screenshot_light.png'}
                className='relative h-full min-w-[880px] rounded-xl shadow-2xl ring-1 ring-gray-900/10 dark:ring-white/10'
                width='100%'
                height='auto'
                alt='Swetrix Analytics dashboard'
              />
            </picture>
          </div>
        </div>
        <div className='relative z-20 my-10 block px-4 md:px-0 lg:hidden'>
          <picture>
            <source
              srcSet={theme === 'dark' ? '/assets/screenshot_dark.webp' : '/assets/screenshot_light.webp'}
              type='image/webp'
            />
            <img
              src={theme === 'dark' ? '/assets/screenshot_dark.png' : '/assets/screenshot_light.png'}
              className='relative w-full rounded-xl shadow-2xl ring-1 ring-gray-900/10 dark:ring-white/10'
              width='100%'
              height='auto'
              alt='Swetrix Analytics dashboard'
            />
          </picture>
        </div>
      </div>
    </div>
  )
}

export default function Index() {
  const { theme: ssrTheme, isAuth } = useLoaderData<typeof loader>()

  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const reduxTheme = useSelector((state: StateType) => state.ui.theme.theme)
  const { authenticated: reduxAuthenticated, loading } = useSelector((state: StateType) => state.auth)
  const theme = isBrowser ? reduxTheme : ssrTheme
  const accessToken = getAccessToken()
  const authenticated = isBrowser ? (loading ? !!accessToken : reduxAuthenticated) : isAuth

  return (
    <div className='overflow-hidden'>
      <main className='bg-white dark:bg-slate-900'>
        <Hero theme={theme} ssrTheme={ssrTheme} authenticated={authenticated} />

        <TrustedBy />
        <FeatureGallery theme={theme} />

        <Feedback
          name='Alex Bowles'
          title='Co-founder of Casterlabs'
          logoUrl={theme === 'dark' ? '/assets/users/casterlabs-dark.svg' : '/assets/users/casterlabs-light.svg'}
          photoUrl='/assets/users/alex-casterlabs.jpg'
          feedback="Swetrix has been a game changer for our analytics. They've always been on top of feature requests and bug reports and have been friendly every step of the way. I can't recommend them enough."
        />

        {!authenticated && <Signup theme={theme} ssrTheme={ssrTheme} />}

        <CoreFeatures theme={theme} />

        <section className='relative bg-white px-3 pt-24 text-[initial] dark:bg-slate-900 sm:px-5'>
          <h2 className='sm:ext-5xl mx-auto w-fit text-center text-4xl font-bold text-slate-900 dark:text-white'>
            {t('main.supports')}
          </h2>
          <div className='mx-auto mt-20 grid w-full max-w-7xl grid-cols-3 items-center justify-between justify-items-center gap-x-4 gap-y-10 sm:grid-cols-4 md:grid-cols-6 lg:gap-x-10 lg:gap-y-16'>
            <Telegram className='max-h-16 max-w-[64px] sm:max-w-[150px]' />
            <NuxtJS theme={theme} className='max-h-12 max-w-[106px] sm:max-w-[150px]' />
            <Webflow theme={theme} className='max-h-12 max-w-[106px] sm:max-w-[150px]' />
            <NextJS theme={theme} className='max-h-12 max-w-[78px] sm:max-w-[80px]' />
            <Notion theme={theme} className='max-h-12 max-w-[106px] sm:max-w-[130px]' />
            <ReactSVG className='max-h-16 max-w-[71px] sm:max-w-[150px]' />
            <Angular className='max-h-20 max-w-[60px] sm:max-w-[160px]' />
            <Wordpress theme={theme} className='max-h-16 max-w-[100px] sm:max-w-[160px]' />
            <Wix theme={theme} className='max-h-12 max-w-[105px] sm:max-w-[120px]' />
            <Ghost theme={theme} className='max-h-20 max-w-[105px] sm:max-w-[150px]' />
            <Gatsby theme={theme} className='max-h-12 max-w-[105px] sm:max-w-[150px]' />
            <Cloudflare theme={theme} className='max-h-12 max-w-[105px] sm:max-w-[140px]' />
          </div>
        </section>

        <Marketplace />

        <Feedback
          name='Alper Alkan'
          title='Co-founder of Phalcode'
          logoUrl={theme === 'dark' ? '/assets/users/phalcode-dark.svg' : '/assets/users/phalcode-light.svg'}
          photoUrl='/assets/users/alper-phalcode.jpg'
          feedback="Analytics needs on all of our products are provided by Swetrix only. It's unfathomable how good this service is compared to Google Analytics. Swetrix gives me everything I need to know about my websites."
        />

        {/* Hiding the Pricing for authenticated users on the main page as the Paddle script only loads on the Billing page */}
        {!authenticated && <Pricing authenticated={false} t={t} language={language} />}

        <Comparison />
        <DitchGoogle
          screenshot={{
            dark: '/assets/screenshot_dark.png',
            light: '/assets/screenshot_light.png',
          }}
          theme={theme}
        />
        <OpensourceAdvantages theme={theme} />
        <PeopleLoveSwetrix theme={theme} />
      </main>
    </div>
  )
}
