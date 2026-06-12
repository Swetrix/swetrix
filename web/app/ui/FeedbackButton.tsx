import { CheckIcon } from '@phosphor-icons/react'
import React, { useEffect, useRef, useState } from 'react'

import { cn } from '~/utils/generic'

import Button, { ButtonProps } from './Button'
import Spin from './icons/Spin'

type FeedbackPhase = 'idle' | 'loading' | 'success'

interface FeedbackButtonProps extends Omit<ButtonProps, 'loading'> {
  loading?: boolean
  /**
   * Outcome of the submission that just finished. Pass `false` to skip the
   * success checkmark when the request failed (the error toast still shows).
   */
  succeeded?: boolean
}

const MORPH_LAYER_CLASSES =
  'col-start-1 row-start-1 flex items-center justify-center whitespace-nowrap transition-[opacity,filter,transform] duration-200 ease-out-quint motion-reduce:transition-opacity'
const MORPH_HIDDEN_CLASSES =
  'scale-95 opacity-0 blur-[2px] motion-reduce:scale-100 motion-reduce:blur-0'

/**
 * Submit button that morphs its content between idle → loading (spinner) →
 * success (checkmark, auto-reverts after 1.5s). The three states are stacked
 * in one grid cell so the button never changes width.
 */
const FeedbackButton = ({
  loading,
  succeeded,
  disabled,
  className,
  children,
  ...props
}: FeedbackButtonProps) => {
  const [phase, setPhase] = useState<FeedbackPhase>('idle')
  const prevLoading = useRef(false)
  const revertTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  useEffect(() => {
    if (loading && !prevLoading.current) {
      clearTimeout(revertTimer.current)
      setPhase('loading')
    } else if (!loading && prevLoading.current) {
      if (succeeded === false) {
        setPhase('idle')
      } else {
        setPhase('success')
        revertTimer.current = setTimeout(() => setPhase('idle'), 1500)
      }
    }
    prevLoading.current = !!loading
  }, [loading, succeeded])

  useEffect(() => () => clearTimeout(revertTimer.current), [])

  return (
    <Button
      {...props}
      disabled={disabled || phase === 'loading'}
      className={cn('grid', className)}
    >
      <span
        className={cn(
          MORPH_LAYER_CLASSES,
          phase !== 'idle' && MORPH_HIDDEN_CLASSES,
        )}
      >
        {children}
      </span>
      <span
        aria-hidden={phase !== 'loading'}
        className={cn(
          MORPH_LAYER_CLASSES,
          phase !== 'loading' && MORPH_HIDDEN_CLASSES,
        )}
      >
        <Spin inherit />
        {children}
      </span>
      <span
        aria-hidden={phase !== 'success'}
        className={cn(
          MORPH_LAYER_CLASSES,
          phase !== 'success' && MORPH_HIDDEN_CLASSES,
        )}
      >
        <CheckIcon className='mr-2 -ml-1 size-4' weight='bold' />
        {children}
      </span>
    </Button>
  )
}

export default FeedbackButton
