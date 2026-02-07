import { ArrowRightIcon } from '@phosphor-icons/react'
import _map from 'lodash/map'
import { useTranslation, Trans } from 'react-i18next'
import { Link } from 'react-router'

import Header from '~/components/Header'
import { ComparisonTable } from '~/components/marketing/ComparisonTable'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import {
  BOOK_A_CALL_URL,
  DISCORD_URL,
  INTEGRATIONS_URL,
  LIVE_DEMO_URL,
} from '~/lib/constants'
import { useTheme } from '~/providers/ThemeProvider'
import routesPath from '~/utils/routes'

const Marketers = () => {
  const { t } = useTranslation('common')
  const { theme } = useTheme()

  return (
    <main className='bg-white dark:bg-slate-950'>
      <div className='relative isolate overflow-x-clip'>
        <svg
          className='absolute inset-0 -z-10 h-full w-full [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-gray-200 dark:stroke-white/10'
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
          <svg
            x='50%'
            y={-1}
            className='overflow-visible fill-white dark:fill-gray-800/20'
          >
            <path
              d='M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z'
              strokeWidth={0}
            />
          </svg>
          <rect
            width='100%'
            height='100%'
            strokeWidth={0}
            fill='url(#rect-pattern)'
          />
        </svg>
        <div
          className='absolute top-10 left-[calc(50%-4rem)] -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:top-[calc(50%-30rem)] lg:left-48 xl:left-[calc(50%-24rem)]'
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
        <Header transparent />
        <div className='relative mx-auto min-h-[740px] pt-10 pb-5 sm:px-3 lg:px-6 lg:pt-24 xl:px-8'>
          <div className='relative z-20 flex flex-col content-between justify-center'>
            <div className='relative mx-auto flex flex-col px-4 text-left'>
              <h1 className='mx-auto max-w-4xl text-center text-4xl font-extrabold text-slate-900 sm:text-5xl sm:leading-none md:text-5xl lg:text-5xl xl:text-6xl xl:leading-[110%] dark:text-white'>
                <Trans
                  t={t}
                  i18nKey='marketers.slogan'
                  components={{
                    span: (
                      <span className='bg-gradient-to-r from-indigo-700 to-pink-700 bg-clip-text text-transparent dark:from-indigo-600 dark:to-indigo-400' />
                    ),
                  }}
                />
              </h1>
              <p className='mx-auto mt-4 max-w-6xl text-center text-base leading-8 text-slate-900 sm:text-xl lg:text-lg xl:text-lg dark:text-slate-300'>
                {t('marketers.description')}
              </p>
              <div className='mt-10 flex flex-col items-center justify-center sm:flex-row'>
                <Link
                  to={routesPath.signup}
                  className='flex h-12 items-center justify-center rounded-md border-2 border-slate-900 bg-slate-900 px-4 text-white transition-all hover:bg-transparent hover:text-slate-900 sm:mr-6 dark:border-slate-50 dark:bg-gray-50 dark:text-slate-900 dark:hover:text-gray-50'
                  aria-label={t('titles.signup')}
                >
                  <span className='mr-1 text-center text-base font-semibold'>
                    {t('main.startAXDayFreeTrial', { amount: 14 })}
                  </span>
                  <ArrowRightIcon className='mt-[1px] h-4 w-5' />
                </Link>
                <a
                  href={LIVE_DEMO_URL}
                  className='mt-2 flex h-12 w-full items-center justify-center rounded-md bg-transparent text-slate-900 shadow-xs ring-1 ring-slate-900 transition-all hover:bg-slate-200/60 sm:mt-0 sm:max-w-[210px] dark:text-white dark:ring-white/20 dark:hover:bg-slate-900/60'
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label={`${t('common.liveDemo')} (opens in a new tab)`}
                >
                  <span className='text-base font-semibold'>
                    {t('common.liveDemo')}
                  </span>
                </a>
              </div>
              <a
                href={BOOK_A_CALL_URL}
                className='mx-auto mt-8 flex max-w-max items-center border-0 font-bold text-slate-900 hover:underline dark:text-gray-100'
                target='_blank'
                rel='noopener noreferrer'
                aria-label={`${t('common.bookACall')} (opens in a new tab)`}
              >
                <span className='text-base font-semibold'>
                  {t('common.bookACall')}
                </span>
                <ArrowRightIcon className='mt-[1px] h-4 w-5' />
              </a>
            </div>
          </div>
          <div className='relative z-20 mx-auto mt-10 block max-w-[1300px] px-4 md:px-0'>
            <img
              src={
                theme === 'dark'
                  ? '/assets/screenshot_dark.png'
                  : '/assets/screenshot_light.png'
              }
              className='relative w-full rounded-xl ring-2 ring-gray-900/10 dark:ring-white/10'
              width='100%'
              height='auto'
              alt='Swetrix Analytics dashboard'
            />
          </div>
        </div>
      </div>

      <div className='mx-auto mt-12 mb-6 max-w-5xl px-5'>
        {_map(
          t('marketers.whyUs', { returnObjects: true }),
          (item: { name: string; desc: string[] }) => (
            <div
              key={item.name}
              className='mb-10 text-slate-900 last:mb-0 dark:text-white'
            >
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
                    }}
                  >
                    {descText}
                  </Trans>
                </p>
              ))}
            </div>
          ),
        )}

        <ComparisonTable className='py-5' />
      </div>

      <DitchGoogle />
    </main>
  )
}

export default Marketers
