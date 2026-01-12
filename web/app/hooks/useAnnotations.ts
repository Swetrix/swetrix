import dayjs from 'dayjs'
import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import { Annotation } from '~/lib/models/Project'
import {
  useCurrentProject,
  useProjectPassword,
} from '~/providers/CurrentProjectProvider'
import { ProjectViewActionData } from '~/routes/projects.$id'

const ANNOTATION_CLICK_THRESHOLD_PX = 30

interface ChartMetrics {
  chartAreaStart: number
  chartAreaWidth: number
}

const findAnnotationLineElement = (
  target: Element,
  boundary: Element,
): Element | null => {
  let element: Element | null = target

  while (element && element !== boundary) {
    if (element.classList?.contains('annotation-line')) {
      return element
    }
    element = element.parentElement
  }

  return null
}

const getAnnotationIdFromElement = (element: Element): string | null => {
  const classes = element.classList
  for (const className of classes) {
    if (className.startsWith('annotation-id-')) {
      return className.replace('annotation-id-', '')
    }
  }
  return null
}

const calculateChartMetrics = (
  svg: SVGSVGElement,
  chartContainer: HTMLElement,
): ChartMetrics => {
  const svgRect = svg.getBoundingClientRect()

  let chartAreaStart = 50
  let chartAreaWidth = svgRect.width - 70

  const xAxisPath = chartContainer.querySelector(
    '.bb-axis-x path.domain',
  ) as SVGPathElement | null
  if (xAxisPath) {
    const pathBBox = xAxisPath.getBBox()
    chartAreaStart = pathBBox.x
    chartAreaWidth = pathBBox.width
  }

  return { chartAreaStart, chartAreaWidth }
}

const calculateDateFromPosition = (
  clientX: number,
  svgRect: DOMRect,
  xAxisData: string[],
  chartMetrics: ChartMetrics,
): string => {
  const clickX = clientX - svgRect.left
  const { chartAreaStart, chartAreaWidth } = chartMetrics

  const relativeX = Math.max(0, clickX - chartAreaStart)
  const percentage = Math.min(1, relativeX / chartAreaWidth)

  const index = Math.round(percentage * (xAxisData.length - 1))
  const clampedIndex = Math.max(0, Math.min(xAxisData.length - 1, index))

  return dayjs(xAxisData[clampedIndex]).format('YYYY-MM-DD')
}

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

    const annotationIndex = xAxisData.findIndex(
      (xDate) => dayjs(xDate).format('YYYY-MM-DD') === annotationDate,
    )

    if (annotationIndex !== -1) {
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

  loadAnnotations: () => void
  onAnnotationCreate: (date: string, text: string) => void
  onAnnotationUpdate: (date: string, text: string) => void
  onAnnotationDelete: (annotation?: Annotation) => void
  openAnnotationModal: (date?: string, annotation?: Annotation) => void
  closeAnnotationModal: () => void
  handleChartContextMenu: (
    event: React.MouseEvent,
    xAxisData: string[] | undefined,
  ) => void
  closeContextMenu: () => void
}

