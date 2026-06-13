import React, { useRef, useState } from 'react'

import { cn } from '~/utils/generic'

import { buttonClasses } from './Button'

const HOLD_DURATION_MS = 1500

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface HoldToConfirmButtonProps {
  onConfirm: () => void
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

/**
 * Destructive confirmation button: press and hold until the red fill sweeps
 * across, then the action fires. Releasing early snaps the fill back.
 *
 * Keyboard activation (Enter/Space) and `prefers-reduced-motion` users get a
 * plain click — the surrounding confirmation modal is their safety net.
 */
const HoldToConfirmButton = ({
  onConfirm,
  children,
  disabled,
  className,
}: HoldToConfirmButtonProps) => {
  const [pressing, setPressing] = useState(false)
  const activePointerId = useRef<number | null>(null)
  const lastConfirmAt = useRef(0)

  const confirm = () => {
    // Enter keydown auto-repeats clicks; debounce repeated activations
    if (Date.now() - lastConfirmAt.current < 500) return
    lastConfirmAt.current = Date.now()
    onConfirm()
  }

  const stopHold = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== activePointerId.current) return
    activePointerId.current = null
    setPressing(false)
  }

  return (
    <button
      type='button'
      disabled={disabled}
      className={cn(
        buttonClasses({ variant: 'danger', size: 'lg' }),
        'touch-none overflow-hidden',
        pressing && 'scale-[0.97]',
        className,
      )}
      onPointerDown={(e) => {
        // Keyboard & reduced-motion users confirm with a plain click instead
        if (disabled || prefersReducedMotion()) return
        // Ignore additional touch points while a hold is in progress
        if (activePointerId.current !== null) return
        if (e.button !== 0) return

        activePointerId.current = e.pointerId
        // Capture so releasing outside the button still ends the hold
        e.currentTarget.setPointerCapture(e.pointerId)
        setPressing(true)
      }}
      onPointerUp={stopHold}
      onPointerCancel={stopHold}
      onClick={(e) => {
        // detail === 0 — keyboard-triggered click (Enter/Space)
        if (e.detail === 0 || prefersReducedMotion()) {
          confirm()
        }
      }}
      onContextMenu={(e) => {
        // Long-press on touch devices must not open the context menu
        if (pressing) e.preventDefault()
      }}
    >
      <span
        aria-hidden
        className='pointer-events-none absolute inset-0 rounded-[inherit] bg-red-800'
        style={{
          clipPath: pressing ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
          transition: pressing
            ? `clip-path ${HOLD_DURATION_MS}ms linear`
            : 'clip-path 200ms var(--ease-out-quint)',
        }}
        onTransitionEnd={(e) => {
          if (e.propertyName !== 'clip-path' || !pressing) return
          activePointerId.current = null
          setPressing(false)
          confirm()
        }}
      />
      <span className='relative z-10'>{children}</span>
    </button>
  )
}

export default HoldToConfirmButton
