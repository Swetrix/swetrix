import cx from 'clsx'
import _clamp from 'lodash/clamp'
import _isEmpty from 'lodash/isEmpty'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import React, { memo, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react'
import { useTranslation } from 'react-i18next'

import useOnClickOutside from '~/hooks/useOnClickOutside'
import { MAX_MONTHS_IN_PAST } from '~/lib/constants'
import { cn } from '~/utils/generic'

interface DatePickerProps {
  onChange?: (dates: Date[]) => void
  value?: Date[]
  maxDateMonths?: number
  options?: { altInputClass?: string }
  maxRange?: number
  className?: string
  mode?: 'single' | 'range'
}

type DatePickerHandle = {
  openCalendar: () => void
  closeCalendar: () => void
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

const addDays = (d: Date, days: number) => {
  const res = new Date(d)
  res.setDate(res.getDate() + days)
  return res
}

const removeMonths = (date: Date, months: number) => {
  const d = date.getDate()
  date.setMonth(date.getMonth() - months)
  if (date.getDate() !== d) {
    date.setDate(0)
  }
  return date
}

const areSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const getDaysMatrix = (anchor: Date) => {
  const firstDay = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const startWeekday = firstDay.getDay() // 0 Sun .. 6 Sat
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()

  const days: Date[] = []
  // Prev month padding
  for (let i = 0; i < startWeekday; i += 1) {
    days.push(addDays(firstDay, i - startWeekday))
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d += 1) {
    days.push(new Date(anchor.getFullYear(), anchor.getMonth(), d))
  }
  // Next month padding to complete 42 cells
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i += 1) {
    days.push(new Date(anchor.getFullYear(), anchor.getMonth() + 1, i))
  }
  return days
}

const formatRangeLabel = (locale: string, value?: Date[], mode: 'single' | 'range' = 'range') => {
  if (!value || value.length < 1) return ''
  const formatter = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: '2-digit' })
  if (mode === 'single' || value.length === 1 || !value[1]) return formatter.format(value[0])
  return `${formatter.format(value[0])} — ${formatter.format(value[1])}`
}

