import {
  CookieIcon,
  GithubLogoIcon,
  ArrowRightIcon,
  WindIcon,
  SmileyIcon,
  CaretRightIcon,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'
import routes from '~/utils/routes'

const REASONS = [
  {
    key: 'privacy',
    icon: CookieIcon,
    className: 'text-indigo-500',
  },
  {
    key: 'simplicity',
    icon: SmileyIcon,
    className: 'text-teal-500',
  },
  {
    key: 'opensource',
    icon: GithubLogoIcon,
    className: 'text-green-500',
  },
  {
    key: 'lightweight',
    icon: WindIcon,
    className: 'text-cyan-500',
  },
] as const

export const WhySwitch = () => {
  const { t } = useTranslation('common')

  return (
    <section className='mx-auto max-w-7xl px-4 py-14 lg:px-8'>
      <div className='mb-10 max-w-3xl'>
        <Text
          as='h2'
          size='3xl'
          weight='bold'
          tracking='tight'
          className='sm:text-4xl'
        >
          {t('main.whySwitch.heading')}
        </Text>
      </div>

      <div className='grid grid-cols-1 items-start gap-10 lg:grid-cols-5 lg:gap-16'>
        <div className='lg:col-span-2'>
          <div className='space-y-4'>
            {t('main.whySwitch.body')
              .split('\n\n')
              .map((paragraph, index) => (
                <Text
                  key={index}
                  as='p'
                  size='sm'
                  colour='secondary'
                  className='leading-relaxed'
                >
                  {paragraph}
                </Text>
              ))}
          </div>
          <div className='mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center'>
            <Link
              to={routes.signup}
              className='inline-flex items-center justify-center rounded-md border-2 border-slate-900 bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-transparent hover:text-slate-900 dark:border-slate-50 dark:bg-gray-50 dark:text-slate-900 dark:hover:text-gray-50'
            >
              {t('main.startAXDayFreeTrial', { amount: 14 })}
              <ArrowRightIcon className='ml-2 size-4' aria-hidden='true' />
            </Link>
            <Link
              to='/comparison/google-analytics'
              className='inline-flex items-center text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            >
              {t('main.whySwitch.compareLink')}
              <CaretRightIcon className='ml-1 size-3.5' aria-hidden='true' />
            </Link>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 lg:col-span-3'>
          {REASONS.map(({ key, icon: Icon, className }) => (
            <div key={key}>
              <div className='flex items-center gap-2'>
                <Icon
                  weight='duotone'
                  className={cn('size-5 shrink-0', className)}
                  aria-hidden
                />
                <Text as='h3' weight='semibold'>
                  {t(`main.whySwitch.reasons.${key}.title`)}
                </Text>
              </div>
              <Text
                as='p'
                size='sm'
                colour='secondary'
                className='mt-1 pl-7 leading-relaxed'
              >
                {t(`main.whySwitch.reasons.${key}.desc`)}
              </Text>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
