import {
  ArrowRightIcon,
  BugIcon,
  ChartBarIcon,
  CookieIcon,
  CrosshairIcon,
  GaugeIcon,
  GithubLogoIcon,
  ShieldCheckIcon,
  StarIcon,
} from '@phosphor-icons/react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { ClientOnly } from 'remix-utils/client-only'
import { Trans, useTranslation } from 'react-i18next'

import Header from '~/components/Header'
import useBreakpoint from '~/hooks/useBreakpoint'
import { localisePath } from '~/lib/constants'
import { useTheme } from '~/providers/ThemeProvider'
import Button from '~/ui/Button'
import { Link } from '~/ui/Link'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'
import routesPath from '~/utils/routes'

import { ScrollReveal } from './ScrollReveal'

type ProductMarketingVariant = 'errors' | 'performance'
type HeroTone = 'amber' | 'red'
type DemoTab = 'errors' | 'performance'

interface ProductHeroProps {
  backgroundSrc: string
  demoTab: DemoTab
  descriptionKey: string
  liveDemoUrl: string
  screenshotAlt: string
  screenshotDarkSrc: string
  screenshotLightSrc: string
  sloganKey: string
  tone: HeroTone
}

const HERO_TONES: Record<
  HeroTone,
  {
    highlight: string
    radial: string
  }
> = {
  amber: {
    highlight: 'text-amber-300',
    radial: 'from-amber-300/35 via-orange-950/10 to-slate-950/85',
  },
  red: {
    highlight: 'text-red-300',
    radial: 'from-red-400/35 via-red-950/10 to-slate-950/85',
  },
}

// Section accent: `rule` tints the short "tick" motif, `text` tints the
// heading icons. One accent colour per page (red for errors, amber for perf).
const SECTION_ACCENT: Record<
  ProductMarketingVariant,
  { rule: string; text: string }
> = {
  errors: {
    rule: 'bg-red-500 dark:bg-red-400',
    text: 'text-red-600 dark:text-red-400',
  },
  performance: {
    rule: 'bg-amber-500 dark:bg-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
  },
}

// Icon paired with each section heading.
const LEAD_ICONS: Record<ProductMarketingVariant, typeof BugIcon> = {
  errors: BugIcon,
  performance: GaugeIcon,
}

const HERO_BENEFITS = [
  {
    icon: GaugeIcon,
    labelKey: 'main.heroBenefits.quickSetup',
  },
  {
    icon: CookieIcon,
    labelKey: 'main.heroBenefits.cookieless',
  },
  {
    icon: StarIcon,
    labelKey: 'main.heroBenefits.realTimeDashboard',
  },
  {
    icon: GithubLogoIcon,
    labelKey: 'main.heroBenefits.openSource',
  },
] as const

const ProductHeroBackground = ({
  backgroundSrc,
}: {
  backgroundSrc: string
}) => {
  const reduceMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const scale = useTransform(scrollY, [0, 900], [1, 1.08])

  return (
    <motion.div
      className='absolute inset-0 transform-gpu'
      style={
        reduceMotion ? undefined : { scale, transformOrigin: 'center 35%' }
      }
    >
      <img
        alt=''
        className='size-full object-cover object-center opacity-95 saturate-125'
        src={backgroundSrc}
      />
    </motion.div>
  )
}

const ProductHeroPreview = ({
  demoTab,
  screenshotAlt,
  screenshotDarkSrc,
  screenshotLightSrc,
}: Pick<
  ProductHeroProps,
  'demoTab' | 'screenshotAlt' | 'screenshotDarkSrc' | 'screenshotLightSrc'
>) => {
  const { theme } = useTheme()
  const {
    i18n: { language },
  } = useTranslation('common')
  const isUpToLg = !useBreakpoint('lg')

  if (isUpToLg) {
    return (
      <ScrollReveal className='relative z-20 mx-auto mt-10 overflow-hidden rounded-2xl bg-white/80 p-1.5 shadow-2xl ring-1 shadow-slate-950/20 ring-white/40 backdrop-blur-md dark:bg-slate-950/80 dark:ring-white/10'>
        <img
          src={theme === 'dark' ? screenshotDarkSrc : screenshotLightSrc}
          className='relative h-auto w-full rounded-xl'
          width={2328}
          height={1666}
          alt={screenshotAlt}
        />
      </ScrollReveal>
    )
  }

  const localisedDemoPath = localisePath('/demo', language)

  return (
    <div
      className='relative z-20 mx-auto mt-12 w-full max-w-[1480px] overflow-hidden rounded-2xl bg-white/90 p-2 shadow-2xl ring-1 shadow-slate-950/25 ring-white/40 backdrop-blur-xl dark:bg-slate-950/90 dark:ring-white/10'
      style={{
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        willChange: 'transform',
        contain: 'paint',
        WebkitMaskImage: '-webkit-radial-gradient(white, black)',
      }}
    >
      <div className='relative h-[580px] overflow-hidden rounded-xl bg-slate-950 lg:h-[640px] xl:h-[700px]'>
        <iframe
          src={`https://swetrix.com${localisedDemoPath}?tab=${demoTab}&theme=${theme}&embedded=true`}
          className='size-full rounded-xl'
          title={`${screenshotAlt} Live Demo`}
          loading='eager'
        />
      </div>
    </div>
  )
}