export const useAnnotations = (): UseAnnotationsReturn => {
  const { id, project } = useCurrentProject()
  const projectPassword = useProjectPassword(id)
  const { t } = useTranslation('common')

  const fetcher = useFetcher<ProjectViewActionData>()
  const loadFetcher = useFetcher<ProjectViewActionData>()

  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [annotationsLoading, setAnnotationsLoading] = useState(false)
  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState(false)
  const [annotationToEdit, setAnnotationToEdit] = useState<
    Annotation | undefined
  >()
  const [annotationModalDate, setAnnotationModalDate] = useState<
    string | undefined
  >()
  const [pendingAction, setPendingAction] = useState<
    'create' | 'update' | 'delete' | null
  >(null)

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

  const loadAnnotations = useCallback(() => {
    if (loadFetcher.state !== 'idle') {
      return
    }

    setAnnotationsLoading(true)
    const formData = new FormData()
    formData.append('intent', 'get-annotations')
    if (projectPassword) {
      formData.append('password', projectPassword)
    }

    loadFetcher.submit(formData, { method: 'POST' })
  }, [loadFetcher, projectPassword])

  useEffect(() => {
    if (loadFetcher.state === 'idle') {
      setAnnotationsLoading(false)
      if (loadFetcher.data) {
        if (loadFetcher.data.success && loadFetcher.data.data) {
          setAnnotations((loadFetcher.data.data as Annotation[]) || [])
        } else if (loadFetcher.data.error) {
          toast.error(loadFetcher.data.error)
        } else {
          setAnnotations([])
        }
      }
    }
  }, [loadFetcher.state, loadFetcher.data])

  const closeAnnotationModal = useCallback(() => {
    setIsAnnotationModalOpen(false)
    setAnnotationToEdit(undefined)
    setAnnotationModalDate(undefined)
  }, [])

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && pendingAction) {
      if (fetcher.data.success) {
        if (pendingAction === 'create') {
          toast.success(t('apiNotifications.annotationCreated'))
        } else if (pendingAction === 'update') {
          toast.success(t('apiNotifications.annotationUpdated'))
        } else if (pendingAction === 'delete') {
          toast.success(t('apiNotifications.annotationDeleted'))
        }
        loadAnnotations()
        closeAnnotationModal()
      } else if (fetcher.data.error) {
        toast.error(fetcher.data.error)
      }
      setPendingAction(null)
      setAnnotationToEdit(undefined)
    }
  }, [
    fetcher.state,
    fetcher.data,
    pendingAction,
    loadAnnotations,
    t,
    closeAnnotationModal,
  ])

  const onAnnotationCreate = useCallback(
    (date: string, text: string) => {
      if (fetcher.state !== 'idle') {
        return
      }

      setPendingAction('create')
      const formData = new FormData()
      formData.append('intent', 'create-annotation')
      formData.append('date', date)
      formData.append('text', text)

      fetcher.submit(formData, { method: 'POST' })
    },
    [fetcher],
  )

  const onAnnotationUpdate = useCallback(
    (date: string, text: string) => {
      if (fetcher.state !== 'idle' || !annotationToEdit) {
        return
      }

      setPendingAction('update')
      const formData = new FormData()
      formData.append('intent', 'update-annotation')
      formData.append('annotationId', annotationToEdit.id)
      formData.append('date', date)
      formData.append('text', text)

      fetcher.submit(formData, { method: 'POST' })
    },
    [fetcher, annotationToEdit],
  )

  const onAnnotationDelete = useCallback(
    (annotation?: Annotation) => {
      const targetAnnotation = annotation || annotationToEdit

      if (fetcher.state !== 'idle' || !targetAnnotation) {
        return
      }

      setPendingAction('delete')
      const formData = new FormData()
      formData.append('intent', 'delete-annotation')
      formData.append('annotationId', targetAnnotation.id)

      fetcher.submit(formData, { method: 'POST' })
    },
    [fetcher, annotationToEdit],
  )

  const openAnnotationModal = useCallback(
    (date?: string, annotation?: Annotation) => {
      setAnnotationModalDate(date)
      setAnnotationToEdit(annotation)
      setIsAnnotationModalOpen(true)
    },
    [],
  )

  const handleChartContextMenu = useCallback(
    (event: React.MouseEvent, xAxisData: string[] | undefined) => {
      event.preventDefault()

      let existingAnnotation: Annotation | null = null
      let date: string | null = null

      const annotationLineElement = findAnnotationLineElement(
        event.target as Element,
        event.currentTarget as Element,
      )

      if (annotationLineElement) {
        const annotationId = getAnnotationIdFromElement(annotationLineElement)
        if (annotationId) {
          existingAnnotation =
            annotations.find((a) => a.id === annotationId) || null
          if (existingAnnotation) {
            date = dayjs(existingAnnotation.date).format('YYYY-MM-DD')
          }
        }
      }

      if (!existingAnnotation && xAxisData && xAxisData.length > 0) {
        const chartContainer = (
          event.currentTarget as HTMLElement
        ).querySelector('.bb') as HTMLElement
        const svg = chartContainer?.querySelector('svg') as SVGSVGElement | null

        if (svg) {
          const svgRect = svg.getBoundingClientRect()
          const chartMetrics = calculateChartMetrics(svg, chartContainer)
          const clickX = event.clientX - svgRect.left

          date = calculateDateFromPosition(
            event.clientX,
            svgRect,
            xAxisData,
            chartMetrics,
          )

          existingAnnotation =
            annotations.find(
              (a) => dayjs(a.date).format('YYYY-MM-DD') === date,
            ) || null

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

  const annotationActionLoading = fetcher.state !== 'idle'

  return {
    annotations,
    annotationsLoading,
    isAnnotationModalOpen,
    annotationToEdit,
    annotationModalDate,
    annotationActionLoading,
    contextMenu,

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
