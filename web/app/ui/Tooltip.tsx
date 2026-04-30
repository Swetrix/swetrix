import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { QuestionIcon } from '@phosphor-icons/react'
import React, { forwardRef, memo } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '~/utils/generic'

const TooltipProvider = TooltipPrimitive.Provider

const TooltipRoot = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

interface TooltipContentExtraProps {
  withArrow?: boolean
}

const TooltipContent = forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> &
    TooltipContentExtraProps
>(
  (
    { className, sideOffset = 6, withArrow = true, children, ...props },
    ref,
  ) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        forceMount
        sideOffset={sideOffset}
        className={cn(
          'tooltip-content z-50 max-w-80 origin-(--radix-tooltip-content-transform-origin) overflow-hidden rounded-md bg-slate-900 px-2.5 py-1.5 text-xs leading-relaxed font-medium text-slate-50 shadow-lg ring-1 ring-white/10 dark:bg-slate-800 dark:ring-white/5',
          className,
        )}
        {...props}
      >
        {children}
        {withArrow ? (
          <TooltipPrimitive.Arrow
            className='fill-slate-900 dark:fill-slate-800'
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
  delay = 50,
  disableHoverableContent,
}: TooltipProps) => {
  const { t } = useTranslation()
  const triggerAriaLabel = ariaLabel || t('common.learnMore')

  return (
    <TooltipProvider
      delayDuration={delay}
      disableHoverableContent={disableHoverableContent}
    >
      <TooltipRoot>
        <TooltipTrigger
          asChild={asChild}
          className={className}
          aria-label={triggerAriaLabel}
        >
          {tooltipNode || (
            <QuestionIcon className='size-4.5 fill-slate-700 stroke-gray-50 dark:fill-slate-200 dark:stroke-slate-800' />
          )}
        </TooltipTrigger>
        <TooltipContent
          className={
            disableHoverableContent ? 'pointer-events-none' : undefined
          }
        >
          {text}
        </TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  )
}

export { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent }

export default memo(Tooltip)
