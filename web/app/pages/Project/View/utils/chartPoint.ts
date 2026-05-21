import dayjs from 'dayjs'
import timezonePlugin from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezonePlugin)

export type ChartDataPointClick = (d: { x: Date; index: number }) => void

type EventRectsGroup = SVGElement & {
  __clickHandlers?: {
    mousemove: (e: MouseEvent) => void
    mouseleave: () => void
    click: (e: MouseEvent) => void
  }
}

const getClosestCircle = (
  circles: NodeListOf<SVGElement>,
  mouseX: number,
  mouseY: number,
  maxDistance = Infinity,
): SVGElement | null => {
  let closestCircle: SVGElement | null = null
  let minDistance = maxDistance

  circles.forEach((c) => {
    const cx = parseFloat(c.getAttribute('cx') || '0')
    const cy = parseFloat(c.getAttribute('cy') || '0')
    const distance = Math.hypot(cx - mouseX, cy - mouseY)

    if (distance < minDistance) {
      minDistance = distance
      closestCircle = c
    }
  })

  return closestCircle
}

export const attachDataPointClickHandlers = (
  chartInstance: any,
  columns: any[],
  onDataPointClick?: ChartDataPointClick,
) => {
  if (!chartInstance?.$) return

  const svg = chartInstance.$.svg?.node() as SVGSVGElement | null | undefined
  if (!svg) return

  const eventRectsGroup = svg.querySelector(
    '.bb-event-rects',
  ) as EventRectsGroup | null
  if (!eventRectsGroup) return

  if (eventRectsGroup.__clickHandlers) {
    eventRectsGroup.removeEventListener(
      'mousemove',
      eventRectsGroup.__clickHandlers.mousemove,
    )
    eventRectsGroup.removeEventListener(
      'mouseleave',
      eventRectsGroup.__clickHandlers.mouseleave,
    )
    eventRectsGroup.removeEventListener(
      'click',
      eventRectsGroup.__clickHandlers.click,
    )
    delete eventRectsGroup.__clickHandlers
  }

  if (!onDataPointClick) return

  const handleMouseMove = (e: MouseEvent) => {
    const groupRect = eventRectsGroup.getBoundingClientRect()
    const mouseX = e.clientX - groupRect.left
    const mouseY = e.clientY - groupRect.top

    const circles = svg.querySelectorAll<SVGElement>('.bb-circle')
    const closestCircle = getClosestCircle(circles, mouseX, mouseY, 25)

    circles.forEach((c) => {
      if (c === closestCircle) {
        c.classList.add('is-direct-hover')
      } else {
        c.classList.remove('is-direct-hover')
      }
    })
  }

  const handleMouseLeave = () => {
    const circles = svg.querySelectorAll<SVGElement>('.bb-circle')
    circles.forEach((c) => {
      c.classList.remove('is-direct-hover')
    })
  }

  const handleClick = (e: MouseEvent) => {
    const target = e.target as SVGRectElement
    if (!target?.classList?.contains('bb-event-rect')) return

    const groupRect = eventRectsGroup.getBoundingClientRect()
    const mouseX = e.clientX - groupRect.left
    const mouseY = e.clientY - groupRect.top

    const circles = svg.querySelectorAll<SVGElement>('.bb-circle')
    const closestCircle = getClosestCircle(circles, mouseX, mouseY)

    if (!closestCircle) return

    const classAttr = closestCircle.getAttribute('class') || ''
    const indexMatch = classAttr.match(/bb-circle-(\d+)/)
    if (!indexMatch) return

    const index = parseInt(indexMatch[1], 10)
    const xValues = columns[0]?.slice(1) as Date[] | undefined
    if (!xValues || index >= xValues.length) return

    onDataPointClick({ x: xValues[index], index })
  }

  eventRectsGroup.addEventListener('mousemove', handleMouseMove)
  eventRectsGroup.addEventListener('mouseleave', handleMouseLeave)
  eventRectsGroup.addEventListener('click', handleClick)
  eventRectsGroup.__clickHandlers = {
    mousemove: handleMouseMove,
    mouseleave: handleMouseLeave,
    click: handleClick,
  }
}

export const getChartPointWindow = ({
  x,
  timeBucket,
  timezone,
  timeFormat,
}: {
  x: Date
  timeBucket: string
  timezone: string
  timeFormat: string
}) => {
  const date = dayjs(x).tz(timezone)

  switch (timeBucket) {
    case 'minute':
      return {
        from: date.startOf('minute').toISOString(),
        to: date.endOf('minute').toISOString(),
        label: date.format('MMM D, YYYY HH:mm'),
      }
    case 'hour':
      return {
        from: date.startOf('hour').toISOString(),
        to: date.endOf('hour').toISOString(),
        label: date.format(
          timeFormat === '24-hour'
            ? 'MMM D, YYYY HH:00 - HH:59'
            : 'MMM D, YYYY h:00 - h:59 A',
        ),
      }
    case 'month':
      return {
        from: date.startOf('month').toISOString(),
        to: date.endOf('month').toISOString(),
        label: date.format('MMMM YYYY'),
      }
    case 'year':
      return {
        from: date.startOf('year').toISOString(),
        to: date.endOf('year').toISOString(),
        label: date.format('YYYY'),
      }
    case 'day':
    default:
      return {
        from: date.startOf('day').toISOString(),
        to: date.endOf('day').toISOString(),
        label: date.format('dddd, MMM D, YYYY'),
      }
  }
}
