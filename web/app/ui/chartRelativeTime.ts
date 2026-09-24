import type { ChartOptions } from 'billboard.js'
import dayjs from 'dayjs'
import timezonePlugin from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import { getRelativeDateIfPossible } from '~/utils/date'

dayjs.extend(utc)
dayjs.extend(timezonePlugin)

export const attachRelativeTimeBadge = (
  container: HTMLElement,
  options: ChartOptions,
  timezone: string,
  language: string,
) => {
  const badge = document.createElement('span')
  badge.className =
    'pointer-events-none absolute z-10 max-w-full truncate rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium leading-4 text-gray-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100'
  badge.hidden = true

  let frame = 0
  const hide = () => {
    cancelAnimationFrame(frame)
    badge.hidden = true
  }

  const tooltip = options.tooltip
  options.tooltip = {
    ...tooltip,
    onshown(data) {
      tooltip?.onshown?.call(this, data)
      hide()

      const x: unknown = data.find((point) => point?.x != null)?.x
      if (!(x instanceof Date) || !Number.isFinite(x.getTime())) return

      const date = dayjs.tz(dayjs(x).format('YYYY-MM-DD HH:mm:ss'), timezone)
      badge.textContent =
        getRelativeDateIfPossible(date.toISOString(), language) || ''

      frame = requestAnimationFrame(() => {
        const focus = container.querySelector<SVGLineElement>(
          'line.bb-xgrid-focus',
        )
        const axis = container.querySelector<SVGGElement>('.bb-axis-x')
        if (!focus || !axis) return

        if (!badge.isConnected) container.appendChild(badge)
        badge.hidden = false

        const bounds = container.getBoundingClientRect()
        const focusBounds = focus.getBoundingClientRect()
        const axisBounds = axis.getBoundingClientRect()
        const left = focusBounds.left - bounds.left - badge.offsetWidth / 2

        badge.style.left = `${Math.max(0, Math.min(left, container.clientWidth - badge.offsetWidth))}px`
        badge.style.top = `${axisBounds.top - bounds.top + 6}px`
      })
    },
    onhide(data) {
      hide()
      tooltip?.onhide?.call(this, data)
    },
  }

  const onresize = options.onresize
  options.onresize = function () {
    hide()
    onresize?.call(this)
  }

  return () => {
    hide()
    badge.remove()
  }
}
