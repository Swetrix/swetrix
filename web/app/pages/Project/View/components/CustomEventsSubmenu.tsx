import { Transition } from '@headlessui/react'
import _map from 'lodash/map'
import _size from 'lodash/size'
import _truncate from 'lodash/truncate'
import { ChevronRightIcon } from 'lucide-react'
import React, { memo, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import Checkbox from '~/ui/Checkbox'
import { cn } from '~/utils/generic'

const CUSTOM_EV_DROPDOWN_MAX_VISIBLE_LENGTH = 32

interface CustomEventsSubmenuProps {
  label: string
  chartMetricsCustomEvents: Array<{ id: string; label: string; active: boolean }>
  switchCustomEventChart: (id: string) => void
}

const CustomEventsSubmenu: React.FC<CustomEventsSubmenuProps> = ({
  label,
  chartMetricsCustomEvents,
  switchCustomEventChart,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isOnRight, setIsOnRight] = useState(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsOpen(true)
    calculatePosition()
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 150)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsOpen(!isOpen)
    calculatePosition()
  }

  const calculatePosition = () => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    const submenuWidth = 320 // 80 * 4 (w-80 in Tailwind)
    const padding = 8

    const spaceOnRight = viewportW - rect.right
    const spaceOnLeft = rect.left

    const placeOnRight = spaceOnRight >= submenuWidth || spaceOnLeft < spaceOnRight
    setIsOnRight(placeOnRight)

    let left = placeOnRight ? rect.right + padding : Math.max(padding, rect.left - submenuWidth - padding)

    // Try to keep submenu within viewport vertically
    const estimatedHeight = submenuRef.current?.offsetHeight || 240
    let top = rect.top
    if (top + estimatedHeight + padding > viewportH) {
      top = Math.max(padding, viewportH - estimatedHeight - padding)
    }
    if (top < padding) top = padding

    setCoords({ top, left })
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        submenuRef.current &&
        !submenuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleReposition = () => calculatePosition()

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleReposition, true)
      window.addEventListener('resize', handleReposition)
      calculatePosition()
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
    }
  }, [isOpen])

  return (
    <div ref={triggerRef} className='relative w-full' onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div
        className='w-full cursor-pointer rounded-md p-2 text-sm text-gray-700 hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-700'
        onClick={handleClick}
      >
        <div className='flex items-center justify-between'>
          <span>{label}</span>
          <ChevronRightIcon className='size-4 text-gray-500 dark:text-gray-400' />
        </div>
      </div>

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <Transition
              show={isOpen}
              as={React.Fragment}
              enter='transition ease-out duration-100'
              enterFrom='transform opacity-0 scale-95'
              enterTo='transform opacity-100 scale-100'
              leave='transition ease-in duration-75'
              leaveFrom='transform opacity-100 scale-100'
              leaveTo='transform opacity-0 scale-95'
            >
              <div
                ref={submenuRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={cn(
                  'fixed z-50 w-80 max-w-sm rounded-md bg-gray-50 p-1 ring-1 ring-black/10 dark:bg-slate-800',
                )}
                style={{ top: coords.top, left: isOnRight ? coords.left : Math.max(8, coords.left) }}
              >
                <div className='max-h-60 overflow-auto'>
                  {_map(chartMetricsCustomEvents, (event) => (
                    <button
                      key={event.id}
                      type='button'
                      onClick={() => {
                        switchCustomEventChart(event.id)
                      }}
                      className='block w-full cursor-pointer rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-700'
                    >
                      <div
                        className='max-w-max'
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      >
                        <Checkbox
                          classes={{
                            label: 'max-w-max',
                          }}
                          label={
                            _size(event.label) > CUSTOM_EV_DROPDOWN_MAX_VISIBLE_LENGTH ? (
                              <span title={event.label}>
                                {_truncate(event.label, {
                                  length: CUSTOM_EV_DROPDOWN_MAX_VISIBLE_LENGTH,
                                })}
                              </span>
                            ) : (
                              event.label
                            )
                          }
                          onChange={() => {
                            switchCustomEventChart(event.id)
                          }}
                          checked={event.active}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Transition>,
            document.body,
          )
        : null}
    </div>
  )
}

export default memo(CustomEventsSubmenu)
