import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react'
import { ArrowUpIcon, CaretUpIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { Fragment, RefObject, useCallback, useEffect, useState } from 'react'

import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

import type { ArticleHeading } from '~/utils/toc'

const PROGRESS_RADIUS = 15
const PROGRESS_STROKE = 2
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS
const PROGRESS_SIZE = (PROGRESS_RADIUS + PROGRESS_STROKE) * 2

function ScrollToTopButton({ progress }: { progress: number }) {
  const offset = PROGRESS_CIRCUMFERENCE * (1 - progress)

  return (
    <button
      type='button'
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className='relative flex shrink-0 items-center justify-center'
      aria-label='Scroll to top'
      style={{ width: PROGRESS_SIZE, height: PROGRESS_SIZE }}
    >
      <svg
        className='absolute inset-0 -rotate-90'
        width={PROGRESS_SIZE}
        height={PROGRESS_SIZE}
        viewBox={`0 0 ${PROGRESS_SIZE} ${PROGRESS_SIZE}`}
      >
        <circle
          cx={PROGRESS_SIZE / 2}
          cy={PROGRESS_SIZE / 2}
          r={PROGRESS_RADIUS}
          fill='none'
          stroke='currentColor'
          strokeWidth={PROGRESS_STROKE}
          className='text-gray-300 dark:text-slate-600'
        />
        <circle
          cx={PROGRESS_SIZE / 2}
          cy={PROGRESS_SIZE / 2}
          r={PROGRESS_RADIUS}
          fill='none'
          stroke='currentColor'
          strokeWidth={PROGRESS_STROKE}
          strokeLinecap='round'
          strokeDasharray={PROGRESS_CIRCUMFERENCE}
          strokeDashoffset={offset}
          className='text-slate-900 transition-[stroke-dashoffset] duration-150 dark:text-white'
        />
      </svg>
      <ArrowUpIcon
        weight='bold'
        className='relative z-10 size-3.5 text-slate-800 dark:text-slate-100'
      />
    </button>
  )
}

function HeadingSelector({
  headings,
  activeId,
}: {
  headings: ArticleHeading[]
  activeId: string | null
}) {
  const activeHeading = headings.find((h) => h.id === activeId)
  const label = activeHeading?.text ?? headings[0]?.text ?? ''
  const labelKey = activeHeading?.id ?? headings[0]?.id ?? 'toc'

  return (
    <Popover className='relative min-w-0 flex-1'>
      {({ close }) => (
        <>
          <PopoverButton className='flex min-h-[34px] w-full max-w-full min-w-0 items-center gap-1.5 rounded-full py-0.5 pr-2 pl-2.5 text-left transition-colors outline-none hover:opacity-90'>
            <span className='inline-flex min-h-0 min-w-0 flex-1 basis-0 items-center'>
              <AnimatePresence mode='wait' initial={false}>
                <motion.span
                  key={labelKey}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className='block max-w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap'
                >
                  <Text
                    as='span'
                    size='xs'
                    weight='medium'
                    colour='inherit'
                    truncate
                    className='block max-w-full min-w-0 truncate leading-snug text-slate-900 dark:text-slate-100'
                  >
                    {label}
                  </Text>
                </motion.span>
              </AnimatePresence>
            </span>
            <CaretUpIcon
              weight='bold'
              className='size-3 shrink-0 self-center text-slate-500 dark:text-slate-300'
            />
          </PopoverButton>

          <Transition
            as={Fragment}
            unmount={false}
            enter='transition ease-out duration-150'
            enterFrom='opacity-0 translate-y-2'
            enterTo='opacity-100 translate-y-0'
            leave='transition ease-in duration-100'
            leaveFrom='opacity-100 translate-y-0'
            leaveTo='opacity-0 translate-y-2'
          >
            <PopoverPanel
              unmount={false}
              as='nav'
              aria-label='On this page'
              className='absolute right-0 bottom-full z-50 mb-3 w-[min(400px,calc(100vw-4rem))] rounded-xl border border-gray-200/90 bg-white/92 p-1.5 shadow-2xl ring-1 ring-gray-300/60 backdrop-blur-xl backdrop-saturate-150 supports-backdrop-filter:bg-white/88 dark:border-white/10 dark:bg-slate-950/92 dark:ring-slate-600/50 dark:supports-backdrop-filter:bg-slate-950/84'
            >
              <div className='max-h-[50vh] overflow-y-auto'>
                {headings.map((heading, index) => {
                  const number = String(index + 1).padStart(2, '0')
                  const isActive = heading.id === activeId

                  return (
                    <a
                      key={heading.id}
                      href={`#${heading.id}`}
                      onClick={() => close()}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800/50'
                          : 'hover:bg-gray-50 dark:hover:bg-slate-800/70',
                      )}
                    >
                      <Text
                        as='span'
                        size='xxs'
                        weight='medium'
                        colour='inherit'
                        className={cn(
                          'shrink-0 font-mono leading-none tabular-nums',
                          isActive
                            ? 'text-slate-700 dark:text-slate-200'
                            : 'text-slate-500 dark:text-slate-400',
                        )}
                      >
                        #{number}
                      </Text>
                      <Text
                        as='span'
                        size='xs'
                        weight='medium'
                        colour='inherit'
                        className={cn(
                          'leading-snug',
                          isActive
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-700 dark:text-slate-200',
                        )}
                      >
                        {heading.text}
                      </Text>
                    </a>
                  )
                })}
              </div>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}

export default function ArticleNav({
  articleRef,
  headings,
}: {
  articleRef: RefObject<HTMLElement | null>
  headings: ArticleHeading[]
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  const handleScroll = useCallback(() => {
    const article = articleRef.current
    if (!article) return

    const articleRect = article.getBoundingClientRect()
    const articleTop = articleRect.top + window.scrollY
    const articleBottom = articleTop + articleRect.height
    const scrollY = window.scrollY
    const viewportHeight = window.innerHeight

    const currentProgress = Math.min(
      1,
      Math.max(
        0,
        (scrollY - articleTop + viewportHeight) / (articleBottom - articleTop),
      ),
    )
    setProgress(currentProgress)

    setVisible(scrollY > articleTop + 100)

    const els = article.querySelectorAll<HTMLElement>('h2[id], h3[id]')
    let currentActiveId: string | null = null
    for (const el of els) {
      if (el.getBoundingClientRect().top <= 100) {
        currentActiveId = el.id
      }
    }
    setActiveId(currentActiveId)
  }, [articleRef])

  useEffect(() => {
    let rafId: number
    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(handleScroll)
    }

    handleScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafId)
    }
  }, [handleScroll, headings])

  if (headings.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={false}
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 20 }}
        inert={!visible}
        aria-hidden={!visible}
        style={{ visibility: visible ? 'visible' : 'hidden' }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className='fixed bottom-5 left-1/2 z-50 -translate-x-1/2'
      >
        <div className='flex max-w-[min(320px,calc(100vw-2rem))] min-w-0 items-center gap-0.5 rounded-full border border-gray-200/90 bg-white/90 py-0.5 pr-0.5 pl-1 shadow-2xl ring-1 ring-gray-300/60 backdrop-blur-xl backdrop-saturate-150 supports-backdrop-filter:bg-white/82 dark:border-white/10 dark:bg-slate-950/90 dark:ring-slate-600/50 dark:supports-backdrop-filter:bg-slate-950/82'>
          <ScrollToTopButton progress={progress} />
          <HeadingSelector headings={headings} activeId={activeId} />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
