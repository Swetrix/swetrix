import dayjs from 'dayjs'
import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { getAnnotations, createAnnotation, updateAnnotation, deleteAnnotation } from '~/api'
import { Annotation } from '~/lib/models/Project'
import { useCurrentProject, useProjectPassword } from '~/providers/CurrentProjectProvider'

/**
 * Pixel distance threshold for snapping to nearby annotations when clicking on the chart.
 * If a click is within this many pixels of an annotation line, that annotation will be selected.
 */
const ANNOTATION_CLICK_THRESHOLD_PX = 30

/** Chart metrics derived from SVG/DOM layout */
interface ChartMetrics {
  /** X coordinate where the chart plotting area begins (left edge of x-axis) */
  chartAreaStart: number
  /** Width of the chart plotting area */
  chartAreaWidth: number
}

/**
 * Traverses up the DOM tree from a target element to find an annotation line element.
 */
const findAnnotationLineElement = (target: Element, boundary: Element): Element | null => {
  let element: Element | null = target

  while (element && element !== boundary) {
    if (element.classList?.contains('annotation-line')) {
      return element
    }
    element = element.parentElement
  }

  return null
}

/**
 * Extracts the annotation ID from an annotation line element's class list.
 */
const getAnnotationIdFromElement = (element: Element): string | null => {
  const classes = element.classList
  for (const className of classes) {
    if (className.startsWith('annotation-id-')) {
      return className.replace('annotation-id-', '')
    }
  }
  return null
}

/**
 * Calculates the chart area metrics by examining the SVG's x-axis domain path.
 */
const calculateChartMetrics = (svg: SVGSVGElement, chartContainer: HTMLElement): ChartMetrics => {
  const svgRect = svg.getBoundingClientRect()

  // Default fallbacks based on typical billboard.js chart layout
  let chartAreaStart = 50
  let chartAreaWidth = svgRect.width - 70

  // Try to get exact boundaries from the x-axis domain path (the axis line)
  const xAxisPath = chartContainer.querySelector('.bb-axis-x path.domain') as SVGPathElement | null
  if (xAxisPath) {
    const pathBBox = xAxisPath.getBBox()
    chartAreaStart = pathBBox.x
    chartAreaWidth = pathBBox.width
  }

  return { chartAreaStart, chartAreaWidth }
}

/**
 * Calculates the date corresponding to a click position on the chart.
 */
const calculateDateFromPosition = (
  clientX: number,
  svgRect: DOMRect,
  xAxisData: string[],
  chartMetrics: ChartMetrics,
): string => {
  const clickX = clientX - svgRect.left
  const { chartAreaStart, chartAreaWidth } = chartMetrics

  // Calculate relative position within the chart area (clamped to [0, 1])
  const relativeX = Math.max(0, clickX - chartAreaStart)
  const percentage = Math.min(1, relativeX / chartAreaWidth)

  // Map percentage to index in xAxisData
  const index = Math.round(percentage * (xAxisData.length - 1))
  const clampedIndex = Math.max(0, Math.min(xAxisData.length - 1, index))

  return dayjs(xAxisData[clampedIndex]).format('YYYY-MM-DD')
}

/**
 * Finds the closest annotation to a click position within the pixel threshold.
 */
const findClosestAnnotation = (
  clickX: number,
  annotations: Annotation[],
  xAxisData: string[],
  chartMetrics: ChartMetrics,
  pixelThreshold: number,
): Annotation | null => {
  const { chartAreaStart, chartAreaWidth } = chartMetrics

  let closestAnnotation: Annotation | null = null
  let closestDistance = Infinity

  for (const annotation of annotations) {
    const annotationDate = dayjs(annotation.date).format('YYYY-MM-DD')

    // Find the index of this annotation's date in xAxisData
    const annotationIndex = xAxisData.findIndex((xDate) => dayjs(xDate).format('YYYY-MM-DD') === annotationDate)

    if (annotationIndex !== -1) {
      // Calculate the x position of this annotation on the chart
      const annotationPercentage = annotationIndex / (xAxisData.length - 1)
      const annotationX = chartAreaStart + annotationPercentage * chartAreaWidth
      const distance = Math.abs(clickX - annotationX)

      if (distance < pixelThreshold && distance < closestDistance) {
        closestDistance = distance
        closestAnnotation = annotation
      }
    }
  }

  return closestAnnotation
}

interface UseAnnotationsReturn {
  // State
  annotations: Annotation[]
  annotationsLoading: boolean
  isAnnotationModalOpen: boolean
  annotationToEdit: Annotation | undefined
  annotationModalDate: string | undefined
  annotationActionLoading: boolean
  contextMenu: {
    isOpen: boolean
    x: number
    y: number
    date: string | null
    annotation: Annotation | null
  }

  // Actions
  loadAnnotations: () => Promise<void>
  onAnnotationCreate: (date: string, text: string) => Promise<void>
  onAnnotationUpdate: (date: string, text: string) => Promise<void>
  onAnnotationDelete: (annotation?: Annotation) => Promise<void>
  openAnnotationModal: (date?: string, annotation?: Annotation) => void
  closeAnnotationModal: () => void
  handleChartContextMenu: (event: React.MouseEvent, xAxisData: string[] | undefined) => void
  closeContextMenu: () => void
}

