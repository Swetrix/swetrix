import type { ReactElement, ReactNode } from 'react'

import { cn } from '~/utils/generic'
import routes from '~/utils/routes'

const Card = ({ children }: { children: ReactNode }) => (
  <div className='absolute inset-x-4 top-4 -bottom-2 overflow-hidden rounded-t-lg bg-white p-2.5 ring-1 ring-black/[0.06] dark:bg-slate-900 dark:ring-white/[0.08]'>
    {children}
  </div>
)

const Skel = ({ className }: { className?: string }) => (
  <div
    className={cn('rounded-full bg-slate-200 dark:bg-slate-700', className)}
  />
)

const Faint = ({ className }: { className?: string }) => (
  <div
    className={cn('rounded-full bg-slate-100 dark:bg-slate-800', className)}
  />
)

const AnalyticsMockup = () => (
  <Card>
    <div className='flex items-center gap-1.5'>
      <Faint className='size-3 rounded-[3px]' />
      <Skel className='h-1.5 w-10' />
    </div>
    <svg
      viewBox='0 0 130 32'
      preserveAspectRatio='none'
      className='mt-3 h-9 w-full'
      aria-hidden='true'
    >
      <path
        d='M0 27 L18 23 L36 25 L54 15 L72 18 L90 9 L108 12 L130 3'
        fill='none'
        className='stroke-indigo-500 dark:stroke-indigo-400'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        vectorEffect='non-scaling-stroke'
      />
    </svg>
    <div className='mt-3 space-y-1.5'>
      <Faint className='h-1 w-full' />
      <Faint className='h-1 w-2/3' />
    </div>
  </Card>
)

const PerformanceMockup = () => (
  <Card>
    <div className='flex items-start justify-between'>
      <svg viewBox='0 0 48 27' className='h-8 w-14' aria-hidden='true'>
        <path
          d='M4 24 A20 20 0 0 1 44 24'
          fill='none'
          className='stroke-slate-200 dark:stroke-slate-700'
          strokeWidth='4'
          strokeLinecap='round'
        />
        <path
          d='M4 24 A20 20 0 0 1 34 6'
          fill='none'
          className='stroke-amber-500 dark:stroke-amber-400'
          strokeWidth='4'
          strokeLinecap='round'
        />
      </svg>
      <Skel className='mt-1 h-1.5 w-8' />
    </div>
    <div className='mt-4 space-y-1.5'>
      <Faint className='h-1 w-full' />
      <Faint className='h-1 w-5/6' />
      <Faint className='h-1 w-2/3' />
    </div>
  </Card>
)

const ErrorsMockup = () => {
  const Row = ({ w }: { w: string }) => (
    <div className='flex items-center gap-1.5'>
      <Skel className='size-2 shrink-0' />
      <Faint className={cn('h-1.5', w)} />
    </div>
  )
  return (
    <Card>
      <div className='space-y-2.5'>
        <Row w='w-full' />
        <div className='flex items-center gap-1.5 rounded-md bg-red-500/10 px-1 py-1 dark:bg-red-400/10'>
          <span className='size-2 shrink-0 rounded-full bg-red-500 dark:bg-red-400' />
          <span className='h-1.5 w-2/3 rounded-full bg-red-500/40 dark:bg-red-400/40' />
        </div>
        <Row w='w-5/6' />
        <Row w='w-3/4' />
      </div>
    </Card>
  )
}

const CaptchaMockup = () => (
  <Card>
    <div className='flex items-center gap-2'>
      <span className='grid size-4 shrink-0 place-items-center rounded-[4px] bg-emerald-500 dark:bg-emerald-400'>
        <svg
          viewBox='0 0 12 12'
          className='size-2.5'
          fill='none'
          aria-hidden='true'
        >
          <path
            d='M2.5 6.4 5 8.9 9.5 3.4'
            className='stroke-white dark:stroke-slate-900'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </span>
      <Skel className='h-1.5 w-12' />
    </div>
    <div className='mt-4 space-y-1.5'>
      <Faint className='h-1 w-full' />
      <Faint className='h-1 w-2/3' />
    </div>
  </Card>
)

export interface SolutionVisual {
  bg: string
  Mockup: () => ReactElement
  accentIcon: string
}

export const SOLUTION_VISUALS: Record<string, SolutionVisual> = {
  [routes.main]: {
    bg: '/assets/solutions/analytics.webp',
    Mockup: AnalyticsMockup,
    accentIcon:
      'group-hover/card:text-indigo-500 dark:group-hover/card:text-indigo-400',
  },
  [routes.performance]: {
    bg: '/assets/solutions/performance.webp',
    Mockup: PerformanceMockup,
    accentIcon:
      'group-hover/card:text-amber-500 dark:group-hover/card:text-amber-400',
  },
  [routes.errorTracking]: {
    bg: '/assets/solutions/errors.webp',
    Mockup: ErrorsMockup,
    accentIcon:
      'group-hover/card:text-red-500 dark:group-hover/card:text-red-400',
  },
  [routes.captchaLanding]: {
    bg: '/assets/solutions/captcha.webp',
    Mockup: CaptchaMockup,
    accentIcon:
      'group-hover/card:text-emerald-500 dark:group-hover/card:text-emerald-400',
  },
}
