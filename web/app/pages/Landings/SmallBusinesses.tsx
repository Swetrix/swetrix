import { Link, useLoaderData } from '@remix-run/react'

import { useTranslation, Trans } from 'react-i18next'
import { useSelector } from 'react-redux'
import { StateType } from '~/lib/store'
import { BOOK_A_CALL_URL, DISCORD_URL, isBrowser, LIVE_DEMO_URL, TWITTER_URL } from '~/lib/constants'
import routesPath from '~/utils/routes'

import { ArrowRightIcon } from '@heroicons/react/20/solid'

import Header from '~/components/Header'
import { getAccessToken } from '~/utils/accessToken'

import _map from 'lodash/map'
import { ComparisonTable } from '~/components/marketing/ComparisonTable'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import { SquareArrowOutUpRightIcon } from 'lucide-react'

interface LoaderProps {
  theme: 'dark' | 'light'
  isAuth: boolean
}

const INTEGRATIONS_URL = 'https://docs.swetrix.com/integrations'

const SmallBusinesses = () => {
  const { theme: ssrTheme, isAuth } = useLoaderData<LoaderProps>()
  const { t } = useTranslation('common')
  const reduxTheme = useSelector((state: StateType) => state.ui.theme.theme)
  const accessToken = getAccessToken()
  const { authenticated: reduxAuthenticated, loading } = useSelector((state: StateType) => state.auth)
  const authenticated = isBrowser ? (loading ? !!accessToken : reduxAuthenticated) : isAuth
  const theme = isBrowser ? reduxTheme : ssrTheme

  return (
    <main className='bg-white dark:bg-slate-900'>
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
        <div className='flex items-center justify-center px-2 py-2'>
          <a
            href='https://u24.gov.ua/'
            target='_blank'
            rel='noreferrer noopener'
            className='border-b-2 border-transparent text-center text-slate-900 hover:border-slate-900 dark:text-white dark:hover:border-white'
          >
            {t('main.ukrSupport')}
          </a>
          <SquareArrowOutUpRightIcon
            className='ml-1 hidden h-4 w-4 text-slate-800 dark:text-white md:block'
            strokeWidth={1.5}
          />
        </div>
        <div className='relative mx-auto min-h-[740px] pb-5 pt-10 sm:px-3 lg:px-6 lg:pt-24 xl:px-8'>
          <div className='relative z-20 flex flex-col content-between justify-center'>
            <div className='relative mx-auto flex flex-col px-4 text-left'>
              <h1 className='mx-auto max-w-4xl text-center text-4xl font-extrabold text-slate-900 dark:text-white sm:text-5xl sm:leading-none md:text-5xl lg:text-5xl xl:text-6xl xl:leading-[110%]'>
                <Trans
                  t={t}
                  i18nKey='smbs.slogan'
                  components={{
                    span: (
                      <span className='bg-gradient-to-r from-indigo-700 to-pink-700 bg-clip-text text-transparent dark:from-indigo-600 dark:to-indigo-400' />
                    ),
                  }}
                />
              </h1>
              <p className='mx-auto mt-4 max-w-6xl text-center text-base leading-8 text-slate-900 dark:text-slate-300 sm:text-xl lg:text-lg xl:text-lg'>
                {t('smbs.description')}
              </p>
              <div className='mt-10 flex flex-col items-center justify-center sm:flex-row'>
                <Link
                  to={routesPath.signup}
                  className='group flex h-12 w-full items-center justify-center rounded-md bg-slate-900 text-white shadow-sm ring-1 ring-slate-900 transition-all !duration-300 hover:bg-slate-700 dark:bg-indigo-700 dark:ring-indigo-700 dark:hover:bg-indigo-600 sm:mr-6 sm:max-w-[210px]'
                  aria-label={t('titles.signup')}
                >
                  <span className='mr-1 text-base font-semibold'>{t('main.startAFreeTrial')}</span>
                  <ArrowRightIcon className='mt-[1px] h-4 w-5 transition-transform group-hover:scale-[1.15]' />
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
                className='mx-auto mt-8 flex max-w-max items-center border-0 font-bold text-slate-900 hover:underline dark:text-gray-100'
                target='_blank'
                rel='noopener noreferrer'
                aria-label={`${t('common.bookACall')} (opens in a new tab)`}
              >
                <span className='text-base font-semibold'>{t('common.bookACall')}</span>
                <ArrowRightIcon className='mt-[1px] h-4 w-5' />
              </a>
            </div>
          </div>
          <div className='relative z-20 mx-auto mt-10 block max-w-[1300px] px-4 md:px-0'>
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

      <div className='mx-auto mb-6 mt-12 max-w-5xl px-5'>
        {_map(t('smbs.whyUs', { returnObjects: true }), (item: { name: string; desc: string[] }) => (
          <div key={item.name} className='mb-10 text-slate-900 last:mb-0 dark:text-white'>
            <h2 className='mb-5 text-4xl font-extrabold'>{item.name}</h2>
            {_map(item.desc, (descText) => (
              <p key={descText} className='mb-5 text-lg'>
                <Trans
                  t={t}
                  components={{
                    span: <span className='font-bold' />,
                    integrationLink: (
                      <a
                        href={INTEGRATIONS_URL}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-blue-600 hover:underline dark:text-blue-500'
                      />
                    ),
                    discordUrl: (
                      <a
                        href={DISCORD_URL}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-blue-600 hover:underline dark:text-blue-500'
                      />
                    ),
                    twitterUrl: (
                      <a
                        href={TWITTER_URL}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-blue-600 hover:underline dark:text-blue-500'
                      />
                    ),
                  }}
                >
                  {descText}
                </Trans>
              </p>
            ))}
          </div>
        ))}

        <ComparisonTable className='py-5' />
      </div>

      <DitchGoogle
        screenshot={{
          dark: '/assets/screenshot_dark.png',
          light: '/assets/screenshot_light.png',
        }}
        theme={theme}
      />
    </main>
  )
}

export default SmallBusinesses
