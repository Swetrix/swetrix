import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { QuestionIcon } from '@phosphor-icons/react'
import React, { forwardRef, memo } from 'react'

import { cn } from '~/utils/generic'

const TooltipProvider = TooltipPrimitive.Provider

const TooltipRoot = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 2, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      forceMount
      sideOffset={sideOffset}
      className={cn(
        'tooltip-content z-50 max-w-80 overflow-hidden rounded-md bg-slate-800 px-3 py-1.5 text-xs text-white ring-1 ring-slate-900/80',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

interface TooltipProps {
  text: string | number | React.ReactNode
  className?: string
  tooltipNode?: React.ReactNode
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
  delay = 50,
  disableHoverableContent,
}: TooltipProps) => (
  <TooltipProvider
    delayDuration={delay}
    disableHoverableContent={disableHoverableContent}
  >
    <TooltipRoot>
      <TooltipTrigger className={className}>
        {tooltipNode || (
          <QuestionIcon className='size-4.5 fill-slate-700 stroke-gray-50 dark:fill-slate-200 dark:stroke-slate-800' />
        )}
      </TooltipTrigger>
      <TooltipContent
        className={disableHoverableContent ? 'pointer-events-none' : undefined}
      >
        {text}
      </TooltipContent>
    </TooltipRoot>
  </TooltipProvider>
)

export default memo(Tooltip)
