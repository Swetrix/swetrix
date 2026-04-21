import _filter from 'lodash/filter'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import {
  ArrowUpIcon,
  CaretDownIcon,
  CaretRightIcon,
  SpinnerGapIcon,
  StopCircleIcon,
  WarningCircleIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  TargetIcon,
  GitBranchIcon,
  InfoIcon,
  CheckIcon,
  ChatIcon,
  TrashIcon,
  XIcon,
  LinkIcon,
  CopyIcon,
  ArrowCounterClockwiseIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  PencilSimpleIcon,
  ShieldIcon,
  FlagIcon,
  FlaskIcon,
  UsersIcon,
  ListBulletsIcon,
} from '@phosphor-icons/react'
import { marked } from 'marked'
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams, useFetcher } from 'react-router'
import sanitizeHtml from 'sanitize-html'
import { toast } from 'sonner'
import { useStickToBottom } from 'use-stick-to-bottom'

import { askAI } from '~/api'
import { ProjectViewActionData } from '~/routes/projects.$id'
import SwetrixLogo from '~/ui/icons/SwetrixLogo'
import Modal from '~/ui/Modal'
import { Text } from '~/ui/Text'
import Textarea from '~/ui/Textarea'
import Tooltip from '~/ui/Tooltip'
import { cn } from '~/utils/generic'

import AIChart from './AIChart'

interface MessagePart {
  type: 'text' | 'toolCall'
  text?: string
  toolName?: string
  args?: unknown
}

interface AIChatSummary {
  id: string
  name: string | null
  created: string
  updated: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  toolCalls?: Array<{ toolName: string; args: unknown; completed?: boolean }>
  parts?: MessagePart[]
}

interface AskAIViewProps {
  projectId: string
}

marked.setOptions({
  breaks: true,
  gfm: true,
})

type ContentSegment =
  | { kind: 'text'; text: string }
  | { kind: 'chart'; chart: any; pending?: boolean }

const CHART_START_PATTERN = '{"type":"chart"'

const parseSegments = (content: string): ContentSegment[] => {
  const segments: ContentSegment[] = []
  let cursor = 0

  while (cursor < content.length) {
    const startIndex = content.indexOf(CHART_START_PATTERN, cursor)
    if (startIndex === -1) {
      const tail = content.slice(cursor)
      if (tail) segments.push({ kind: 'text', text: tail })
      break
    }

    if (startIndex > cursor) {
      segments.push({ kind: 'text', text: content.slice(cursor, startIndex) })
    }

    let braceCount = 0
    let endIndex = -1
    let inString = false
    let escape = false

    for (let i = startIndex; i < content.length; i++) {
      const ch = content[i]
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') {
        inString = !inString
        continue
      }
      if (inString) continue
      if (ch === '{') braceCount++
      else if (ch === '}') {
        braceCount--
        if (braceCount === 0) {
          endIndex = i
          break
        }
      }
    }

    if (endIndex === -1) {
      // Chart JSON still streaming – keep raw text out of view to avoid showing JSON
      segments.push({ kind: 'chart', chart: null, pending: true })
      cursor = content.length
      break
    }

    const jsonString = content.substring(startIndex, endIndex + 1)
    try {
      const chartData = JSON.parse(jsonString)
      if (chartData?.type === 'chart') {
        segments.push({ kind: 'chart', chart: chartData })
      } else {
        segments.push({ kind: 'text', text: jsonString })
      }
    } catch {
      segments.push({ kind: 'chart', chart: null, pending: true })
    }
    cursor = endIndex + 1
  }

  // Trim leading/trailing whitespace-only text segments
  while (
    segments.length &&
    segments[0].kind === 'text' &&
    !segments[0].text.trim()
  ) {
    segments.shift()
  }
  while (
    segments.length &&
    segments[segments.length - 1].kind === 'text' &&
    !(segments[segments.length - 1] as { text: string }).text.trim()
  ) {
    segments.pop()
  }

  return segments
}

const renderMarkdown = (content: string): string => {
  const html = marked.parse(content) as string
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      code: ['class'],
      pre: ['class'],
      span: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['http', 'https'],
    },
    allowProtocolRelative: false,
  })
}

const getToolInfo = (
  toolName: string,
  t: any,
): { label: string; icon: React.ComponentType<{ className?: string }> } => {
  const toolMap: Record<
    string,
    { label: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    getProjectInfo: {
      label: t('project.askAi.tools.getProjectInfo'),
      icon: InfoIcon,
    },
    getData: { label: t('project.askAi.tools.getData'), icon: ChartBarIcon },
    getGoalStats: {
      label: t('project.askAi.tools.getGoalStats'),
      icon: TargetIcon,
    },
    getFunnelData: {
      label: t('project.askAi.tools.getFunnelData'),
      icon: GitBranchIcon,
    },
    getFeatureFlagStats: {
      label: t('project.askAi.tools.getFeatureFlagStats'),
      icon: FlagIcon,
    },
    getExperimentResults: {
      label: t('project.askAi.tools.getExperimentResults'),
      icon: FlaskIcon,
    },
    getSessionsList: {
      label: t('project.askAi.tools.getSessionsList'),
      icon: ListBulletsIcon,
    },
    getProfilesOverview: {
      label: t('project.askAi.tools.getProfilesOverview'),
      icon: UsersIcon,
    },
  }
  return toolMap[toolName] || { label: toolName, icon: InfoIcon }
}