export const ProductMarketingHero = ({
  backgroundSrc,
  demoTab,
  descriptionKey,
  liveDemoUrl,
  screenshotAlt,
  screenshotDarkSrc,
  screenshotLightSrc,
  sloganKey,
  tone,
}: ProductHeroProps) => {
  const { t } = useTranslation('common')
  const toneConfig = HERO_TONES[tone]

  return (
    <div className='relative isolate overflow-hidden bg-gray-50 pt-2 dark:bg-slate-950'>
      <div className='relative mx-2 overflow-hidden rounded-t-4xl bg-slate-950 shadow-2xl ring-1 shadow-slate-950/20 ring-black/5 dark:ring-white/10'>
        <div aria-hidden className='pointer-events-none absolute inset-0'>
          <ProductHeroBackground backgroundSrc={backgroundSrc} />
          <div className='absolute inset-0 bg-slate-950/50' />
          <div
            className={cn(
              'absolute inset-0 bg-radial-[at_50%_0%]',
              toneConfig.radial,
            )}
          />
          <div className='absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-b from-transparent to-slate-950' />
        </div>
        <Header transparent inverted />
        <section className='relative z-10 mx-auto flex max-w-[1500px] flex-col items-center px-4 pt-14 pb-6 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20'>
          <div className='flex w-full flex-col items-center'>
            <Text
              as='h1'
              weight='semibold'
              className='mx-auto max-w-6xl text-center [font-family:Geist,ui-sans-serif,system-ui,sans-serif] text-5xl leading-[0.98] text-balance text-white sm:text-6xl lg:text-7xl xl:text-8xl'
            >
              <Trans
                t={t}
                i18nKey={sloganKey}
                components={{
                  span: <span className={toneConfig.highlight} />,
                }}
              />
            </Text>
            <Text
              as='p'
              size='lg'
              className='mx-auto mt-5 max-w-3xl text-center leading-8 text-gray-50'
            >
              {t(descriptionKey)}
            </Text>
            <div className='mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center'>
              <Link
                to={routesPath.signup}
                className='inline-flex h-12 items-center justify-center rounded-md bg-white px-5 text-slate-950 shadow-lg ring-1 shadow-slate-950/20 ring-white/30 transition-colors hover:bg-gray-100'
                aria-label={t('titles.signup')}
              >
                <span className='text-center text-base font-semibold'>
                  {t('main.startAXDayFreeTrial', { amount: 14 })}
                </span>
                <ArrowRightIcon className='mt-[1px] ml-1 h-4 w-5' />
              </Link>
              <Button
                to={liveDemoUrl}
                linkProps={{
                  target: '_blank',
                  rel: 'noopener noreferrer',
                }}
                variant='secondary'
                size='xl'
                className='flex h-12 items-center justify-center border-white/25 bg-white/10 px-5 text-center text-base font-semibold text-white shadow-none ring-white/25 backdrop-blur-md hover:bg-white/20 dark:border-white/25 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
                aria-label={`${t('main.seeLiveDemo')} (opens in a new tab)`}
              >
                {t('common.liveDemo')}
              </Button>
            </div>
            <div className='mt-8 flex max-w-4xl flex-wrap justify-center gap-x-16 gap-y-3 text-gray-50'>
              {HERO_BENEFITS.map(({ icon: Icon, labelKey }) => (
                <div
                  key={labelKey}
                  className='flex items-center gap-2 text-sm whitespace-nowrap'
                >
                  <Icon className='size-5 shrink-0' />
                  <span>{t(labelKey)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className='w-full'>
            <ClientOnly
              fallback={
                <div className='mx-auto mt-12 h-[580px] w-full max-w-[1480px] rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-xl lg:h-[640px] xl:h-[700px]' />
              }
            >
              {() => (
                <ProductHeroPreview
                  demoTab={demoTab}
                  screenshotAlt={screenshotAlt}
                  screenshotDarkSrc={screenshotDarkSrc}
                  screenshotLightSrc={screenshotLightSrc}
                />
              )}
            </ClientOnly>
          </div>
        </section>
      </div>
    </div>
  )
}

const FastDescription = ({ variant }: { variant: ProductMarketingVariant }) => {
  const { t } = useTranslation('common')

  if (variant === 'performance') {
    return (
      <Trans
        t={t}
        i18nKey='performance.fast.desc'
        components={{
          indexUrl: (
            <Link
              to={routesPath.main}
              className='font-medium text-amber-600 hover:underline dark:text-amber-400'
            />
          ),
          wpostatsUrl: (
            <a
              href='https://wpostats.com/?utm_source=swetrix.com'
              aria-label={t('ariaLabels.openWpoStats')}
              className='font-medium text-amber-600 hover:underline dark:text-amber-400'
              target='_blank'
              rel='noopener noreferrer'
            />
          ),
        }}
      />
    )
  }

  return (
    <Trans
      t={t}
      i18nKey='errors.fast.desc'
      components={{
        indexUrl: (
          <Link
            to={routesPath.main}
            className='font-medium text-red-600 hover:underline dark:text-red-400'
          />
        ),
        perfUrl: (
          <Link
            to={routesPath.performance}
            className='font-medium text-red-600 hover:underline dark:text-red-400'
          />
        ),
        oneLC: (
          <a
            href='https://swetrix.com/docs/swetrix-js-reference#trackerrors'
            aria-label={t('ariaLabels.openErrorTrackingDocumentation')}
            className='font-medium text-red-600 hover:underline dark:text-red-400'
            target='_blank'
            rel='noopener noreferrer'
          />
        ),
      }}
    />
  )
}

export const ProductMarketingSections = ({
  variant,
}: {
  variant: ProductMarketingVariant
}) => {
  const { t } = useTranslation('common')
  const accent = SECTION_ACCENT[variant]
  const LeadIcon = LEAD_ICONS[variant]
  const fastList = t(`${variant}.fast.list`, {
    returnObjects: true,
  }) as string[]
  const detailSections =
    variant === 'performance'
      ? [
          {
            title: t('performance.metrics.title'),
            desc: t('performance.metrics.desc'),
            icon: ChartBarIcon,
          },
          {
            title: t('performance.privacy.title'),
            desc: t('performance.privacy.desc'),
            icon: ShieldCheckIcon,
          },
        ]
      : [
          {
            title: t('errors.track.title'),
            desc: t('errors.track.desc'),
            icon: CrosshairIcon,
          },
          {
            title: t('performance.privacy.title'),
            desc: t('performance.privacy.desc'),
            icon: ShieldCheckIcon,
          },
        ]
  const FirstDetailIcon = detailSections[0].icon
  const SecondDetailIcon = detailSections[1].icon

  return (
    <section className='mx-auto max-w-7xl px-4 pt-16 pb-8 sm:pt-24 lg:px-8'>
      <ScrollReveal className='max-w-3xl'>
        <LeadIcon
          weight='duotone'
          aria-hidden
          className={cn('size-9', accent.text)}
        />
        <Text
          as='h2'
          size='4xl'
          weight='bold'
          tracking='tight'
          className='mt-5'
        >
          {t(`${variant}.fast.title`)}
        </Text>
        <Text
          as='p'
          size='lg'
          colour='secondary'
          className='mt-5 leading-8 whitespace-pre-line'
        >
          <FastDescription variant={variant} />
        </Text>
      </ScrollReveal>

      <ScrollReveal
        delay={0.08}
        className='mt-14 grid grid-cols-1 gap-10 sm:mt-16 lg:grid-cols-3 lg:gap-12'
      >
        {fastList.map((item) => (
          <div key={item}>
            <div className={cn('h-0.5 w-8 rounded-full', accent.rule)} />
            <Text
              as='p'
              size='base'
              colour='secondary'
              className='mt-4 leading-7'
            >
              {item}
            </Text>
          </div>
        ))}
      </ScrollReveal>

      <div className='mt-16 grid border-t border-gray-200 pt-12 sm:mt-20 sm:pt-16 lg:grid-cols-2 dark:border-slate-800'>
        <ScrollReveal className='lg:pr-12 xl:pr-16'>
          <div className='flex items-center gap-2.5'>
            <FirstDetailIcon
              weight='duotone'
              aria-hidden
              className={cn('size-6 shrink-0', accent.text)}
            />
            <Text as='h3' size='2xl' weight='bold' tracking='tight'>
              {detailSections[0].title}
            </Text>
          </div>
          <Text
            as='p'
            size='base'
            colour='secondary'
            className='mt-4 leading-8 whitespace-pre-line'
          >
            {detailSections[0].desc}
          </Text>
        </ScrollReveal>
        <ScrollReveal
          delay={0.08}
          className='mt-10 border-t border-gray-200 pt-10 lg:mt-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12 xl:pl-16 dark:border-slate-800'
        >
          <div className='flex items-center gap-2.5'>
            <SecondDetailIcon
              weight='duotone'
              aria-hidden
              className={cn('size-6 shrink-0', accent.text)}
            />
            <Text as='h3' size='2xl' weight='bold' tracking='tight'>
              {detailSections[1].title}
            </Text>
          </div>
          <Text
            as='p'
            size='base'
            colour='secondary'
            className='mt-4 leading-8 whitespace-pre-line'
          >
            {detailSections[1].desc}
          </Text>
        </ScrollReveal>
      </div>
    </section>
  )
}
