import { StarIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/ui/Text'

const RatingStars = ({ label }: { label: string }) => (
  <div className='flex items-center gap-0.5 text-amber-500' aria-label={label}>
    {Array.from({ length: 5 }).map((_, index) => (
      <StarIcon
        key={index}
        weight='fill'
        className='size-4'
        aria-hidden='true'
      />
    ))}
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
    <section className='mx-auto w-full max-w-5xl px-4 pt-5 sm:px-6 lg:px-8'>
      <div className='flex flex-wrap items-center justify-center gap-2.5'>
        <RatingStars label={t('checkout.rating.ariaLabel')} />
        <Text as='p' size='sm' colour='secondary'>
          <span className='font-semibold text-slate-900 dark:text-white'>
            {t('checkout.rating.score')}
          </span>{' '}
          {websiteCount != null
            ? t('checkout.rating.websites', {
                count: websiteCount.toLocaleString(language),
              })
            : t('checkout.rating.websitesFallback')}
        </Text>
      </div>
    </section>
  )
}
