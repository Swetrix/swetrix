import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { QuestionIcon } from '@phosphor-icons/react'
import React, { forwardRef, memo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '~/utils/generic'

const TooltipProvider = TooltipPrimitive.Provider

const TooltipRoot = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

/**
 * Skip-delay grace period shared across ALL tooltip instances (each renders
 * its own Radix provider, so Radix's built-in skipDelayDuration can't help).
 * While any tooltip is open — or was open within the last 300ms — hovering
 * another tooltip shows it instantly: no open delay and (via the
 * `data-state='instant-open'` CSS) no entry animation.
 */
const SKIP_DELAY_WINDOW_MS = 300
let lastTooltipActivityAt = 0

const markTooltipActivity = () => {
  lastTooltipActivityAt = Date.now()
}

const isWithinSkipDelayWindow = () =>
  Date.now() - lastTooltipActivityAt < SKIP_DELAY_WINDOW_MS

type TooltipContentVariant = 'default' | 'chart'

const TOOLTIP_CONTENT_VARIANT_CLASSES: Record<TooltipContentVariant, string> = {
  default:
    'max-w-80 bg-slate-900 px-2.5 py-1.5 text-xs leading-relaxed font-medium text-slate-50 shadow-lg ring-1 ring-white/10 dark:bg-slate-800 dark:ring-white/5',
  chart:
    'max-w-xs bg-gray-50 px-2 py-1 text-xs leading-relaxed text-gray-900 shadow-md ring-1 ring-black/10 md:text-sm dark:bg-slate-900 dark:text-gray-50',
}

const TOOLTIP_ARROW_VARIANT_CLASSES: Record<TooltipContentVariant, string> = {
  default: 'fill-slate-900 dark:fill-slate-800',
  chart: 'fill-gray-50 dark:fill-slate-900',
}

export const tooltipContentClasses = ({
  contentVariant = 'default',
  className,
}: {
  contentVariant?: TooltipContentVariant
  className?: string
} = {}) =>
  cn(
    'tooltip-content z-50 origin-(--radix-tooltip-content-transform-origin) overflow-hidden rounded-md',
    TOOLTIP_CONTENT_VARIANT_CLASSES[contentVariant],
    className,
  )

interface TooltipContentExtraProps {
  withArrow?: boolean
  arrowClassName?: string
  contentVariant?: TooltipContentVariant
}

const TooltipContent = forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> &
    TooltipContentExtraProps
>(
  (
    {
      className,
      sideOffset = 6,
      withArrow = true,
      arrowClassName,
      contentVariant = 'default',
      children,
      ...props
    },
    ref,
  ) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        forceMount
        sideOffset={sideOffset}
        className={tooltipContentClasses({ contentVariant, className })}
        {...props}
      >
        {children}
        {withArrow ? (
          <TooltipPrimitive.Arrow
            className={cn(
              TOOLTIP_ARROW_VARIANT_CLASSES[contentVariant],
              arrowClassName,
            )}
            width={10}
            height={5}
          />
        ) : null}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  ),
)
TooltipContent.displayName = TooltipPrimitive.Content.displayName

interface TooltipProps {
  text: string | number | React.ReactNode
  className?: string
  contentClassName?: string
  arrowClassName?: string
  contentVariant?: TooltipContentVariant
  tooltipNode?: React.ReactNode
  ariaLabel?: string
  asChild?: boolean
  delay?: number
  /**
   * When true, the tooltip content won't capture hover events,
   * allowing users to quickly move between trigger elements.
   */
  disableHoverableContent?: boolean
}

const Tooltip = ({
  text,
  className,
  tooltipNode,
  ariaLabel,
  asChild,
  contentClassName,
  arrowClassName,
  contentVariant = 'default',
  delay = 300,
  disableHoverableContent,
}: TooltipProps) => {
  const { t } = useTranslation()
  const triggerAriaLabel = ariaLabel || t('common.learnMore')
  // Decided on pointer enter, before Radix starts its open timer
  const [instant, setInstant] = useState(false)

  return (
    <TooltipProvider
      delayDuration={instant ? 0 : delay}
      disableHoverableContent={disableHoverableContent}
    >
      <TooltipRoot onOpenChange={markTooltipActivity}>
        <TooltipTrigger
          asChild={asChild}
          className={className}
          aria-label={triggerAriaLabel}
          onPointerEnter={() => setInstant(isWithinSkipDelayWindow())}
        >
          {tooltipNode || (
            <QuestionIcon className='size-4 cursor-help fill-slate-700 stroke-gray-50 dark:fill-slate-200 dark:stroke-slate-800' />
          )}
        </TooltipTrigger>
        <TooltipContent
          contentVariant={contentVariant}
          className={cn(
            contentClassName,
            disableHoverableContent && 'pointer-events-none',
          )}
          arrowClassName={arrowClassName}
        >
          {text}
        </TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  )
}

export { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent }

export default memo(Tooltip)
