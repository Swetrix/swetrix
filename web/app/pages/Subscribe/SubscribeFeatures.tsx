import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useInViewOnce } from '~/hooks/useInViewOnce'
import { useTheme } from '~/providers/ThemeProvider'
import { Text } from '~/ui/Text'

interface FeatureCard {
  key: 'traffic' | 'performance' | 'errors' | 'sessions'
  videoLight: string
  videoDark: string
  posterLight: string
  posterDark: string
}

const FEATURES: FeatureCard[] = [
  {
    key: 'traffic',
    videoLight: '/assets/onboarding/traffic-light.mp4',
    videoDark: '/assets/onboarding/traffic-dark-2.mp4',
    posterLight: '/assets/screenshot_light.png',
    posterDark: '/assets/screenshot_dark.png',
  },
  {
    key: 'performance',
    videoLight: '/assets/onboarding/performance-light.mp4',
    videoDark: '/assets/onboarding/performance-dark.mp4',
    posterLight: '/assets/screenshot_perf_light.png',
    posterDark: '/assets/screenshot_perf_dark.png',
  },
  {
    key: 'errors',
    videoLight: '/assets/onboarding/errors-light.mp4',
    videoDark: '/assets/onboarding/errors-dark.mp4',
    posterLight: '/assets/screenshot_errors_light.png',
    posterDark: '/assets/screenshot_errors_dark.png',
  },
  {
    key: 'sessions',
    videoLight: '/assets/onboarding/sessions-light.mp4',
    videoDark: '/assets/onboarding/sessions-dark.mp4',
    posterLight: '/assets/screenshot_light.png',
    posterDark: '/assets/screenshot_dark.png',
  },
]

const FeatureVideo = ({
  src,
  poster,
  label,
}: {
  src: string
  poster: string
  label: string
}) => {
  const [failed, setFailed] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true)
  const { ref, hasBeenInView } = useInViewOnce()

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateReducedMotion = () =>
      setPrefersReducedMotion(mediaQuery.matches)
    updateReducedMotion()
    mediaQuery.addEventListener('change', updateReducedMotion)

    return () => mediaQuery.removeEventListener('change', updateReducedMotion)
  }, [])

  return (
    <div
      ref={ref}
      className='relative aspect-video overflow-hidden bg-gray-100 dark:bg-slate-950'
    >
      <img
        src={poster}
        alt={failed ? label : ''}
        width={1167}
        height={835}
        loading='lazy'
        className='absolute inset-0 h-full w-full object-cover object-top'
      />
      {!failed && hasBeenInView && !prefersReducedMotion ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload='metadata'
          poster={poster}
          aria-label={label}
          onError={() => setFailed(true)}
          className='absolute inset-0 h-full w-full object-cover object-top motion-reduce:hidden'
        >
          <source src={src} type='video/mp4' />
        </video>
      ) : null}
    </div>
  )
}

export const SubscribeFeatures = () => {
  const { t } = useTranslation('common')
  const { theme } = useTheme()

  return (
    <section>
      <div className='mx-auto max-w-2xl text-center'>
        <Text as='h2' size='2xl' weight='bold' tracking='tight'>
          {t('checkout.features.title')}
        </Text>
        <Text
          as='p'
          size='base'
          colour='secondary'
          className='mx-auto mt-2 max-w-2xl leading-relaxed text-pretty'
        >
          {t('checkout.features.subtitle')}
        </Text>
      </div>

      <div className='mt-6 grid gap-4 sm:grid-cols-2'>
        {FEATURES.map((feature) => {
          const label = t(`checkout.features.cards.${feature.key}.alt`)
          const video =
            theme === 'dark' ? feature.videoDark : feature.videoLight
          const poster =
            theme === 'dark' ? feature.posterDark : feature.posterLight

          return (
            <article
              key={feature.key}
              className='overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-white/10'
            >
              <FeatureVideo
                key={video}
                src={video}
                poster={poster}
                label={label}
              />
              <div className='p-5 sm:p-6'>
                <Text as='h3' size='lg' weight='semibold' tracking='tight'>
                  {t(`checkout.features.cards.${feature.key}.title`)}
                </Text>
                <Text
                  as='p'
                  size='sm'
                  colour='secondary'
                  className='mt-2 leading-relaxed text-pretty'
                >
                  {t(`checkout.features.cards.${feature.key}.description`)}
                </Text>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
