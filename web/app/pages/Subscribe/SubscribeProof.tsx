import { QuotesIcon, StarIcon } from '@phosphor-icons/react'
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
    logoClassName: 'h-9 w-[8.5rem]',
  },
  {
    key: 'alper',
    avatar: '/assets/users/alper-phalcode.jpg',
    logoLight: '/assets/users/phalcode-light.svg',
    logoDark: '/assets/users/phalcode-dark.svg',
    logoWidth: 200,
    logoHeight: 32,
    logoClassName: 'h-6 w-[8.5rem]',
  },
] as const

const REVIEWERS = [
  { name: 'Luke', image: '/assets/small-testimonials/luke.jpg' },
  { name: 'Alex', image: '/assets/small-testimonials/alex.jpg' },
  { name: 'Artur', image: '/assets/small-testimonials/artur.jpg' },
  { name: 'Alper', image: '/assets/small-testimonials/alper.jpg' },
  { name: 'Andrii', image: '/assets/small-testimonials/andrii.jpg' },
]

const Stars = ({ large = false }: { large?: boolean }) => (
  <div className='flex items-center gap-0.5 text-amber-500' aria-hidden='true'>
    {Array.from({ length: 5 }).map((_, index) => (
      <StarIcon
        key={index}
        weight='fill'
        className={large ? 'size-5' : 'size-4'}
      />
    ))}
  </div>
)

export const SubscribeProof = ({
  websiteCount,
}: {
  websiteCount?: number | null
}) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { theme } = useTheme()

  return (
    <section>
      <div className='mx-auto max-w-2xl text-center'>
        <Text as='h2' size='2xl' weight='bold' tracking='tight'>
          {t('checkout.testimonials.title')}
        </Text>
        <Text
          as='p'
          size='base'
          colour='secondary'
          className='mx-auto mt-2 leading-relaxed text-pretty'
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
            <div className='relative flex h-9 items-center'>
              <img
                src={
                  theme === 'dark'
                    ? testimonial.logoDark
                    : testimonial.logoLight
                }
                alt={t(
                  `checkout.testimonials.items.${testimonial.key}.company`,
                )}
                width={testimonial.logoWidth}
                height={testimonial.logoHeight}
                loading='lazy'
                className={`object-contain object-left ${testimonial.logoClassName}`}
              />
            </div>
            <div className='relative mt-7'>
              <Stars />
            </div>
            <blockquote className='relative mt-4 flex-1'>
              <Text
                as='p'
                size='base'
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

      <div className='mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6'>
        <div className='flex -space-x-4 overflow-hidden' aria-hidden='true'>
          {REVIEWERS.map((reviewer) => (
            <div
              key={reviewer.name}
              className='relative inline-flex size-12 overflow-hidden rounded-full border-4 border-gray-50 dark:border-slate-950'
            >
              <img
                src={reviewer.image}
                alt=''
                width={48}
                height={48}
                loading='lazy'
                className='object-cover'
              />
            </div>
          ))}
        </div>
        <div className='flex flex-col items-center gap-1 sm:items-start'>
          <Stars large />
          <Text as='p' size='base' colour='secondary'>
            {websiteCount != null
              ? t('checkout.testimonials.communityProof', {
                  count: websiteCount.toLocaleString(language),
                })
              : t('checkout.testimonials.communityProofFallback')}
          </Text>
        </div>
      </div>
    </section>
  )
}
