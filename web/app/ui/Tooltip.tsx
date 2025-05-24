import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import cx from 'clsx'
import { CircleHelpIcon } from 'lucide-react'
import React, { forwardRef, memo } from 'react'

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
      sideOffset={sideOffset}
      className={cx(
        // Animation does not work
        // 'transform-gpu transition-all duration-300 ease-in-out',
        // 'data-[state=closed]:scale-90 data-[state=delayed-open]:scale-100',
        // 'data-[state=closed]:opacity-0 data-[state=delayed-open]:opacity-100',
        'z-50 max-w-80 overflow-hidden rounded-md bg-slate-800 px-3 py-1.5 text-xs text-white ring-1 ring-slate-900/80',
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
}

const Tooltip = ({ text, className, tooltipNode }: TooltipProps) => (
  <TooltipProvider delayDuration={200}>
    <TooltipRoot>
      <TooltipTrigger className={className}>
        {tooltipNode || (
          <CircleHelpIcon
            className='h-5 w-5 fill-slate-700 stroke-gray-50 dark:fill-slate-200 dark:stroke-slate-800'
            strokeWidth={1.5}
          />
        )}
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </TooltipRoot>
  </TooltipProvider>
)

export default memo(Tooltip)
