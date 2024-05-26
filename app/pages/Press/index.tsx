/* eslint-disable jsx-a11y/anchor-has-content */
import React from 'react'
import { Link } from '@remix-run/react'
import { useTranslation, Trans } from 'react-i18next'

import routes from 'routesPath'

const FONT_INTER_URL = 'https://rsms.me/inter/'
const FONT_NAME = 'Inter'

interface ILogoComponent {
  description: string
  logoPNG: string
  logoSVG?: string
  textColor?: string
}

const LogoComponent = ({
  description,
  logoSVG,
  logoPNG,
  textColor = 'text-gray-900 dark:text-gray-50',
}: ILogoComponent): JSX.Element => (
  <p>
    <b className={`font-bold tracking-tight ${textColor}`}>{description}</b>
    <img className='h-16 sm:h-20 mt-5 mb-2' src={logoSVG || logoPNG} alt={description} />
    {logoSVG && (
      <a
        href={logoSVG}
        target='_blank'
        rel='noopener noreferrer'
        className='hover:underline text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
      >
        SVG
      </a>
    )}
    {logoSVG && logoPNG && <span className='text-gray-900 dark:text-gray-50'> | </span>}
    {logoPNG && (
      <a
        href={logoPNG}
        target='_blank'
        rel='noopener noreferrer'
        className='hover:underline text-indigo-400 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
      >
        PNG
      </a>
    )}
  </p>
)

const Press = (): JSX.Element => {
  const { t } = useTranslation('common')

  return (
    <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
      <div className='w-11/12 md:w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 whitespace-pre-line'>
        <h1 className='text-4xl font-bold text-gray-900 dark:text-gray-50 tracking-tight'>{t('titles.press')}</h1>
        <p className='mt-2 text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          <Trans
            i18nKey='press.description'
            components={{
              url: (
                <Link
                  to={routes.contact}
                  className='font-medium hover:underline text-indigo-400 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
                />
              ),
            }}
          />
        </p>

        {/* Logos */}
        <h2 className='text-2xl mt-2 font-bold text-gray-900 dark:text-gray-50 tracking-tight'>{t('press.logos')}</h2>
        <div className='grid grid-cols-none sm:grid-cols-2 gap-4 mt-2'>
          <div className='dark:bg-gray-100 p-2 rounded-lg backdrop-blur-lg bg-gray-100 '>
            <LogoComponent description={t('press.logo')} logoPNG='/assets/logo_blue.png' textColor='text-black' />
          </div>
          <div className='dark:bg-slate-800 p-2 rounded-lg backdrop-blur-lg bg-slate-800'>
            <LogoComponent
              description={t('press.logoWhiteText')}
              logoPNG='/assets/logo_white.png'
              textColor='text-white'
            />
          </div>
        </div>
        <div className='grid grid-cols-2 gap-4 mt-8'>
          <LogoComponent description={t('press.logoNoText')} logoPNG='/logo512.png' />
        </div>

        {/* Font */}
        <h2 className='text-2xl mt-8 font-bold text-gray-900 dark:text-gray-50 tracking-tight'>
          {t('press.font.title')}
        </h2>
        <p className='mt-2 text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          <Trans
            i18nKey='press.font.description'
            components={{
              url: (
                <a
                  aria-label='Inter font website (opens in a new tab)'
                  href={FONT_INTER_URL}
                  className='font-medium hover:underline text-indigo-400 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
                  target='_blank'
                  rel='noopener noreferrer'
                />
              ),
            }}
            values={{
              font: FONT_NAME,
            }}
          />
        </p>
      </div>
    </div>
  )
}

export default Press