const AICapabilitiesTooltip = () => {
  const { t } = useTranslation('common')

  return (
    <div className='max-w-sm space-y-3 py-1 text-left'>
      <div>
        <p className='mb-1.5 font-semibold text-white'>
          {t('project.askAi.capabilities.title')}
        </p>
        <ul className='space-y-1 text-gray-300'>
          <li className='flex items-start gap-1.5'>
            <ChartBarIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400' />
            <span>
              <strong className='text-white'>
                {t('project.askAi.capabilities.queryAnalytics')}
              </strong>
            </span>
          </li>
          <li className='flex items-start gap-1.5'>
            <TargetIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400' />
            <span>
              <strong className='text-white'>
                {t('project.askAi.capabilities.goalStatistics')}
              </strong>
            </span>
          </li>
          <li className='flex items-start gap-1.5'>
            <GitBranchIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400' />
            <span>
              <strong className='text-white'>
                {t('project.askAi.capabilities.funnelAnalysis')}
              </strong>
            </span>
          </li>
          <li className='flex items-start gap-1.5'>
            <ChartBarIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400' />
            <span>
              <strong className='text-white'>
                {t('project.askAi.capabilities.performanceMetrics')}
              </strong>
            </span>
          </li>
          <li className='flex items-start gap-1.5'>
            <WarningCircleIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400' />
            <span>
              <strong className='text-white'>
                {t('project.askAi.capabilities.errorTracking')}
              </strong>
            </span>
          </li>
          <li className='flex items-start gap-1.5'>
            <ShieldIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400' />
            <span>
              <strong className='text-white'>
                {t('project.askAi.capabilities.captchaStats')}
              </strong>
            </span>
          </li>
          <li className='flex items-start gap-1.5'>
            <FlagIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400' />
            <span>
              <strong className='text-white'>
                {t('project.askAi.capabilities.featureFlags')}
              </strong>
            </span>
          </li>
          <li className='flex items-start gap-1.5'>
            <FlaskIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400' />
            <span>
              <strong className='text-white'>
                {t('project.askAi.capabilities.experiments')}
              </strong>
            </span>
          </li>
          <li className='flex items-start gap-1.5'>
            <ListBulletsIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400' />
            <span>
              <strong className='text-white'>
                {t('project.askAi.capabilities.sessions')}
              </strong>
            </span>
          </li>
          <li className='flex items-start gap-1.5'>
            <UsersIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400' />
            <span>
              <strong className='text-white'>
                {t('project.askAi.capabilities.customEvents')}
              </strong>
            </span>
          </li>
          <li className='flex items-start gap-1.5'>
            <InfoIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400' />
            <span>{t('project.askAi.capabilities.trafficPatterns')}</span>
          </li>
          <li className='flex items-start gap-1.5'>
            <InfoIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400' />
            <span>{t('project.askAi.capabilities.customRanges')}</span>
          </li>
        </ul>
      </div>
      <div>
        <p className='mb-1.5 font-semibold text-white'>
          {t('project.askAi.capabilities.cannotTitle')}
        </p>
        <ul className='space-y-1 text-gray-300'>
          <li className='flex items-start gap-1.5'>
            <XIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400' />
            <span>{t('project.askAi.capabilities.cannotBrowse')}</span>
          </li>
          <li className='flex items-start gap-1.5'>
            <XIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400' />
            <span>{t('project.askAi.capabilities.cannotSeeOutside')}</span>
          </li>
          <li className='flex items-start gap-1.5'>
            <XIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400' />
            <span>{t('project.askAi.capabilities.cannotGuarantee')}</span>
          </li>
          <li className='flex items-start gap-1.5'>
            <XIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400' />
            <span>{t('project.askAi.capabilities.cannotModify')}</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

const ThinkingIndicator = () => {
  const { t } = useTranslation('common')
  return (
    <div className='flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
      <SpinnerGapIcon className='h-4 w-4 animate-spin' />
      <span>{t('project.askAi.thinking')}</span>
    </div>
  )
}

const ThoughtProcess = ({
  reasoning,
  isStreaming,
  hasContent,
  isExpanded,
  onToggle,
}: {
  reasoning?: string
  isStreaming?: boolean
  hasContent?: boolean
  isExpanded: boolean
  onToggle: () => void
}) => {
  const { t } = useTranslation('common')
  const isActivelyThinking = isStreaming && reasoning && !hasContent

  if (!reasoning) return null

  return (
    <div className='mb-3'>
      <button
        type='button'
        onClick={onToggle}
        className='group flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
      >
        <span className='flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 dark:border-slate-800'>
          {isActivelyThinking ? (
            <SpinnerGapIcon className='h-3 w-3 animate-spin' />
          ) : (
            <svg
              className='h-3 w-3'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.5'
            >
              <circle cx='12' cy='12' r='10' />
              <path d='M12 16v-4M12 8h.01' />
            </svg>
          )}
        </span>
        <span className='font-medium'>
          {isActivelyThinking
            ? t('project.askAi.thinking')
            : t('project.askAi.thought')}
        </span>
        {!isActivelyThinking ? (
          isExpanded ? (
            <CaretDownIcon className='h-3.5 w-3.5' />
          ) : (
            <CaretRightIcon className='h-3.5 w-3.5' />
          )
        ) : null}
      </button>
      {isExpanded || isActivelyThinking ? (
        <div className='mt-2 ml-6 border-l-2 border-gray-200 pl-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400'>
          <div className='leading-relaxed whitespace-pre-wrap'>{reasoning}</div>
        </div>
      ) : null}
    </div>
  )
}

const ToolCallBadge = ({
  toolName,
  isLoading = false,
}: {
  toolName: string
  isLoading?: boolean
}) => {
  const { t } = useTranslation('common')

  const { label, icon: Icon } = getToolInfo(toolName, t)

  return (
    <span className='inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-slate-900 dark:text-gray-300'>
      <Icon className='h-3.5 w-3.5' />
      <span>{label}</span>
      {isLoading ? (
        <SpinnerGapIcon className='h-3 w-3 animate-spin text-gray-500' />
      ) : (
        <CheckIcon className='h-3 w-3 text-green-600 dark:text-green-400' />
      )}
    </span>
  )
}

const MessageContent = ({
  content,
  isStreaming,
}: {
  content: string
  isStreaming?: boolean
}) => {
  const segments = useMemo(() => parseSegments(content), [content])
  const hasAnyContent = segments.length > 0

  return (
    <div className='space-y-3'>
      {_map(segments, (segment, idx) => {
        if (segment.kind === 'text') {
          if (!segment.text.trim()) return null
          return (
            <div
              key={idx}
              className='prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:my-2 prose-ol:my-2 prose-ul:my-2 prose-li:my-0.5 prose-table:text-sm'
              dangerouslySetInnerHTML={{ __html: renderMarkdown(segment.text) }}
            />
          )
        }
        if (segment.kind === 'chart' && segment.chart) {
          return <AIChart key={idx} chart={segment.chart} />
        }
        if (segment.kind === 'chart' && segment.pending) {
          return (
            <div
              key={idx}
              className='flex h-[200px] w-full items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-gray-500'
            >
              <SpinnerGapIcon className='mr-2 h-4 w-4 animate-spin' />
              Rendering chart...
            </div>
          )
        }
        return null
      })}
      {isStreaming && !hasAnyContent ? (
        <span className='ml-1 inline-block h-4 w-0.5 animate-pulse bg-gray-400' />
      ) : null}
    </div>
  )
}

const AssistantMessage = ({
  message,
  isStreaming,
  onRegenerate,
  onFeedback,
  feedback,
  canRegenerate,
}: {
  message: Message
  isStreaming?: boolean
  onRegenerate?: () => void
  onFeedback?: (rating: 'good' | 'bad') => void
  feedback?: 'good' | 'bad' | null
  canRegenerate?: boolean
}) => {
  const { t } = useTranslation('common')
  const [userToggled, setUserToggled] = useState(false)
  const [userExpandedState, setUserExpandedState] = useState(false)
  const [copied, setCopied] = useState(false)
  const hasContent = Boolean(message.content && message.content.trim())

  const isActivelyThinking = Boolean(
    isStreaming && message.reasoning && !hasContent,
  )
  const isThoughtExpanded = userToggled ? userExpandedState : isActivelyThinking

  const handleToggle = () => {
    setUserToggled(true)
    setUserExpandedState(!isThoughtExpanded)
  }

  const handleCopy = () => {
    if (!message.content) return
    navigator.clipboard
      .writeText(message.content)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => toast.error(t('project.askAi.error')))
  }

  const hasParts = message.parts && message.parts.length > 0

  const isToolCallLoading = (partIndex: number) => {
    if (!isStreaming || !message.parts) return false
    const isLastPart = partIndex === message.parts.length - 1
    const part = message.parts[partIndex]
    if (part.type !== 'toolCall') return false
    const hasTextAfter = message.parts
      .slice(partIndex + 1)
      .some((p) => p.type === 'text' && p.text?.trim())
    return isLastPart || !hasTextAfter
  }

  return (
    <div className='group'>
      <ThoughtProcess
        reasoning={message.reasoning}
        isStreaming={isStreaming}
        hasContent={hasContent}
        isExpanded={isThoughtExpanded}
        onToggle={handleToggle}
      />
      {hasParts ? (
        <>
          {_map(message.parts, (part, idx) => {
            if (part.type === 'text' && part.text) {
              const isLastTextPart =
                idx === message.parts!.length - 1 ||
                !message
                  .parts!.slice(idx + 1)
                  .some((p) => p.type === 'text' && p.text?.trim())
              return (
                <div key={idx} className='mb-3'>
                  <MessageContent
                    content={part.text}
                    isStreaming={isStreaming ? isLastTextPart : undefined}
                  />
                </div>
              )
            }
            if (part.type === 'toolCall' && part.toolName) {
              return (
                <div key={idx} className='mb-3'>
                  <ToolCallBadge
                    toolName={part.toolName}
                    isLoading={isToolCallLoading(idx)}
                  />
                </div>
              )
            }
            return null
          })}
        </>
      ) : (
        <>
          {message.toolCalls && message.toolCalls.length > 0 ? (
            <div className='mb-3 flex flex-wrap gap-2'>
              {_map(message.toolCalls, (call, idx) => (
                <ToolCallBadge
                  key={idx}
                  toolName={call.toolName}
                  isLoading={Boolean(isStreaming && !hasContent)}
                />
              ))}
            </div>
          ) : null}
          <MessageContent content={message.content} isStreaming={isStreaming} />
        </>
      )}

      {!isStreaming && hasContent ? (
        <div className='mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100'>
          <button
            type='button'
            onClick={handleCopy}
            className='flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-200'
            title={t('project.askAi.copyMessage')}
            aria-label={t('project.askAi.copyMessage')}
          >
            {copied ? (
              <CheckIcon className='h-4 w-4' />
            ) : (
              <CopyIcon className='h-4 w-4' />
            )}
          </button>
          {onRegenerate && canRegenerate ? (
            <button
              type='button'
              onClick={onRegenerate}
              className='flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-200'
              title={t('project.askAi.regenerate')}
              aria-label={t('project.askAi.regenerate')}
            >
              <ArrowCounterClockwiseIcon className='h-4 w-4' />
            </button>
          ) : null}
          {onFeedback ? (
            <>
              <button
                type='button'
                onClick={() => onFeedback('good')}
                disabled={feedback === 'bad'}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                  feedback === 'good'
                    ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-200',
                  feedback === 'bad' && 'cursor-not-allowed opacity-40',
                )}
                title={t('project.askAi.goodResponse')}
                aria-label={t('project.askAi.goodResponse')}
              >
                <ThumbsUpIcon className='h-4 w-4' />
              </button>
              <button
                type='button'
                onClick={() => onFeedback('bad')}
                disabled={feedback === 'good'}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                  feedback === 'bad'
                    ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-200',
                  feedback === 'good' && 'cursor-not-allowed opacity-40',
                )}
                title={t('project.askAi.badResponse')}
                aria-label={t('project.askAi.badResponse')}
              >
                <ThumbsDownIcon className='h-4 w-4' />
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const UserMessage = ({
  content,
  onEdit,
  isLoading,
}: {
  content: string
  onEdit?: (newContent: string) => void
  isLoading?: boolean
}) => {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(content)
  const editRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus()
      editRef.current.style.height = 'auto'
      editRef.current.style.height = `${editRef.current.scrollHeight}px`
    }
  }, [isEditing])

  const handleCopy = () => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => toast.error(t('project.askAi.error')))
  }

  const handleSaveEdit = () => {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === content || !onEdit) {
      setIsEditing(false)
      setDraft(content)
      return
    }
    onEdit(trimmed)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setDraft(content)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className='group flex justify-end'>
        <div className='w-full max-w-[85%] rounded-2xl border border-gray-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900'>
          <textarea
            ref={editRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${e.target.scrollHeight}px`
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSaveEdit()
              } else if (e.key === 'Escape') {
                handleCancelEdit()
              }
            }}
            className='block w-full resize-none rounded-md border-0 bg-transparent p-2 text-sm text-gray-900 ring-0 focus:ring-0 focus:outline-none dark:text-white'
            rows={1}
          />
          <div className='mt-2 flex items-center justify-end gap-2'>
            <button
              type='button'
              onClick={handleCancelEdit}
              className='rounded-md px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800'
            >
              {t('project.askAi.cancelEdit')}
            </button>
            <button
              type='button'
              onClick={handleSaveEdit}
              disabled={!draft.trim() || draft.trim() === content}
              className='rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900'
            >
              {t('project.askAi.saveEdit')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='group flex flex-col items-end'>
      <div className='max-w-[85%] rounded-2xl bg-gray-100 px-4 py-2.5 text-gray-900 dark:bg-slate-800 dark:text-gray-50'>
        <p className='text-sm whitespace-pre-wrap'>{content}</p>
      </div>
      <div className='mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100'>
        <button
          type='button'
          onClick={handleCopy}
          className='flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-200'
          title={t('project.askAi.copyMessage')}
          aria-label={t('project.askAi.copyMessage')}
        >
          {copied ? (
            <CheckIcon className='h-4 w-4' />
          ) : (
            <CopyIcon className='h-4 w-4' />
          )}
        </button>
        {onEdit ? (
          <button
            type='button'
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
            className='flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-gray-200'
            title={t('project.askAi.editMessage')}
            aria-label={t('project.askAi.editMessage')}
          >
            <PencilSimpleIcon className='h-4 w-4' />
          </button>
        ) : null}
      </div>
    </div>
  )
}

const ScrollToBottomButton = ({
  isAtBottom,
  scrollToBottom,
}: {
  isAtBottom: boolean
  scrollToBottom: () => void
}) => {
  const { t } = useTranslation('common')

  if (isAtBottom) return null

  return (
    <button
      type='button'
      onClick={scrollToBottom}
      className='absolute bottom-4 left-1/2 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-all hover:bg-gray-50 dark:border-slate-800/50 dark:bg-slate-900 dark:text-gray-200 hover:dark:bg-slate-700'
      aria-label={t('project.askAi.scrollToBottom')}
    >
      <ArrowDownIcon className='h-4 w-4' />
    </button>
  )
}

const getSuggestionPrompts = (t: any) => [
  t('project.askAi.suggestions.compareVisitors'),
  t('project.askAi.suggestions.topTrafficSources'),
  t('project.askAi.suggestions.mobilePerformance'),
  t('project.askAi.suggestions.deviceTypesChart'),
]

interface AIChat {
  id: string
  name: string | null
  messages: { role: 'user' | 'assistant'; content: string }[]
  isOwner?: boolean
  branched?: boolean
  created: string
  updated: string
}

const AskAIView = ({ projectId }: AskAIViewProps) => {
  const { t } = useTranslation('common')
  const [searchParams, setSearchParams] = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [chatTitle, setChatTitle] = useState<string | null>(null)
  const [recentChats, setRecentChats] = useState<AIChatSummary[]>([])
  const [allChats, setAllChats] = useState<AIChatSummary[]>([])
  const [allChatsTotal, setAllChatsTotal] = useState(0)
  const [isViewAllModalOpen, setIsViewAllModalOpen] = useState(false)
  const [chatToDelete, setChatToDelete] = useState<string | null>(null)
  const [feedbackMap, setFeedbackMap] = useState<
    Record<string, 'good' | 'bad'>
  >({})
  const hasInitializedRef = useRef(false)
  const currentChatIdRef = useRef<string | null>(null)
  const pendingMessagesToSaveRef = useRef<Message[] | null>(null)

  const recentChatsFetcher = useFetcher<ProjectViewActionData>()
  const allChatsFetcher = useFetcher<ProjectViewActionData>()
  const loadChatFetcher = useFetcher<ProjectViewActionData>()
  const createChatFetcher = useFetcher<ProjectViewActionData>()
  const updateChatFetcher = useFetcher<ProjectViewActionData>()
  const deleteChatFetcher = useFetcher<ProjectViewActionData>()
  const titleFetcher = useFetcher<ProjectViewActionData>()
  const feedbackFetcher = useFetcher<ProjectViewActionData>()
  const lastProcessedCreateDataRef = useRef<ProjectViewActionData | null>(null)
  const lastProcessedUpdateDataRef = useRef<ProjectViewActionData | null>(null)
  const lastProcessedTitleDataRef = useRef<ProjectViewActionData | null>(null)
  const lastProcessedLoadDataRef = useRef<ProjectViewActionData | null>(null)

  useEffect(() => {
    currentChatIdRef.current = currentChatId
  }, [currentChatId])

  const isLoadingChats = allChatsFetcher.state !== 'idle'

  const { scrollRef, contentRef, isAtBottom, scrollToBottom } =
    useStickToBottom({
      resize: 'smooth',
      initial: 'smooth',
    })

  const streamingContentRef = useRef('')
  const streamingReasoningRef = useRef('')
  const streamingToolCallsRef = useRef<
    Array<{ toolName: string; args: unknown }>
  >([])
  const streamingPartsRef = useRef<MessagePart[]>([])
  const currentTextPartRef = useRef('')

  const generateMessageId = () =>
    `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const loadRecentChats = useCallback(() => {
    if (recentChatsFetcher.state !== 'idle') return

    const formData = new FormData()
    formData.append('intent', 'get-recent-ai-chats')
    formData.append('limit', '3')

    recentChatsFetcher.submit(formData, { method: 'POST' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentChatsFetcher.submit])

  // Handle recent chats fetcher response
  useEffect(() => {
    if (recentChatsFetcher.state === 'idle' && recentChatsFetcher.data) {
      if (recentChatsFetcher.data.success && recentChatsFetcher.data.data) {
        setRecentChats(recentChatsFetcher.data.data as AIChatSummary[])
      }
    }
  }, [recentChatsFetcher.state, recentChatsFetcher.data])

  const loadAllChats = useCallback(
    (skip: number = 0) => {
      if (allChatsFetcher.state !== 'idle') return

      const formData = new FormData()
      formData.append('intent', 'get-all-ai-chats')
      formData.append('skip', skip.toString())
      formData.append('take', '20')

      allChatsFetcher.submit(formData, { method: 'POST' })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allChatsFetcher.submit],
  )

  // Handle all chats fetcher response
  const [pendingAllChatsSkip, setPendingAllChatsSkip] = useState<number | null>(
    null,
  )

  useEffect(() => {
    if (allChatsFetcher.state === 'idle' && allChatsFetcher.data) {
      if (allChatsFetcher.data.success && allChatsFetcher.data.data) {
        const result = allChatsFetcher.data.data as {
          chats: AIChatSummary[]
          total: number
        }
        if (pendingAllChatsSkip === 0) {
          setAllChats(result.chats)
        } else {
          setAllChats((prev) => [...prev, ...result.chats])
        }
        setAllChatsTotal(result.total)
      }
      setPendingAllChatsSkip(null)
    }
  }, [allChatsFetcher.state, allChatsFetcher.data, pendingAllChatsSkip])

  const loadAllChatsWithSkip = useCallback(
    (skip: number) => {
      if (allChatsFetcher.state !== 'idle') return

      setPendingAllChatsSkip(skip)
      loadAllChats(skip)
    },
    [allChatsFetcher.state, loadAllChats],
  )

  const loadChat = useCallback(
    (chatId: string) => {
      if (loadChatFetcher.state !== 'idle') return

      const formData = new FormData()
      formData.append('intent', 'get-ai-chat')
      formData.append('chatId', chatId)

      loadChatFetcher.submit(formData, { method: 'POST' })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadChatFetcher.submit],
  )

  // Handle load chat fetcher response
  useEffect(() => {
    if (loadChatFetcher.state === 'idle' && loadChatFetcher.data) {
      // Skip if we've already processed this response
      if (lastProcessedLoadDataRef.current === loadChatFetcher.data) return
      lastProcessedLoadDataRef.current = loadChatFetcher.data

      if (loadChatFetcher.data.success && loadChatFetcher.data.data) {
        const chat = loadChatFetcher.data.data as AIChat
        setMessages(
          chat.messages.map((m) => ({
            id: generateMessageId(),
            role: m.role,
            content: m.content,
          })),
        )
        setCurrentChatId(chat.id)
        setChatTitle(chat.name)
      } else if (loadChatFetcher.data.error) {
        console.error('Failed to load chat:', loadChatFetcher.data.error)
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('chat')
        setSearchParams(newParams)
      }
    }
  }, [
    loadChatFetcher.state,
    loadChatFetcher.data,
    searchParams,
    setSearchParams,
  ])

  const loadChatById = useCallback(
    (chatId: string) => {
      loadChat(chatId)
    },
    [loadChat],
  )

  const updateChatMessages = useCallback(
    (chatId: string, messagesToSave: Message[]) => {
      const apiMessages = messagesToSave
        .filter((m) => m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }))

      if (apiMessages.length === 0) return

      const formData = new FormData()
      formData.append('intent', 'update-ai-chat')
      formData.append('chatId', chatId)
      formData.append('messages', JSON.stringify(apiMessages))
      updateChatFetcher.submit(formData, { method: 'POST' })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateChatFetcher.submit],
  )

  const createChatWithMessage = useCallback(
    (firstMessages: Message[]) => {
      const apiMessages = firstMessages
        .filter((m) => m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }))

      if (apiMessages.length === 0) return

      const formData = new FormData()
      formData.append('intent', 'create-ai-chat')
      formData.append('messages', JSON.stringify(apiMessages))
      createChatFetcher.submit(formData, { method: 'POST' })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [createChatFetcher.submit],
  )

  const generateTitleForChat = useCallback(
    (chatId: string) => {
      const formData = new FormData()
      formData.append('intent', 'generate-ai-chat-title')
      formData.append('chatId', chatId)
      titleFetcher.submit(formData, { method: 'POST' })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [titleFetcher.submit],
  )

  // Handle create-chat response: get instant chat ID and update URL
  useEffect(() => {
    if (createChatFetcher.state === 'idle' && createChatFetcher.data) {
      if (lastProcessedCreateDataRef.current === createChatFetcher.data) return
      lastProcessedCreateDataRef.current = createChatFetcher.data

      if (createChatFetcher.data.success && createChatFetcher.data.data) {
        const result = createChatFetcher.data.data as AIChat
        setCurrentChatId(result.id)
        currentChatIdRef.current = result.id
        setChatTitle(result.name)
        const newParams = new URLSearchParams(searchParams)
        newParams.set('chat', result.id)
        setSearchParams(newParams, { replace: true })
        generateTitleForChat(result.id)

        if (pendingMessagesToSaveRef.current) {
          updateChatMessages(result.id, pendingMessagesToSaveRef.current)
          pendingMessagesToSaveRef.current = null
        }
        loadRecentChats()
      } else if (createChatFetcher.data.error) {
        console.error('Failed to create chat:', createChatFetcher.data.error)
      }
    }
  }, [
    createChatFetcher.state,
    createChatFetcher.data,
    searchParams,
    setSearchParams,
    generateTitleForChat,
    updateChatMessages,
    loadRecentChats,
  ])

  // Handle update-chat response (refresh recent chats list)
  useEffect(() => {
    if (updateChatFetcher.state === 'idle' && updateChatFetcher.data) {
      if (lastProcessedUpdateDataRef.current === updateChatFetcher.data) return
      lastProcessedUpdateDataRef.current = updateChatFetcher.data

      if (updateChatFetcher.data.success && updateChatFetcher.data.data) {
        const result = updateChatFetcher.data.data as AIChat
        if (result.branched) {
          setCurrentChatId(result.id)
          currentChatIdRef.current = result.id
          const newParams = new URLSearchParams(searchParams)
          newParams.set('chat', result.id)
          setSearchParams(newParams, { replace: true })
        }
        loadRecentChats()
      } else if (updateChatFetcher.data.error) {
        console.error('Failed to update chat:', updateChatFetcher.data.error)
      }
    }
  }, [
    updateChatFetcher.state,
    updateChatFetcher.data,
    searchParams,
    setSearchParams,
    loadRecentChats,
  ])

  // Handle title generation response
  useEffect(() => {
    if (titleFetcher.state === 'idle' && titleFetcher.data) {
      if (lastProcessedTitleDataRef.current === titleFetcher.data) return
      lastProcessedTitleDataRef.current = titleFetcher.data

      if (titleFetcher.data.success && titleFetcher.data.data) {
        const result = titleFetcher.data.data as { id: string; name: string }
        if (result.id === currentChatIdRef.current) {
          setChatTitle(result.name)
        }
        loadRecentChats()
      }
    }
  }, [titleFetcher.state, titleFetcher.data, loadRecentChats])

  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    const chatId = searchParams.get('chat')
    if (chatId) {
      loadChatById(chatId)
    }
    loadRecentChats()
  }, [searchParams, loadChatById, loadRecentChats])

  const handleNewChat = useCallback(() => {
    setMessages([])
    setCurrentChatId(null)
    currentChatIdRef.current = null
    setChatTitle(null)
    setStreamingMessage(null)
    setFeedbackMap({})
    pendingMessagesToSaveRef.current = null
    setError(null)
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('chat')
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  const handleOpenChat = (chatId: string) => {
    setIsViewAllModalOpen(false)
    loadChatById(chatId)
    const newParams = new URLSearchParams(searchParams)
    newParams.set('chat', chatId)
    setSearchParams(newParams)
  }

  // Handle delete chat fetcher response
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null)

  useEffect(() => {
    if (deleteChatFetcher.state === 'idle' && deleteChatFetcher.data) {
      if (deleteChatFetcher.data.success) {
        toast.success(t('project.askAi.chatDeleted'))

        if (deletingChatId === currentChatId) {
          handleNewChat()
        }

        loadRecentChats()
        if (isViewAllModalOpen) {
          loadAllChatsWithSkip(0)
        }
      } else if (deleteChatFetcher.data.error) {
        console.error('Failed to delete chat:', deleteChatFetcher.data.error)
      }
      setDeletingChatId(null)
      setChatToDelete(null)
    }
  }, [
    deleteChatFetcher.state,
    deleteChatFetcher.data,
    deletingChatId,
    currentChatId,
    isViewAllModalOpen,
    loadRecentChats,
    loadAllChatsWithSkip,
    t,
    handleNewChat,
  ])

  const handleDeleteChat = (chatId: string) => {
    if (deleteChatFetcher.state !== 'idle') return

    setDeletingChatId(chatId)

    const formData = new FormData()
    formData.append('intent', 'delete-ai-chat')
    formData.append('chatId', chatId)

    deleteChatFetcher.submit(formData, { method: 'POST' })
  }

  const runChatTurn = useCallback(
    async (allMessages: Message[]) => {
      setError(null)
      setIsLoading(true)
      setIsWaitingForResponse(true)

      streamingContentRef.current = ''
      streamingReasoningRef.current = ''
      streamingToolCallsRef.current = []
      streamingPartsRef.current = []
      currentTextPartRef.current = ''

      abortControllerRef.current = new AbortController()

      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

        const messagesToSend = _filter(
          allMessages,
          (msg) => msg.content.trim().length > 0,
        ).map((msg) => ({ role: msg.role, content: msg.content }))

        await askAI(
          projectId,
          messagesToSend,
          timezone,
          {
            onText: (chunk) => {
              setIsWaitingForResponse(false)
              streamingContentRef.current += chunk
              currentTextPartRef.current += chunk

              const displayParts = [...streamingPartsRef.current]
              if (currentTextPartRef.current) {
                displayParts.push({
                  type: 'text',
                  text: currentTextPartRef.current,
                })
              }

              setStreamingMessage({
                id: generateMessageId(),
                role: 'assistant',
                content: streamingContentRef.current,
                reasoning: streamingReasoningRef.current,
                toolCalls: [...streamingToolCallsRef.current],
                parts: displayParts,
              })
            },
            onToolCall: (toolName, args) => {
              setIsWaitingForResponse(false)
              streamingToolCallsRef.current.push({ toolName, args })

              if (currentTextPartRef.current.trim()) {
                streamingPartsRef.current.push({
                  type: 'text',
                  text: currentTextPartRef.current,
                })
                currentTextPartRef.current = ''
              }
              streamingPartsRef.current.push({
                type: 'toolCall',
                toolName,
                args,
              })

              setStreamingMessage((prev) =>
                prev
                  ? {
                      ...prev,
                      toolCalls: [...streamingToolCallsRef.current],
                      parts: [...streamingPartsRef.current],
                    }
                  : {
                      id: generateMessageId(),
                      role: 'assistant',
                      content: '',
                      toolCalls: [...streamingToolCallsRef.current],
                      parts: [...streamingPartsRef.current],
                    },
              )
            },
            onReasoning: (chunk) => {
              setIsWaitingForResponse(false)
              streamingReasoningRef.current += chunk
              setStreamingMessage((prev) =>
                prev
                  ? { ...prev, reasoning: streamingReasoningRef.current }
                  : {
                      id: generateMessageId(),
                      role: 'assistant',
                      content: '',
                      reasoning: streamingReasoningRef.current,
                    },
              )
            },
            onComplete: () => {
              const finalContent = streamingContentRef.current

              if (currentTextPartRef.current.trim()) {
                streamingPartsRef.current.push({
                  type: 'text',
                  text: currentTextPartRef.current,
                })
              }

              if (
                finalContent.trim() ||
                streamingToolCallsRef.current.length > 0
              ) {
                const assistantMessage: Message = {
                  id: generateMessageId(),
                  role: 'assistant',
                  content: finalContent,
                  reasoning: streamingReasoningRef.current,
                  toolCalls: streamingToolCallsRef.current,
                  parts: streamingPartsRef.current,
                }
                setMessages((prev) => {
                  const updatedMessages = [...prev, assistantMessage]
                  const chatId = currentChatIdRef.current
                  if (chatId) {
                    updateChatMessages(chatId, updatedMessages)
                  } else {
                    pendingMessagesToSaveRef.current = updatedMessages
                  }
                  return updatedMessages
                })
              }
              setStreamingMessage(null)
              setIsLoading(false)
              setIsWaitingForResponse(false)
            },
            onError: (err) => {
              console.error('AI chat error:', err)
              setError(err.message || t('project.askAi.error'))
              setStreamingMessage(null)
              setIsLoading(false)
              setIsWaitingForResponse(false)
            },
          },
          abortControllerRef.current.signal,
        )
      } catch (err) {
        console.error('AI chat error:', err)
        setError((err as Error).message || t('project.askAi.error'))
        setIsLoading(false)
        setIsWaitingForResponse(false)
      }
    },
    [projectId, t, updateChatMessages],
  )

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: input.trim(),
    }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')

    if (!currentChatIdRef.current) {
      createChatWithMessage(newMessages)
    }

    await runChatTurn(newMessages)
  }

  const handleEditUserMessage = useCallback(
    async (index: number, newContent: string) => {
      if (isLoading) return
      const trimmed = newContent.trim()
      if (!trimmed) return

      const truncated = messages
        .slice(0, index)
        .concat({ ...messages[index], content: trimmed })
      setMessages(truncated)
      const chatId = currentChatIdRef.current
      if (chatId) {
        updateChatMessages(chatId, truncated)
      }
      await runChatTurn(truncated)
    },
    [isLoading, messages, runChatTurn, updateChatMessages],
  )

  const handleRegenerate = useCallback(
    async (assistantIndex: number) => {
      if (isLoading) return
      const truncated = messages.slice(0, assistantIndex)
      if (truncated.length === 0) return
      setMessages(truncated)
      const chatId = currentChatIdRef.current
      if (chatId) {
        updateChatMessages(chatId, truncated)
      }
      await runChatTurn(truncated)
    },
    [isLoading, messages, runChatTurn, updateChatMessages],
  )

  const handleFeedback = useCallback(
    (assistantIndex: number, messageId: string, rating: 'good' | 'bad') => {
      const chatId = currentChatIdRef.current
      if (!chatId) return
      if (feedbackMap[messageId] === rating) return

      setFeedbackMap((prev) => ({ ...prev, [messageId]: rating }))

      const formData = new FormData()
      formData.append('intent', 'submit-ai-chat-feedback')
      formData.append('chatId', chatId)
      formData.append('rating', rating)
      formData.append('messageIndex', assistantIndex.toString())
      feedbackFetcher.submit(formData, { method: 'POST' })
      toast.success(t('project.askAi.feedbackSent'))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feedbackFetcher.submit, feedbackMap, t],
  )

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
      setIsWaitingForResponse(false)
      const finalContent = streamingContentRef.current

      if (currentTextPartRef.current.trim()) {
        streamingPartsRef.current.push({
          type: 'text',
          text: currentTextPartRef.current,
        })
      }

      if (finalContent.trim() || streamingToolCallsRef.current.length > 0) {
        const assistantMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: finalContent,
          reasoning: streamingReasoningRef.current,
          toolCalls: streamingToolCallsRef.current,
          parts: streamingPartsRef.current,
        }
        setMessages((prev) => {
          const updatedMessages = [...prev, assistantMessage]
          const chatId = currentChatIdRef.current
          if (chatId) {
            updateChatMessages(chatId, updatedMessages)
          } else {
            pendingMessagesToSaveRef.current = updatedMessages
          }
          return updatedMessages
        })
      }
      setStreamingMessage(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleQuickAction = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  const handleCopyLink = () => {
    const baseUrl = window.location.origin + window.location.pathname
    const chatParam = currentChatId ? `&chat=${currentChatId}` : ''
    const link = `${baseUrl}?tab=ai${chatParam}`
    navigator.clipboard.writeText(link)
    toast.success(t('project.askAi.linkCopied'))
  }

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const isEmpty = _isEmpty(messages) && !streamingMessage
  const isChatActive = !isEmpty

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('project.askAi.timeFormat.justNow')
    if (diffMins < 60)
      return t('project.askAi.timeFormat.minutes', { count: diffMins })
    if (diffHours < 24)
      return t('project.askAi.timeFormat.hours', { count: diffHours })
    if (diffDays < 7)
      return t('project.askAi.timeFormat.days', { count: diffDays })
    return date.toLocaleDateString()
  }

  return (
    <div className='relative flex h-[calc(100vh-140px)] min-h-[600px] flex-col bg-gray-50 dark:bg-slate-950'>
      {isChatActive ? (
        <>
          <div className='mx-auto flex w-full max-w-3xl items-center justify-between gap-3'>
            <div className='flex min-w-0 items-center gap-2'>
              <button
                type='button'
                onClick={handleNewChat}
                className='flex shrink-0 items-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-200 hover:bg-white hover:text-gray-900 dark:text-gray-400 hover:dark:border-slate-700/80 dark:hover:bg-slate-900 dark:hover:text-white'
                aria-label={t('project.askAi.newChat')}
              >
                <ArrowLeftIcon className='h-4 w-4' />
              </button>
              <h2
                className='truncate text-sm font-semibold text-gray-800 dark:text-gray-100'
                title={chatTitle ?? undefined}
              >
                {chatTitle ||
                  (currentChatId
                    ? t('project.askAi.untitledChat')
                    : t('project.askAi.newChat'))}
              </h2>
            </div>
            <button
              type='button'
              onClick={handleCopyLink}
              className='flex shrink-0 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800'
            >
              <LinkIcon className='h-4 w-4' />
              <span>{t('project.askAi.copyLink')}</span>
            </button>
          </div>
          <hr className='mt-3 border-gray-200 dark:border-slate-800' />
        </>
      ) : null}

      {error ? (
        <div className='mx-auto w-full max-w-3xl px-4 pt-4'>
          <div className='flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20'>
            <WarningCircleIcon className='h-5 w-5 shrink-0 text-red-500' />
            <p className='flex-1 text-sm text-red-700 dark:text-red-400'>
              {error}
            </p>
            <button
              type='button'
              onClick={() => setError(null)}
              className='text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300'
            >
              {t('project.askAi.dismiss')}
            </button>
          </div>
        </div>
      ) : null}

      <div className='relative flex-1 overflow-hidden'>
        <div
          ref={scrollRef}
          className={cn('h-full overflow-y-auto', {
            'flex justify-center': isEmpty,
          })}
        >
          <div ref={contentRef}>
            {isEmpty ? (
              <div className='flex min-h-full flex-col px-4 py-8'>
                <div className='flex flex-1 flex-col items-center justify-center'>
                  <div className='mb-6'>
                    <SwetrixLogo />
                  </div>

                  <Text
                    as='h1'
                    size='2xl'
                    weight='semibold'
                    colour='primary'
                    className='mb-2'
                  >
                    {t('project.askAi.welcomeTitle')}
                  </Text>
                  <Text as='p' size='base' colour='muted' className='mb-10'>
                    {t('project.askAi.welcomeSubtitle')}
                  </Text>

                  <div className='mb-6 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2'>
                    {_map(getSuggestionPrompts(t), (prompt, idx) => (
                      <button
                        key={idx}
                        type='button'
                        onClick={() => handleQuickAction(prompt)}
                        className='relative rounded-md border border-gray-200 bg-gray-50 p-2 transition-colors ring-inset hover:bg-white focus:z-10 focus:ring-1 focus:ring-slate-900 focus:outline-hidden dark:border-slate-700/80 dark:bg-slate-950 dark:hover:bg-slate-900 dark:focus:ring-slate-300'
                      >
                        <Text as='span' size='sm'>
                          {prompt}
                        </Text>
                      </button>
                    ))}
                  </div>

                  <div className='w-full max-w-2xl'>
                    <div className='rounded-lg border border-gray-200 bg-white dark:border-slate-800/60 dark:bg-slate-900/25'>
                      <form onSubmit={handleSubmit} className='relative'>
                        <Textarea
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={t('project.askAi.placeholder')}
                          disabled={isLoading}
                          rows={1}
                          classes={{
                            textarea:
                              'w-full resize-none border-0 bg-transparent px-4 py-3 text-sm text-gray-900 placeholder-gray-500 ring-0 focus:ring-0 focus:outline-none rounded-none dark:bg-transparent dark:text-white dark:placeholder-gray-400 dark:focus:ring-0',
                          }}
                        />
                        <div className='flex items-center justify-between border-t border-gray-100 px-3 py-2 dark:border-slate-800'>
                          <div className='flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400'>
                            <Tooltip
                              text={<AICapabilitiesTooltip />}
                              tooltipNode={
                                <InfoIcon className='h-4 w-4 cursor-help text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300' />
                              }
                            />
                          </div>
                          <button
                            type='submit'
                            disabled={!input.trim() || isLoading}
                            className='flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900'
                          >
                            <ArrowUpIcon className='h-3.5 w-3.5' />
                          </button>
                        </div>
                      </form>
                    </div>
                    <p className='mt-2 text-center text-xs text-gray-400 dark:text-gray-500'>
                      {t('project.askAi.disclaimer')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className='mx-auto max-w-3xl space-y-6 px-4 py-6 pb-40'>
                {(() => {
                  let lastAssistantIdx = -1
                  for (let i = messages.length - 1; i >= 0; i--) {
                    if (messages[i].role === 'assistant') {
                      lastAssistantIdx = i
                      break
                    }
                  }
                  return _map(messages, (msg, idx) => {
                    if (msg.role === 'user') {
                      return (
                        <UserMessage
                          key={msg.id}
                          content={msg.content}
                          isLoading={isLoading}
                          onEdit={(newContent) =>
                            handleEditUserMessage(idx, newContent)
                          }
                        />
                      )
                    }
                    const isLastAssistant = idx === lastAssistantIdx
                    return (
                      <AssistantMessage
                        key={msg.id}
                        message={msg}
                        onRegenerate={() => handleRegenerate(idx)}
                        onFeedback={(rating) =>
                          handleFeedback(idx, msg.id, rating)
                        }
                        feedback={feedbackMap[msg.id] ?? null}
                        canRegenerate={isLastAssistant && !isLoading}
                      />
                    )
                  })
                })()}
                {isWaitingForResponse ? (
                  <div className='py-2'>
                    <ThinkingIndicator />
                  </div>
                ) : null}
                {streamingMessage ? (
                  <AssistantMessage message={streamingMessage} isStreaming />
                ) : null}
              </div>
            )}
          </div>
        </div>
        <ScrollToBottomButton
          isAtBottom={isAtBottom}
          scrollToBottom={scrollToBottom}
        />
      </div>

      {!isEmpty ? (
        <div className='pointer-events-none absolute right-0 bottom-0 left-0 z-20 bg-linear-to-t from-gray-50 via-gray-50/95 to-transparent px-4 pt-10 pb-4 dark:from-slate-950 dark:via-slate-950/95'>
          <div className='pointer-events-auto mx-auto max-w-3xl'>
            <div className='rounded-xl border border-gray-200 bg-white dark:border-slate-800/60 dark:bg-slate-900'>
              <form onSubmit={handleSubmit} className='relative'>
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('project.askAi.followUpPlaceholder')}
                  disabled={isLoading}
                  rows={1}
                  classes={{
                    textarea:
                      'w-full resize-none border-0 bg-transparent px-4 py-3 text-sm text-gray-900 placeholder-gray-500 ring-0 focus:ring-0 focus:outline-none rounded-none dark:bg-transparent dark:text-white dark:placeholder-gray-400 dark:focus:ring-0',
                  }}
                />
                <div className='flex items-center justify-between border-t border-gray-100 px-3 py-2 dark:border-slate-800'>
                  <div className='flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400'>
                    <Tooltip
                      text={<AICapabilitiesTooltip />}
                      tooltipNode={
                        <InfoIcon className='h-4 w-4 cursor-help text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300' />
                      }
                    />
                  </div>
                  <div className='flex items-center gap-2'>
                    {isLoading ? (
                      <button
                        type='button'
                        onClick={handleStop}
                        className='flex h-7 w-7 items-center justify-center rounded-lg bg-red-500 text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500 dark:text-white'
                        aria-label={t('project.askAi.stop')}
                        title={t('project.askAi.stop')}
                      >
                        <StopCircleIcon className='h-3.5 w-3.5' />
                      </button>
                    ) : (
                      <button
                        type='submit'
                        disabled={!input.trim()}
                        className='flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900'
                      >
                        <ArrowUpIcon className='h-3.5 w-3.5' />
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
            <p className='mt-2 text-center text-xs text-gray-400 dark:text-gray-500'>
              {t('project.askAi.disclaimer')}
            </p>
          </div>
        </div>
      ) : null}

      {!isChatActive && !_isEmpty(recentChats) ? (
        <div className='mx-auto mt-8 w-full max-w-2xl'>
          <div className='flex items-center justify-between'>
            <Text as='h3' size='sm' weight='semibold' colour='primary'>
              {t('project.askAi.recentChats')}
            </Text>
            <button
              type='button'
              onClick={() => {
                setIsViewAllModalOpen(true)
                loadAllChatsWithSkip(0)
              }}
              className='text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            >
              {t('project.askAi.viewAll')}
            </button>
          </div>
          <div className='mt-4 space-y-3'>
            {_map(recentChats, (chat) => (
              <button
                key={chat.id}
                type='button'
                onClick={() => handleOpenChat(chat.id)}
                className='group flex w-full items-center justify-between text-left transition-colors'
              >
                <Text
                  as='span'
                  size='sm'
                  weight='medium'
                  truncate
                  className='group-hover:underline'
                >
                  {chat.name || t('project.askAi.newChat')}
                </Text>
                <Text
                  as='span'
                  size='sm'
                  weight='medium'
                  colour='muted'
                  className='ml-4 shrink-0'
                >
                  {formatRelativeTime(chat.updated)}
                </Text>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Modal
        isOpened={isViewAllModalOpen}
        onClose={() => setIsViewAllModalOpen(false)}
        title={t('project.askAi.allChats')}
        size='medium'
        message={
          <div className='mt-2 max-h-96 overflow-y-auto'>
            {_isEmpty(allChats) && !isLoadingChats ? (
              <p className='py-8 text-center text-gray-500 dark:text-gray-400'>
                {t('project.askAi.noChats')}
              </p>
            ) : (
              <div className='space-y-2'>
                {_map(allChats, (chat) => (
                  <div
                    key={chat.id}
                    className='flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50 dark:border-slate-800/60 dark:bg-slate-900/25 hover:dark:bg-slate-700'
                  >
                    <button
                      type='button'
                      onClick={() => handleOpenChat(chat.id)}
                      className='flex flex-1 items-center gap-3 overflow-hidden text-left'
                    >
                      <ChatIcon className='h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500' />
                      <div className='overflow-hidden'>
                        <span className='block truncate text-sm text-gray-900 dark:text-white'>
                          {chat.name || t('project.askAi.newChat')}
                        </span>
                        <span className='text-xs text-gray-500 dark:text-gray-400'>
                          {formatRelativeTime(chat.updated)}
                        </span>
                      </div>
                    </button>
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation()
                        setChatToDelete(chat.id)
                      }}
                      className='ml-2 rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 dark:hover:bg-slate-600 dark:hover:text-red-400'
                      aria-label={t('project.askAi.deleteChat')}
                    >
                      <TrashIcon className='h-4 w-4' />
                    </button>
                  </div>
                ))}
                {allChats.length < allChatsTotal ? (
                  <button
                    type='button'
                    onClick={() => loadAllChatsWithSkip(allChats.length)}
                    disabled={isLoadingChats}
                    className='flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-slate-800/50 dark:bg-slate-900 dark:text-gray-200 hover:dark:bg-slate-700'
                  >
                    {isLoadingChats ? (
                      <SpinnerGapIcon className='h-4 w-4 animate-spin' />
                    ) : null}
                    {t('project.askAi.loadMore')}
                  </button>
                ) : null}
              </div>
            )}
            {isLoadingChats && _isEmpty(allChats) ? (
              <div className='flex items-center justify-center py-8'>
                <SpinnerGapIcon className='h-6 w-6 animate-spin text-gray-400' />
              </div>
            ) : null}
          </div>
        }
      />

      <Modal
        isOpened={!!chatToDelete}
        onClose={() => setChatToDelete(null)}
        onSubmit={() => chatToDelete && handleDeleteChat(chatToDelete)}
        title={t('project.askAi.deleteChat')}
        message={t('project.askAi.deleteChatConfirm')}
        submitText={t('common.delete')}
        closeText={t('common.cancel')}
        submitType='danger'
      />
    </div>
  )
}

export default AskAIView
