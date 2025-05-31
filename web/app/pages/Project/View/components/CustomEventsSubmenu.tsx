import { Transition } from '@headlessui/react'
import _map from 'lodash/map'
import _size from 'lodash/size'
import _truncate from 'lodash/truncate'
import { ChevronRightIcon } from 'lucide-react'
import React, { memo, useEffect, useRef, useState } from 'react'

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
    const viewport = window.innerWidth
    const submenuWidth = 320 // 80 * 4 (w-80 in Tailwind)

    const spaceOnRight = viewport - rect.right
    const spaceOnLeft = rect.left

    if (spaceOnRight < submenuWidth && spaceOnLeft > spaceOnRight) {
      setIsOnRight(false)
    } else {
      setIsOnRight(true)
    }
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

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={triggerRef} className='relative w-full' onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div
        className='w-full cursor-pointer rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-700'
        onClick={handleClick}
      >
        <div className='flex items-center justify-between'>
          <span>{label}</span>
          <ChevronRightIcon className='size-4 text-gray-500 dark:text-gray-400' />
        </div>
      </div>

      {isOpen ? (
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
            className={cn(
              'absolute top-0 z-50 w-80 max-w-sm rounded-md bg-gray-50 p-1 ring-1 ring-black/10 dark:bg-slate-800',
              isOnRight ? 'left-full ml-1' : 'right-full mr-1',
            )}
          >
            <div className='max-h-60 overflow-auto'>
              {_map(chartMetricsCustomEvents, (event) => (
                <button
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
                      e.preventDefault()
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
        </Transition>
      ) : null}
    </div>
  )
}

export default memo(CustomEventsSubmenu)
