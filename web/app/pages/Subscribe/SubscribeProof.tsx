import { QuotesIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

import { useTheme } from '~/providers/ThemeProvider'
import { Text } from '~/ui/Text'

const TESTIMONIALS = [
  {
    key: 'alex',
    avatar: '/assets/users/alex-casterlabs.jpg',
    logoLight: '/assets/users/casterlabs-light.svg',
    logoDark: '/assets/users/casterlabs-dark.svg',
    logoWidth: 157,
    logoHeight: 48,
  },
  {
    key: 'alper',
    avatar: '/assets/users/alper-phalcode.jpg',
    logoLight: '/assets/users/phalcode-light.svg',
    logoDark: '/assets/users/phalcode-dark.svg',
    logoWidth: 200,
    logoHeight: 32,
  },
] as const

export const SubscribeProof = () => {
  const { t } = useTranslation('common')
  const { theme } = useTheme()

  return (
    <section>
      <div className='max-w-2xl'>
        <Text as='h2' size='2xl' weight='bold' tracking='tight'>
          {t('checkout.testimonials.title')}
        </Text>
        <Text
          as='p'
          size='base'
          colour='secondary'
          className='mt-2 leading-relaxed text-pretty'
        >
          {t('checkout.testimonials.subtitle')}
        </Text>
      </div>

      <div className='mt-6 grid gap-4 lg:grid-cols-2'>
        {TESTIMONIALS.map((testimonial) => (
          <figure
            key={testimonial.key}
            className='relative flex min-h-80 flex-col overflow-hidden rounded-2xl bg-white p-6 ring-1 ring-gray-200 sm:p-7 dark:bg-slate-900 dark:ring-white/10'
          >
            <QuotesIcon
              aria-hidden='true'
              weight='fill'
              className='pointer-events-none absolute -top-5 -right-3 size-28 rotate-6 text-indigo-500/[0.07] dark:text-indigo-300/[0.06]'
            />
            <img
              src={
                theme === 'dark' ? testimonial.logoDark : testimonial.logoLight
              }
              alt={t(`checkout.testimonials.items.${testimonial.key}.company`)}
              width={testimonial.logoWidth}
              height={testimonial.logoHeight}
              loading='lazy'
              className='relative h-8 w-auto self-start object-contain object-left'
            />
            <blockquote className='relative mt-8 flex-1'>
              <Text
                as='p'
                size='lg'
                colour='primary'
                className='leading-relaxed text-pretty'
              >
                &ldquo;
                {t(`checkout.testimonials.items.${testimonial.key}.quote`)}
                &rdquo;
              </Text>
            </blockquote>
            <figcaption className='relative mt-8 flex items-center gap-3'>
              <img
                src={testimonial.avatar}
                alt=''
                width={44}
                height={44}
                loading='lazy'
                className='size-11 rounded-xl object-cover ring-1 ring-gray-200 dark:ring-white/10'
              />
              <div>
                <Text as='p' size='sm' weight='semibold'>
                  {t(`checkout.testimonials.items.${testimonial.key}.name`)}
                </Text>
                <Text as='p' size='xs' colour='secondary' className='mt-0.5'>
                  {t(`checkout.testimonials.items.${testimonial.key}.role`)}
                </Text>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
