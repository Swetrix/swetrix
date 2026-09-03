import { StarIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/ui/Text'

const REVIEWERS = [
  { name: 'Luke', image: '/assets/small-testimonials/luke.jpg' },
  { name: 'Alex', image: '/assets/small-testimonials/alex.jpg' },
  { name: 'Artur', image: '/assets/small-testimonials/artur.jpg' },
  { name: 'Alper', image: '/assets/small-testimonials/alper.jpg' },
  { name: 'Andrii', image: '/assets/small-testimonials/andrii.jpg' },
]

const RatingStars = () => (
  <div className='flex items-center gap-0.5 text-amber-500' aria-hidden='true'>
    {Array.from({ length: 4 }).map((_, index) => (
      <StarIcon key={index} weight='fill' className='size-4' />
    ))}
    <span className='relative block size-4'>
      <StarIcon weight='regular' className='absolute inset-0 size-4' />
      <span className='absolute inset-y-0 left-0 w-[30%] overflow-hidden'>
        <StarIcon weight='fill' className='size-4 max-w-none' />
      </span>
    </span>
  </div>
)

export const SubscribeRating = ({
  websiteCount,
}: {
  websiteCount?: number | null
}) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  return (
    <section className='mx-auto w-full max-w-5xl px-4 pt-8 sm:px-6 lg:px-8'>
      <div className='flex flex-col items-center justify-center gap-5 rounded-2xl bg-white px-5 py-4 ring-1 ring-gray-200 sm:flex-row sm:gap-7 dark:bg-slate-900 dark:ring-white/10'>
        <div
          className='flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1'
          aria-label={t('checkout.rating.ariaLabel')}
        >
          <RatingStars />
          <a
            href='https://www.g2.com/products/swetrix/reviews'
            target='_blank'
            rel='noreferrer noopener'
            className='rounded-sm text-sm font-semibold text-slate-900 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden dark:text-white dark:focus-visible:ring-slate-300'
          >
            {t('checkout.rating.score')}
          </a>
          <Text as='span' size='xs' colour='secondary'>
            {t('checkout.rating.reviews')}
          </Text>
        </div>

        <span
          aria-hidden='true'
          className='hidden h-8 w-px bg-gray-200 sm:block dark:bg-white/10'
        />

        <div className='flex items-center gap-3'>
          <div className='flex -space-x-2.5' aria-hidden='true'>
            {REVIEWERS.map((reviewer) => (
              <img
                key={reviewer.name}
                src={reviewer.image}
                alt=''
                width={32}
                height={32}
                loading='lazy'
                className='size-8 rounded-lg object-cover ring-2 ring-white dark:ring-slate-900'
              />
            ))}
          </div>
          <Text as='p' size='sm' colour='secondary'>
            {websiteCount != null
              ? t('checkout.rating.websites', {
                  count: websiteCount.toLocaleString(language),
                })
              : t('checkout.rating.websitesFallback')}
          </Text>
        </div>
      </div>
    </section>
  )
}
