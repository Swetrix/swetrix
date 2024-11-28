import React, { useEffect, useState } from 'react'
import type { LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Link } from '@remix-run/react'
import { json, redirect } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

import { detectTheme, isAuthenticated } from 'utils/server'

import { useTranslation, Trans } from 'react-i18next'
import { useSelector } from 'react-redux'
import { ArrowRightIcon } from '@heroicons/react/20/solid'

import routesPath from 'utils/routes'
import { getAccessToken } from 'utils/accessToken'
import {
  LIVE_DEMO_URL,
  isBrowser,
  isSelfhosted,
} from 'redux/constants'
import { StateType } from 'redux/store/index'

import Header from 'components/Header'
import { Lines } from 'components/marketing/Lines'
import ExtensionsCard from 'components/marketplace/ExtensionsCard'

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


const Highlighted = ({ children }: { children: React.ReactNode }) => (
  <span className='relative whitespace-nowrap'>
    <span className='absolute -bottom-1 -left-2 -right-2 -top-1 -rotate-1 bg-slate-900 dark:bg-gray-200 md:-bottom-0 md:-left-3 md:-right-3 md:-top-0' />
    <span className='relative text-gray-50 dark:text-slate-900'>{children}</span>
  </span>
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
      <div className='relative mx-auto min-h-[740px] pb-5 pt-10 sm:px-3 lg:px-6 lg:pt-24 xl:px-8'>
        <div className='relative z-20 flex flex-col content-between justify-center'>
          <div className='relative mx-auto flex flex-col px-4 text-left'>
            <h1 className='mx-auto max-w-4xl text-center text-4xl font-extrabold tracking-[-0.4px] text-slate-900 dark:text-white sm:text-5xl sm:leading-none lg:text-6xl xl:text-7xl'>
              <Trans
                t={t}
                i18nKey='main.slogan'
                components={{
                  // @ts-expect-error
                  span: <Highlighted />,
                }}
              />
            </h1>
            <p className='mx-auto mt-4 max-w-4xl text-center text-base leading-relaxed tracking-wide text-slate-900 dark:text-slate-300 sm:text-lg lg:text-xl'>
              {t('main.description')}
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
          </div>
          <div className='hidden max-w-md lg:block xl:max-w-lg'>
            <Lines />
          </div>
        </div>
        <div className='relative z-20 mx-auto mt-10 block max-w-7xl px-4 md:px-0'>
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

  const reduxTheme = useSelector((state: StateType) => state.ui.theme.theme)
  const { authenticated: reduxAuthenticated, loading } = useSelector((state: StateType) => state.auth)
  const theme = isBrowser ? reduxTheme : ssrTheme
  const accessToken = getAccessToken()
  const authenticated = isBrowser ? (loading ? !!accessToken : reduxAuthenticated) : isAuth

  return (
    <div className='overflow-hidden'>
      <main className='bg-white dark:bg-slate-900'>
        <Hero theme={theme} ssrTheme={ssrTheme} authenticated={authenticated} />
      </main>
    </div>
  )
}