const DatePicker = forwardRef<DatePickerHandle, DatePickerProps>(function DatePickerInner(
  { onChange, value = [], maxDateMonths = MAX_MONTHS_IN_PAST, options, maxRange = 0, className, mode = 'range' },
  ref,
) {
  const isSingleMode = mode === 'single'
  const { i18n } = useTranslation('common')
  const locale = i18n.language

  const today = useMemo(() => startOfDay(new Date()), [])
  const absoluteMinDate = useMemo(() => startOfDay(removeMonths(new Date(), maxDateMonths)), [maxDateMonths])

  const [open, setOpen] = useState(false)
  const [anchorMonth, setAnchorMonth] = useState<Date>(() => startOfDay(value?.[0] || today))
  const [start, setStart] = useState<Date | null>(() => (value?.[0] ? startOfDay(value[0]) : null))
  const [end, setEnd] = useState<Date | null>(() => (value?.[1] ? startOfDay(value[1]) : null))
  const [hoverDate, setHoverDate] = useState<Date | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useOnClickOutside(popoverRef as React.RefObject<HTMLDivElement | HTMLUListElement>, () => setOpen(false))

  // Imperative API
  useImperativeHandle(ref, () => ({
    openCalendar: () => setOpen(true),
    closeCalendar: () => setOpen(false),
  }))

  // Sync with external value
  useEffect(() => {
    if (!_isEmpty(value)) {
      setStart(value[0] ? startOfDay(value[0]) : null) // eslint-disable-line react-hooks/set-state-in-effect -- Syncing internal state with controlled value prop
      setEnd(value[1] ? startOfDay(value[1]) : null)
      if (value[0]) setAnchorMonth(startOfDay(value[0]))
    }
  }, [value])

  const weekFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale])

  const weekdays = useMemo(() => {
    const base = new Date(2021, 7, 1) // Sunday
    return Array.from({ length: 7 }).map((_, i) => weekFormatter.format(addDays(base, i)))
  }, [weekFormatter])

  const rangeBounds = useMemo(() => {
    if (!start || maxRange <= 0) {
      return { min: absoluteMinDate, max: today }
    }
    const min = startOfDay(addDays(start, -maxRange))
    const max = startOfDay(addDays(start, maxRange))
    return { min: min < absoluteMinDate ? absoluteMinDate : min, max: max > today ? today : max }
  }, [start, maxRange, absoluteMinDate, today])

  const isDisabled = (d: Date) => {
    const sd = startOfDay(d)
    if (sd < rangeBounds.min) return true
    if (sd > rangeBounds.max) return true
    return false
  }

  const isInCurrentMonth = (d: Date) =>
    d.getMonth() === anchorMonth.getMonth() && d.getFullYear() === anchorMonth.getFullYear()

  const days = useMemo(() => getDaysMatrix(anchorMonth), [anchorMonth])

  const minYear = absoluteMinDate.getFullYear()
  const maxYear = today.getFullYear()
  const minMonthOfMinYear = absoluteMinDate.getMonth()
  const maxMonthOfMaxYear = today.getMonth()

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, idx) =>
        new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2021, idx, 1)),
      ),
    [locale],
  )

  const setAnchor = (year: number, month: number) => {
    const clampedYear = Math.max(minYear, Math.min(maxYear, year))
    let clampedMonth = month
    if (clampedYear === minYear) clampedMonth = Math.max(minMonthOfMinYear, clampedMonth)
    if (clampedYear === maxYear) clampedMonth = Math.min(maxMonthOfMaxYear, clampedMonth)
    setAnchorMonth(new Date(clampedYear, clampedMonth, 1))
  }

  const handlePrevMonth = () => {
    const prev = new Date(anchorMonth.getFullYear(), anchorMonth.getMonth() - 1, 1)
    // Clamp within [absoluteMinDate, today]
    const minMonth = new Date(absoluteMinDate.getFullYear(), absoluteMinDate.getMonth(), 1)
    if (prev < minMonth) return
    setAnchorMonth(prev)
  }

  const handleNextMonth = () => {
    const next = new Date(anchorMonth.getFullYear(), anchorMonth.getMonth() + 1, 1)
    const maxMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    if (next > maxMonth) return
    setAnchorMonth(next)
  }

  const commitRange = (a: Date, b: Date) => {
    const from = startOfDay(a)
    const to = startOfDay(b)
    const startN = from <= to ? from : to
    const endN = from <= to ? to : from
    setStart(startN)
    setEnd(endN)
    onChange?.([startN, endOfDay(endN)])
    setOpen(false)
  }

  const onDayClick = (d: Date) => {
    const sd = startOfDay(d)

    // Single mode: immediately select and close
    if (isSingleMode) {
      setStart(sd)
      setEnd(null)
      onChange?.([sd])
      setOpen(false)
      return
    }

    // Range mode logic
    if (!start || (start && end)) {
      setStart(sd)
      setEnd(null)
      setHoverDate(null)
      // Move anchor when clicking other month day
      setAnchorMonth(new Date(sd.getFullYear(), sd.getMonth(), 1))
      return
    }
    // If second click on the same date -> single-day range
    if (start && areSameDay(start, sd)) {
      commitRange(sd, sd)
      return
    }
    // Enforce maxRange
    if (maxRange > 0) {
      const minAllowed = startOfDay(addDays(start, -maxRange))
      const maxAllowed = startOfDay(addDays(start, maxRange))
      const clamped = startOfDay(
        new Date(_clamp(sd.getTime(), minAllowed.getTime(), Math.min(maxAllowed.getTime(), today.getTime()))),
      )
      commitRange(start, clamped)
      return
    }
    commitRange(start, sd)
  }

  const inRange = (d: Date) => {
    // No range highlighting in single mode
    if (isSingleMode) return false
    if (!start) return false
    const sd = startOfDay(d)
    const [lo, hi] = end
      ? [start <= end ? start : end, start <= end ? end : start]
      : hoverDate
        ? [start <= hoverDate ? start : hoverDate, start <= hoverDate ? hoverDate : start]
        : [null, null]
    if (!lo || !hi) return false
    return sd >= lo && sd <= hi
  }

  const label = useMemo(
    () => formatRangeLabel(locale, start && end ? [start, end] : start ? [start] : [], mode),
    [locale, start, end, mode],
  )

  return (
    <div className={options ? undefined : cn('relative inline-block h-0 align-top', className)}>
      {/* Trigger input (optional visible) */}
      {options ? (
        <input
          readOnly
          onClick={() => setOpen(true)}
          value={label || ''}
          placeholder={isSingleMode ? 'Select a date...' : 'Select a date range...'}
          className={options.altInputClass}
        />
      ) : null}

      {/* Popover */}
      {open ? (
        options ? (
          // Centered modal when used as input
          <div className='fixed inset-0 z-50 flex items-start justify-center bg-black/20 p-4'>
            <div
              ref={popoverRef}
              className='mt-10 w-[320px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900'
            >
              <div className='flex items-center justify-between'>
                <button
                  type='button'
                  className='rounded-md p-2 hover:bg-gray-100 dark:hover:bg-slate-800'
                  onClick={handlePrevMonth}
                  aria-label='Previous month'
                >
                  <ChevronLeftIcon className='size-5' />
                </button>
                <div className='flex items-center gap-2'>
                  <div className='relative'>
                    <select
                      aria-label='Month'
                      className='appearance-none rounded-md border border-gray-200 bg-white px-2 py-1 pr-7 text-sm text-gray-900 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-50'
                      value={anchorMonth.getMonth()}
                      onChange={(e) => setAnchor(anchorMonth.getFullYear(), Number(e.target.value))}
                    >
                      {monthNames.map((m, idx) => (
                        <option
                          key={idx}
                          value={idx}
                          disabled={
                            (anchorMonth.getFullYear() === minYear && idx < minMonthOfMinYear) ||
                            (anchorMonth.getFullYear() === maxYear && idx > maxMonthOfMaxYear)
                          }
                        >
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className='relative'>
                    <select
                      aria-label='Year'
                      className='appearance-none rounded-md border border-gray-200 bg-white px-2 py-1 pr-7 text-sm text-gray-900 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-50'
                      value={anchorMonth.getFullYear()}
                      onChange={(e) => setAnchor(Number(e.target.value), anchorMonth.getMonth())}
                    >
                      {Array.from({ length: maxYear - minYear + 1 }).map((_, i) => {
                        const y = minYear + i
                        return (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>
                <button
                  type='button'
                  className='rounded-md p-2 hover:bg-gray-100 dark:hover:bg-slate-800'
                  onClick={handleNextMonth}
                  aria-label='Next month'
                >
                  <ChevronRightIcon className='size-5' />
                </button>
              </div>
              <div className='mt-2 grid grid-cols-7 gap-1 text-center text-xs text-gray-500 dark:text-gray-300'>
                {weekdays.map((wd, idx) => (
                  <div key={idx}>{wd}</div>
                ))}
              </div>
              <div className='mt-1 grid grid-cols-7 gap-1'>
                {days.map((d, idx) => {
                  const disabled = isDisabled(d)
                  const isStart = !!start && areSameDay(d, start)
                  const isEnd = !!end && areSameDay(d, end)
                  const isBetween = inRange(d)
                  const isCurrentMonth = isInCurrentMonth(d)
                  return (
                    <button
                      key={idx}
                      type='button'
                      disabled={disabled}
                      onMouseEnter={() => setHoverDate(start && !end ? startOfDay(d) : null)}
                      onMouseLeave={() => setHoverDate(null)}
                      onClick={() => !disabled && onDayClick(d)}
                      className={cx('relative h-9 w-9 rounded-md text-sm select-none', {
                        'text-gray-900 dark:text-gray-100': isCurrentMonth && !disabled,
                        'text-gray-400 dark:text-gray-500': !isCurrentMonth || disabled,
                        'bg-indigo-600 text-white dark:bg-indigo-500': isStart || isEnd,
                        'bg-gray-100 dark:bg-slate-800': isBetween && !isStart && !isEnd,
                        'cursor-not-allowed opacity-50': disabled,
                        'hover:bg-gray-200 dark:hover:bg-slate-700': !disabled && !isStart && !isEnd,
                      })}
                    >
                      {d.getDate()}
                    </button>
                  )
                })}
              </div>
              <div className='mt-3 flex items-center justify-between'>
                <div className='text-xs text-gray-600 dark:text-gray-300'>
                  {label || new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short' }).format(anchorMonth)}
                </div>
                <div className='flex gap-2'>
                  <button
                    type='button'
                    className='rounded-md px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800'
                    onClick={() => {
                      setStart(null)
                      setEnd(null)
                      setHoverDate(null)
                    }}
                  >
                    Clear
                  </button>
                  <button
                    type='button'
                    className='rounded-md bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-500'
                    disabled={!start}
                    onClick={() => {
                      if (!start) return
                      commitRange(start, end || start)
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Anchored popover (toolbar usage)
          <div className='absolute top-7 right-0 z-50'>
            <div
              ref={popoverRef}
              className='w-[320px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900'
            >
              <div className='flex items-center justify-between'>
                <button
                  type='button'
                  className='rounded-md p-2 hover:bg-gray-100 dark:hover:bg-slate-800'
                  onClick={handlePrevMonth}
                  aria-label='Previous month'
                >
                  <ChevronLeftIcon className='size-5' />
                </button>
                <div className='flex items-center gap-2'>
                  <div className='relative'>
                    <select
                      aria-label='Month'
                      className='appearance-none rounded-md border border-gray-200 bg-white px-2 py-1 pr-7 text-sm text-gray-900 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-50'
                      value={anchorMonth.getMonth()}
                      onChange={(e) => setAnchor(anchorMonth.getFullYear(), Number(e.target.value))}
                    >
                      {monthNames.map((m, idx) => (
                        <option
                          key={idx}
                          value={idx}
                          disabled={
                            (anchorMonth.getFullYear() === minYear && idx < minMonthOfMinYear) ||
                            (anchorMonth.getFullYear() === maxYear && idx > maxMonthOfMaxYear)
                          }
                        >
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className='relative'>
                    <select
                      aria-label='Year'
                      className='appearance-none rounded-md border border-gray-200 bg-white px-2 py-1 pr-7 text-sm text-gray-900 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-50'
                      value={anchorMonth.getFullYear()}
                      onChange={(e) => setAnchor(Number(e.target.value), anchorMonth.getMonth())}
                    >
                      {Array.from({ length: maxYear - minYear + 1 }).map((_, i) => {
                        const y = minYear + i
                        return (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>
                <button
                  type='button'
                  className='rounded-md p-2 hover:bg-gray-100 dark:hover:bg-slate-800'
                  onClick={handleNextMonth}
                  aria-label='Next month'
                >
                  <ChevronRightIcon className='size-5' />
                </button>
              </div>
              <div className='mt-2 grid grid-cols-7 gap-1 text-center text-xs text-gray-500 dark:text-gray-300'>
                {weekdays.map((wd, idx) => (
                  <div key={idx}>{wd}</div>
                ))}
              </div>
              <div className='mt-1 grid grid-cols-7 gap-1'>
                {days.map((d, idx) => {
                  const disabled = isDisabled(d)
                  const isStart = !!start && areSameDay(d, start)
                  const isEnd = !!end && areSameDay(d, end)
                  const isBetween = inRange(d)
                  const isCurrentMonth = isInCurrentMonth(d)
                  return (
                    <button
                      key={idx}
                      type='button'
                      disabled={disabled}
                      onMouseEnter={() => setHoverDate(start && !end ? startOfDay(d) : null)}
                      onMouseLeave={() => setHoverDate(null)}
                      onClick={() => !disabled && onDayClick(d)}
                      className={cx('relative h-9 w-9 rounded-md text-sm select-none', {
                        'text-gray-900 dark:text-gray-100': isCurrentMonth && !disabled,
                        'text-gray-400 dark:text-gray-500': !isCurrentMonth || disabled,
                        'bg-indigo-600 text-white dark:bg-indigo-500': isStart || isEnd,
                        'bg-gray-100 dark:bg-slate-800': isBetween && !isStart && !isEnd,
                        'cursor-not-allowed opacity-50': disabled,
                        'hover:bg-gray-200 dark:hover:bg-slate-700': !disabled && !isStart && !isEnd,
                      })}
                    >
                      {d.getDate()}
                    </button>
                  )
                })}
              </div>
              <div className='mt-3 flex items-center justify-between'>
                <div className='text-xs text-gray-600 dark:text-gray-300'>
                  {label || new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short' }).format(anchorMonth)}
                </div>
                <div className='flex gap-2'>
                  <button
                    type='button'
                    className='rounded-md px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800'
                    onClick={() => {
                      setStart(null)
                      setEnd(null)
                      setHoverDate(null)
                    }}
                  >
                    Clear
                  </button>
                  <button
                    type='button'
                    className='rounded-md bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-500'
                    disabled={!start}
                    onClick={() => {
                      if (!start) return
                      commitRange(start, end || start)
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      ) : null}
    </div>
  )
})

export default memo(DatePicker)