export const useAnnotations = (): UseAnnotationsReturn => {
  const { id, project } = useCurrentProject()
  const projectPassword = useProjectPassword(id)
  const { t } = useTranslation('common')

  // Annotations state
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [annotationsLoading, setAnnotationsLoading] = useState(false)
  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState(false)
  const [annotationToEdit, setAnnotationToEdit] = useState<Annotation | undefined>()
  const [annotationModalDate, setAnnotationModalDate] = useState<string | undefined>()
  const [annotationActionLoading, setAnnotationActionLoading] = useState(false)

  // Chart context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    x: number
    y: number
    date: string | null
    annotation: Annotation | null
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    date: null,
    annotation: null,
  })

  const loadAnnotations = useCallback(async () => {
    if (annotationsLoading) {
      return
    }

    setAnnotationsLoading(true)

    try {
      const data = await getAnnotations(id, projectPassword)
      setAnnotations(data || [])
    } catch (reason: any) {
      console.error('[ERROR] (loadAnnotations)', reason)
    }

    setAnnotationsLoading(false)
  }, [id, projectPassword, annotationsLoading])

  const onAnnotationCreate = useCallback(
    async (date: string, text: string) => {
      if (annotationActionLoading) {
        return
      }

      setAnnotationActionLoading(true)

      try {
        await createAnnotation(id, date, text)
        await loadAnnotations()
        toast.success(t('apiNotifications.annotationCreated'))
      } catch (reason: any) {
        console.error('[ERROR] (onAnnotationCreate)', reason)
        toast.error(reason)
      }

      setAnnotationActionLoading(false)
    },
    [id, annotationActionLoading, loadAnnotations, t],
  )

  const onAnnotationUpdate = useCallback(
    async (date: string, text: string) => {
      if (annotationActionLoading || !annotationToEdit) {
        return
      }

      setAnnotationActionLoading(true)

      try {
        await updateAnnotation(annotationToEdit.id, id, date, text)
        await loadAnnotations()
        toast.success(t('apiNotifications.annotationUpdated'))
      } catch (reason: any) {
        console.error('[ERROR] (onAnnotationUpdate)', reason)
        toast.error(reason)
      }

      setAnnotationActionLoading(false)
    },
    [id, annotationActionLoading, annotationToEdit, loadAnnotations, t],
  )

  const onAnnotationDelete = useCallback(
    async (annotation?: Annotation) => {
      const targetAnnotation = annotation || annotationToEdit

      if (annotationActionLoading || !targetAnnotation) {
        return
      }

      setAnnotationActionLoading(true)

      try {
        await deleteAnnotation(targetAnnotation.id, id)
        await loadAnnotations()
        toast.success(t('apiNotifications.annotationDeleted'))
      } catch (reason: any) {
        console.error('[ERROR] (onAnnotationDelete)', reason)
        toast.error(reason)
      }

      setAnnotationActionLoading(false)
      setAnnotationToEdit(undefined)
    },
    [id, annotationActionLoading, annotationToEdit, loadAnnotations, t],
  )

  const openAnnotationModal = useCallback((date?: string, annotation?: Annotation) => {
    setAnnotationModalDate(date)
    setAnnotationToEdit(annotation)
    setIsAnnotationModalOpen(true)
  }, [])

  const closeAnnotationModal = useCallback(() => {
    setIsAnnotationModalOpen(false)
    setAnnotationToEdit(undefined)
    setAnnotationModalDate(undefined)
  }, [])

  const handleChartContextMenu = useCallback(
    (event: React.MouseEvent, xAxisData: string[] | undefined) => {
      event.preventDefault()

      let existingAnnotation: Annotation | null = null
      let date: string | null = null

      // Check if user clicked directly on an annotation line
      const annotationLineElement = findAnnotationLineElement(event.target as Element, event.currentTarget as Element)

      if (annotationLineElement) {
        // User clicked on an annotation line - find it by ID from the element's class
        const annotationId = getAnnotationIdFromElement(annotationLineElement)
        if (annotationId) {
          existingAnnotation = annotations.find((a) => a.id === annotationId) || null
          if (existingAnnotation) {
            date = dayjs(existingAnnotation.date).format('YYYY-MM-DD')
          }
        }
      }

      // If not clicking on an annotation line, calculate date from click position
      if (!existingAnnotation && xAxisData && xAxisData.length > 0) {
        const chartContainer = (event.currentTarget as HTMLElement).querySelector('.bb') as HTMLElement
        const svg = chartContainer?.querySelector('svg') as SVGSVGElement | null

        if (svg) {
          const svgRect = svg.getBoundingClientRect()
          const chartMetrics = calculateChartMetrics(svg, chartContainer)
          const clickX = event.clientX - svgRect.left

          date = calculateDateFromPosition(event.clientX, svgRect, xAxisData, chartMetrics)

          // Check for exact date match first
          existingAnnotation = annotations.find((a) => dayjs(a.date).format('YYYY-MM-DD') === date) || null

          // If no exact match, try to find the closest annotation within threshold
          if (!existingAnnotation && annotations.length > 0) {
            const closestAnnotation = findClosestAnnotation(
              clickX,
              annotations,
              xAxisData,
              chartMetrics,
              ANNOTATION_CLICK_THRESHOLD_PX,
            )

            if (closestAnnotation) {
              existingAnnotation = closestAnnotation
              date = dayjs(closestAnnotation.date).format('YYYY-MM-DD')
            }
          }
        }
      }

      setContextMenu({
        isOpen: true,
        x: event.clientX,
        y: event.clientY,
        date,
        annotation: existingAnnotation,
      })
    },
    [annotations],
  )

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }))
  }, [])

  // Load annotations when project loads
  useEffect(() => {
    if (!project) {
      return
    }

    loadAnnotations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project])

  return {
    // State
    annotations,
    annotationsLoading,
    isAnnotationModalOpen,
    annotationToEdit,
    annotationModalDate,
    annotationActionLoading,
    contextMenu,

    // Actions
    loadAnnotations,
    onAnnotationCreate,
    onAnnotationUpdate,
    onAnnotationDelete,
    openAnnotationModal,
    closeAnnotationModal,
    handleChartContextMenu,
    closeContextMenu,
  }
}
