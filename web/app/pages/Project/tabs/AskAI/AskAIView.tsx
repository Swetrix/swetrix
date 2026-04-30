import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import {
  ArrowUpIcon,
  CaretDownIcon,
  CaretRightIcon,
  SpinnerGapIcon,
  StopCircleIcon,
  WarningCircleIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpRightIcon,
  ChartBarIcon,
  TargetIcon,
  GitBranchIcon,
  InfoIcon,
  CheckIcon,
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
  MicrophoneIcon,
  MicrophoneSlashIcon,
  TagIcon,
  PushPinIcon,
  MagnifyingGlassIcon,
  DownloadSimpleIcon,
  ExportIcon,
} from '@phosphor-icons/react'
import _filter from 'lodash/filter'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import { Marked } from 'marked'
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams, useFetcher } from 'react-router'
import sanitizeHtml from 'sanitize-html'
import { toast } from 'sonner'
import { useStickToBottom } from 'use-stick-to-bottom'

import { askAI } from '~/api'
import useSpeechRecognition from '~/hooks/useSpeechRecognition'
import { ProjectViewActionData } from '~/routes/projects.$id'
import Button from '~/ui/Button'
import SwetrixLogo from '~/ui/icons/SwetrixLogo'
import Input from '~/ui/Input'
import Modal from '~/ui/Modal'
import { Text } from '~/ui/Text'
import Textarea from '~/ui/Textarea'
import Tooltip from '~/ui/Tooltip'
import { cn } from '~/utils/generic'

import AIChart from './AIChart'
import { parseSegments } from './contentSegments'
import {
  chatToMarkdown,
  downloadMarkdown,
  ExportMessage,
  getChatExportFilename,
} from './exportHelpers'
import { formatToolCallSummary, ToolCallSummary } from './toolFormatters'

interface MessagePart {
  type: 'text' | 'toolCall'
  text?: string
  toolName?: string
  args?: unknown
}

interface AIChatSummary {
  id: string
  name: string | null
  pinned?: boolean
  tags?: string[]
  created: string
  updated: string
}

const MAX_TAGS_PER_CHAT = 5
const MAX_TAG_LENGTH = 30

const sanitiseTagsClient = (tags: string[]): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    if (typeof raw !== 'string') continue
    const cleaned = raw.replace(/,/g, '').trim().slice(0, MAX_TAG_LENGTH)
    if (!cleaned) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(cleaned)
    if (out.length >= MAX_TAGS_PER_CHAT) break
  }
  return out
}

interface MessageToolCall {
  toolName: string
  args: unknown
  completed?: boolean
  timestamp?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  toolCalls?: MessageToolCall[]
  parts?: MessagePart[]
  followUps?: string[]
}

interface AskAIViewProps {
  projectId: string
}

const markdownParser = new Marked({
  breaks: true,
  gfm: true,
})

const renderMarkdown = (content: string): string => {
  const html = markdownParser.parse(content) as string
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
        <Text as='p' weight='semibold' className='mb-1.5 text-white'>
          {t('project.askAi.capabilities.title')}
        </Text>
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
        <Text as='p' weight='semibold' className='mb-1.5 text-white'>
          {t('project.askAi.capabilities.cannotTitle')}
        </Text>
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
  projectId,
}: {
  content: string
  isStreaming?: boolean
  projectId?: string
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
          return (
            <AIChart key={idx} chart={segment.chart} projectId={projectId} />
          )
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

const formatRelativeTimestamp = (timestamp: string, t: any): string | null => {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null
  const diffMs = Date.now() - date.getTime()
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
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const ToolCallSummaryDrawer = ({
  toolCalls,
}: {
  toolCalls: MessageToolCall[]
}) => {
  const { t } = useTranslation('common')
  const [isExpanded, setIsExpanded] = useState(false)

  const summaries = useMemo<ToolCallSummary[]>(
    () => toolCalls.map((tc) => formatToolCallSummary(tc.toolName, tc.args, t)),
    [toolCalls, t],
  )

  if (toolCalls.length === 0) return null

  const buttonLabel = t('project.askAi.howIGotThis', {
    count: toolCalls.length,
    defaultValue:
      toolCalls.length === 1
        ? 'How I got this · 1 step'
        : `How I got this · ${toolCalls.length} steps`,
  })

  return (
    <div className='mt-3'>
      <button
        type='button'
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        className='inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
      >
        <span>{buttonLabel}</span>
        {isExpanded ? (
          <CaretDownIcon className='h-3 w-3' />
        ) : (
          <CaretRightIcon className='h-3 w-3' />
        )}
      </button>

      {isExpanded ? (
        <div className='mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900/40'>
          <ol className='divide-y divide-gray-100 dark:divide-slate-800/80'>
            {_map(summaries, (summary, idx) => {
              const { label: toolLabel, icon: Icon } = getToolInfo(
                summary.toolName,
                t,
              )
              const timestamp = toolCalls[idx]?.timestamp
              const relative = timestamp
                ? formatRelativeTimestamp(timestamp, t)
                : null
              return (
                <li key={idx} className='px-3 py-2.5'>
                  <div className='flex items-start gap-2.5'>
                    <span className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600 dark:bg-slate-800 dark:text-gray-300'>
                      {idx + 1}
                    </span>
                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-wrap items-center gap-1.5'>
                        <Icon className='h-3.5 w-3.5 text-gray-500 dark:text-gray-400' />
                        <span className='text-xs font-medium text-gray-800 dark:text-gray-100'>
                          {toolLabel}
                        </span>
                        {relative ? (
                          <span className='text-[11px] text-gray-400 dark:text-gray-500'>
                            · {relative}
                          </span>
                        ) : null}
                      </div>
                      {summary.params.length === 0 ? (
                        <Text
                          as='p'
                          size='xs'
                          className='mt-1 text-gray-400 italic dark:text-gray-500'
                        >
                          {t('project.askAi.noParameters')}
                        </Text>
                      ) : (
                        <dl className='mt-1.5 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs'>
                          {_map(summary.params, (param, pIdx) => (
                            <React.Fragment key={pIdx}>
                              <dt className='text-gray-500 dark:text-gray-400'>
                                {t(param.labelKey, {
                                  defaultValue: param.fallbackLabel,
                                })}
                              </dt>
                              <dd className='min-w-0 text-gray-800 dark:text-gray-100'>
                                {param.entries ? (
                                  <ul className='space-y-0.5'>
                                    {_map(param.entries, (entry, eIdx) => (
                                      <li
                                        key={eIdx}
                                        className='wrap-break-word'
                                      >
                                        {entry}
                                      </li>
                                    ))}
                                  </ul>
                                ) : param.json ? (
                                  <pre className='overflow-x-auto rounded-md bg-gray-50 p-2 font-mono text-[11px] leading-snug text-gray-700 dark:bg-slate-950/60 dark:text-gray-300'>
                                    {param.json}
                                  </pre>
                                ) : (
                                  <span className='wrap-break-word'>
                                    {param.value}
                                  </span>
                                )}
                              </dd>
                            </React.Fragment>
                          ))}
                        </dl>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
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
  followUps,
  onFollowUpClick,
  projectId,
}: {
  message: Message
  isStreaming?: boolean
  onRegenerate?: () => void
  onFeedback?: (rating: 'good' | 'bad') => void
  feedback?: 'good' | 'bad' | null
  canRegenerate?: boolean
  followUps?: string[]
  onFollowUpClick?: (prompt: string) => void
  projectId?: string
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
                    projectId={projectId}
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
          <MessageContent
            content={message.content}
            isStreaming={isStreaming}
            projectId={projectId}
          />
        </>
      )}

      {!isStreaming && message.toolCalls && message.toolCalls.length > 0 ? (
        <ToolCallSummaryDrawer toolCalls={message.toolCalls} />
      ) : null}

      {!isStreaming &&
      hasContent &&
      followUps &&
      followUps.length > 0 &&
      onFollowUpClick ? (
        <div
          role='group'
          aria-label={t('project.askAi.followUps.title')}
          className='mt-4 border-t border-gray-200/80 dark:border-slate-800/80'
        >
          {_map(followUps, (suggestion, idx) => (
            <button
              key={`${idx}-${suggestion}`}
              type='button'
              onClick={() => onFollowUpClick(suggestion)}
              className='group/row flex w-full items-center justify-between gap-4 border-b border-gray-200/80 py-2.5 text-left text-sm text-gray-600 transition-colors last:border-b-0 hover:text-gray-900 dark:border-slate-800/80 dark:text-gray-400 dark:hover:text-white'
            >
              <span className='flex-1 leading-snug'>{suggestion}</span>
              <ArrowUpRightIcon
                weight='bold'
                className='h-4 w-4 shrink-0 text-gray-300 transition-all group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5 group-hover/row:text-gray-700 dark:text-slate-600 dark:group-hover/row:text-gray-200'
              />
            </button>
          ))}
        </div>
      ) : null}

      {!isStreaming && hasContent ? (
        <div className='mt-1 flex items-center gap-0.5 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:hover)]:opacity-0'>
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
  onBranch,
  isLoading,
}: {
  content: string
  onEdit?: (newContent: string) => void
  onBranch?: () => void
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
        <Text as='p' size='sm' className='whitespace-pre-wrap'>
          {content}
        </Text>
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
        {onBranch ? (
          <button
            type='button'
            onClick={onBranch}
            disabled={isLoading}
            className='flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-gray-200'
            title={t('project.askAi.branchOff')}
            aria-label={t('project.askAi.branchOff')}
          >
            <GitBranchIcon className='h-4 w-4' />
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

interface VoiceInputButtonProps {
  isListening: boolean
  isLoading: boolean
  onStart: () => void
  onStop: () => void
}

const HOLD_THRESHOLD_MS = 300

const VoiceInputButton = ({
  isListening,
  isLoading,
  onStart,
  onStop,
}: VoiceInputButtonProps) => {
  const { t } = useTranslation('common')
  const holdTimerRef = useRef<number | null>(null)
  const holdActiveRef = useRef(false)

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        window.clearTimeout(holdTimerRef.current)
      }
    }
  }, [])

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (isLoading) return
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    holdActiveRef.current = false
    clearHoldTimer()
    holdTimerRef.current = window.setTimeout(() => {
      holdActiveRef.current = true
      if (!isListening) onStart()
    }, HOLD_THRESHOLD_MS)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (isLoading) return
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    const wasHold = holdActiveRef.current
    clearHoldTimer()
    holdActiveRef.current = false
    if (wasHold) {
      if (isListening) onStop()
      return
    }
    if (isListening) {
      onStop()
    } else {
      onStart()
    }
  }

  const handlePointerCancel = () => {
    clearHoldTimer()
    if (holdActiveRef.current && isListening) {
      onStop()
    }
    holdActiveRef.current = false
  }

  const label = isListening
    ? t('project.askAi.listening')
    : t('project.askAi.voiceInput')

  return (
    <button
      type='button'
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      disabled={isLoading}
      aria-label={label}
      aria-pressed={isListening}
      title={label}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        isListening
          ? 'animate-pulse bg-red-500 text-white hover:bg-red-600'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200',
      )}
    >
      {isListening ? (
        <MicrophoneSlashIcon className='h-4 w-4' weight='fill' />
      ) : (
        <MicrophoneIcon className='h-4 w-4' />
      )}
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
  messages: {
    role: 'user' | 'assistant'
    content: string
    followUps?: string[]
    toolCalls?: MessageToolCall[]
  }[]
  pinned?: boolean
  tags?: string[]
  isOwner?: boolean
  branched?: boolean
  parentChatId?: string | null
  parentChat?: { id: string; name: string | null } | null
  created: string
  updated: string
}

interface ChatRowActions {
  onOpen: (chatId: string) => void
  onDelete: (chatId: string) => void
  onTogglePin: (chat: AIChatSummary) => void
  onSaveTags: (chatId: string, tags: string[]) => void
  onRename: (chatId: string, name: string) => void
  formatRelative: (dateStr: string) => string
}

const TagChip = ({
  label,
  active,
  onClick,
  onRemove,
  className,
}: {
  label: string
  active?: boolean
  onClick?: () => void
  onRemove?: () => void
  className?: string
}) => {
  const baseClasses =
    'inline-flex max-w-[180px] items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors'
  const activeClasses =
    'bg-slate-900 text-gray-50 ring-slate-900 dark:bg-gray-50 dark:text-slate-900 dark:ring-gray-50'
  const inactiveClasses =
    'bg-slate-50 text-slate-700 ring-slate-500/10 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20'
  const interactiveHover = onClick
    ? 'hover:bg-slate-100 dark:hover:bg-slate-700/40'
    : ''

  const content = (
    <>
      <span className='truncate'>{label}</span>
      {onRemove ? (
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label='Remove tag'
          className='rounded-full p-0.5 opacity-70 hover:opacity-100'
        >
          <XIcon className='h-3 w-3' />
        </button>
      ) : null}
    </>
  )

  if (onClick) {
    return (
      <button
        type='button'
        onClick={onClick}
        className={cn(
          baseClasses,
          active ? activeClasses : inactiveClasses,
          interactiveHover,
          className,
        )}
      >
        {content}
      </button>
    )
  }

  return (
    <span
      className={cn(
        baseClasses,
        active ? activeClasses : inactiveClasses,
        className,
      )}
    >
      {content}
    </span>
  )
}

const TagEditor = ({
  tags,
  onSave,
  onCancel,
}: {
  tags: string[]
  onSave: (tags: string[]) => void
  onCancel: () => void
}) => {
  const { t } = useTranslation('common')
  const [draft, setDraft] = useState<string[]>(tags)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const addTag = (raw: string) => {
    const cleaned = raw.replace(/,/g, '').trim()
    if (!cleaned) {
      setError(null)
      return
    }
    if (cleaned.length > MAX_TAG_LENGTH) {
      setError(t('project.askAi.tagInvalid', { max: MAX_TAG_LENGTH }))
      return
    }
    if (draft.length >= MAX_TAGS_PER_CHAT) {
      setError(t('project.askAi.tagsLimitReached', { max: MAX_TAGS_PER_CHAT }))
      return
    }
    if (
      draft.some((existing) => existing.toLowerCase() === cleaned.toLowerCase())
    ) {
      setError(t('project.askAi.tagAlreadyExists'))
      return
    }
    setDraft((prev) => [...prev, cleaned])
    setInput('')
    setError(null)
  }

  const removeAt = (idx: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== idx))
    setError(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && draft.length > 0) {
      e.preventDefault()
      removeAt(draft.length - 1)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const commit = () => {
    const finalTags = input.trim() ? [...draft, input.trim()] : draft
    onSave(sanitiseTagsClient(finalTags))
  }

  return (
    <div
      role='presentation'
      className='flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-2 dark:border-slate-700/80 dark:bg-slate-900/60'
      onClick={(e) => e.stopPropagation()}
    >
      <div className='flex flex-wrap items-center gap-1.5'>
        {_map(draft, (tag, idx) => (
          <TagChip
            key={`${tag}-${idx}`}
            label={tag}
            onRemove={() => removeAt(idx)}
          />
        ))}
        <input
          ref={inputRef}
          type='text'
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('project.askAi.tagPlaceholder')}
          maxLength={MAX_TAG_LENGTH}
          className='min-w-[140px] flex-1 border-0 bg-transparent p-1 text-xs text-gray-900 placeholder-gray-400 focus:ring-0 focus:outline-none dark:text-white dark:placeholder-gray-500'
        />
      </div>
      {error ? (
        <Text size='xxs' colour='error'>
          {error}
        </Text>
      ) : null}
      <div className='flex items-center justify-end gap-2'>
        <Button
          variant='secondary'
          size='xs'
          onClick={onCancel}
          className='py-1'
        >
          {t('common.cancel')}
        </Button>
        <Button size='xs' onClick={commit} className='py-1'>
          {t('project.askAi.saveTags')}
        </Button>
      </div>
    </div>
  )
}

const ChatRow = ({
  chat,
  actions,
  variant = 'panel',
}: {
  chat: AIChatSummary
  actions: ChatRowActions
  variant?: 'panel' | 'compact'
}) => {
  const { t } = useTranslation('common')
  const [isEditingTags, setIsEditingTags] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(chat.name || '')
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }
  }, [isEditingName])

  const tags = chat.tags ?? []

  if (variant === 'compact') {
    return (
      <button
        type='button'
        onClick={() => actions.onOpen(chat.id)}
        className='group flex w-full items-center justify-between gap-3 py-1 text-left transition-colors'
      >
        <div className='flex min-w-0 items-center gap-2'>
          {chat.pinned ? (
            <PushPinIcon
              className='h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400'
              weight='fill'
            />
          ) : null}
          <Text
            as='span'
            size='sm'
            weight='medium'
            colour='primary'
            truncate
            className='group-hover:underline'
          >
            {chat.name || t('project.askAi.newChat')}
          </Text>
        </div>
        <Text as='span' size='xs' colour='muted' className='shrink-0'>
          {actions.formatRelative(chat.updated)}
        </Text>
      </button>
    )
  }

  const submitRename = () => {
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== chat.name) {
      actions.onRename(chat.id, trimmed)
    }
    setIsEditingName(false)
  }

  const iconButtonCls =
    'flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-100'

  return (
    <div className='group rounded-md border border-gray-200 bg-white px-3 py-2 ring-1 ring-transparent transition-colors ring-inset hover:border-gray-300 hover:ring-gray-200/60 dark:border-slate-800/80 dark:bg-slate-900/40 hover:dark:border-slate-700 hover:dark:ring-slate-700/40'>
      <div className='flex items-start gap-2'>
        <button
          type='button'
          onClick={() => actions.onTogglePin(chat)}
          className={cn(
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
            chat.pinned
              ? 'text-amber-500 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20'
              : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-gray-200',
          )}
          title={
            chat.pinned ? t('project.askAi.unpin') : t('project.askAi.pin')
          }
          aria-label={
            chat.pinned ? t('project.askAi.unpin') : t('project.askAi.pin')
          }
        >
          <PushPinIcon
            className='h-4 w-4'
            weight={chat.pinned ? 'fill' : 'regular'}
          />
        </button>

        <div className='flex min-w-0 flex-1 flex-col items-start gap-0.5'>
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type='text'
              value={nameDraft}
              maxLength={200}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submitRename()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  setNameDraft(chat.name || '')
                  setIsEditingName(false)
                }
              }}
              onBlur={submitRename}
              className='w-full border-0 bg-transparent p-0 text-sm font-medium text-gray-900 focus:ring-0 focus:outline-none dark:text-gray-50'
              placeholder={t('project.askAi.renameChatPlaceholder')}
            />
          ) : (
            <Text
              as='button'
              size='sm'
              weight='medium'
              colour='primary'
              truncate
              type='button'
              onClick={() => actions.onOpen(chat.id)}
              className='block max-w-full text-left hover:underline'
            >
              {chat.name || t('project.askAi.newChat')}
            </Text>
          )}
          <Text size='xxs' colour='muted'>
            {actions.formatRelative(chat.updated)}
          </Text>
        </div>

        <div className='flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100'>
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation()
              setNameDraft(chat.name || '')
              setIsEditingName(true)
            }}
            className={iconButtonCls}
            aria-label={t('project.askAi.renameChat')}
            title={t('project.askAi.renameChat')}
          >
            <PencilSimpleIcon className='h-3.5 w-3.5' />
          </button>
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation()
              setIsEditingTags(true)
            }}
            className={iconButtonCls}
            aria-label={t('project.askAi.manageTags')}
            title={t('project.askAi.manageTags')}
          >
            <TagIcon className='h-3.5 w-3.5' />
          </button>
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation()
              actions.onDelete(chat.id)
            }}
            className={cn(
              iconButtonCls,
              'hover:text-red-600 dark:hover:text-red-400',
            )}
            aria-label={t('project.askAi.deleteChat')}
            title={t('project.askAi.deleteChat')}
          >
            <TrashIcon className='h-3.5 w-3.5' />
          </button>
        </div>
      </div>

      {isEditingTags ? (
        <div className='mt-2 ml-9'>
          <TagEditor
            tags={tags}
            onSave={(next) => {
              actions.onSaveTags(chat.id, next)
              setIsEditingTags(false)
            }}
            onCancel={() => setIsEditingTags(false)}
          />
        </div>
      ) : tags.length > 0 ? (
        <div className='mt-1.5 ml-9 flex flex-wrap gap-1'>
          {_map(tags, (tag) => (
            <TagChip key={tag} label={tag} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

const ChatHistoryPanel = ({
  isOpen,
  onClose,
  search,
  onSearchChange,
  tagFilter,
  onTagFilterChange,
  availableTags,
  chats,
  total,
  isLoading,
  isFetchingMore,
  actions,
  onLoadMore,
}: {
  isOpen: boolean
  onClose: () => void
  search: string
  onSearchChange: (value: string) => void
  tagFilter: string | null
  onTagFilterChange: (tag: string | null) => void
  availableTags: string[]
  chats: AIChatSummary[]
  total: number
  isLoading: boolean
  isFetchingMore: boolean
  actions: ChatRowActions
  onLoadMore: () => void
}) => {
  const { t } = useTranslation('common')
  const isSearching = search.trim().length >= 2 || tagFilter !== null
  const showEmpty = !isLoading && chats.length === 0
  const pinned = useMemo(() => chats.filter((c) => c.pinned), [chats])
  const others = useMemo(() => chats.filter((c) => !c.pinned), [chats])

  return (
    <Modal
      isOpened={isOpen}
      onClose={onClose}
      title={t('project.askAi.allChats')}
      size='large'
      message={
        <div className='mt-3 flex flex-col gap-4'>
          <div className='relative'>
            <MagnifyingGlassIcon className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500' />
            <Input
              type='search'
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('project.askAi.searchChatsPlaceholder')}
              classes={{ input: 'pl-9' }}
            />
          </div>
          {search.trim().length === 1 ? (
            <Text size='xs' colour='muted' className='-mt-2'>
              {t('project.askAi.searchHint')}
            </Text>
          ) : null}

          {availableTags.length > 0 ? (
            <div className='flex flex-wrap items-center gap-1.5'>
              <Text size='xs' weight='medium' colour='muted' className='mr-1'>
                {t('project.askAi.filterByTag')}:
              </Text>
              <TagChip
                label={t('project.askAi.allTags')}
                active={tagFilter === null}
                onClick={() => onTagFilterChange(null)}
              />
              {_map(availableTags, (tag) => (
                <TagChip
                  key={tag}
                  label={tag}
                  active={tagFilter === tag}
                  onClick={() =>
                    onTagFilterChange(tagFilter === tag ? null : tag)
                  }
                />
              ))}
              {tagFilter ? (
                <button
                  type='button'
                  onClick={() => onTagFilterChange(null)}
                  className='ml-1 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                >
                  {t('project.askAi.clearFilters')}
                </button>
              ) : null}
            </div>
          ) : null}

          <div className='-mx-1 max-h-[60vh] overflow-y-auto px-1'>
            {showEmpty ? (
              <Text
                as='p'
                size='sm'
                colour='muted'
                className='py-8 text-center'
              >
                {isSearching
                  ? t('project.askAi.noChatsMatch')
                  : t('project.askAi.noChats')}
              </Text>
            ) : (
              <div className='flex flex-col gap-4'>
                {pinned.length > 0 ? (
                  <div className='flex flex-col gap-2'>
                    <div className='flex items-center gap-1.5'>
                      <PushPinIcon
                        className='h-3 w-3 text-amber-500 dark:text-amber-400'
                        weight='fill'
                      />
                      <Text
                        size='xxs'
                        weight='semibold'
                        colour='muted'
                        tracking='wide'
                        className='uppercase'
                      >
                        {t('project.askAi.pinned')}
                      </Text>
                    </div>
                    <div className='flex flex-col gap-1.5'>
                      {_map(pinned, (chat) => (
                        <ChatRow key={chat.id} chat={chat} actions={actions} />
                      ))}
                    </div>
                  </div>
                ) : null}

                {others.length > 0 ? (
                  <div className='flex flex-col gap-2'>
                    {pinned.length > 0 ? (
                      <Text
                        size='xxs'
                        weight='semibold'
                        colour='muted'
                        tracking='wide'
                        className='uppercase'
                      >
                        {t('project.askAi.recentChats')}
                      </Text>
                    ) : null}
                    <div className='flex flex-col gap-1.5'>
                      {_map(others, (chat) => (
                        <ChatRow key={chat.id} chat={chat} actions={actions} />
                      ))}
                    </div>
                  </div>
                ) : null}

                {chats.length < total ? (
                  <Button
                    variant='secondary'
                    size='xs'
                    onClick={onLoadMore}
                    disabled={isFetchingMore}
                    loading={isFetchingMore}
                    className='justify-center self-center'
                  >
                    {t('project.askAi.loadMore')}
                  </Button>
                ) : null}
              </div>
            )}
            {isLoading && chats.length === 0 ? (
              <div className='flex items-center justify-center py-8'>
                <SpinnerGapIcon className='h-6 w-6 animate-spin text-gray-400' />
              </div>
            ) : null}
          </div>
        </div>
      }
    />
  )
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
  const baseInputRef = useRef('')
  const [voiceDisabled, setVoiceDisabled] = useState(false)
  const {
    isListening,
    transcript: speechTranscript,
    start: startSpeech,
    stop: stopSpeech,
    isSupported: isSpeechSupported,
    error: speechError,
  } = useSpeechRecognition()
  const showVoice = isSpeechSupported && !voiceDisabled

  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [chatTitle, setChatTitle] = useState<string | null>(null)
  const [parentChat, setParentChat] = useState<{
    id: string
    name: string | null
  } | null>(null)
  const [pendingBranchIndex, setPendingBranchIndex] = useState<number | null>(
    null,
  )
  const [recentChats, setRecentChats] = useState<AIChatSummary[]>([])
  const [allChats, setAllChats] = useState<AIChatSummary[]>([])
  const [allChatsTotal, setAllChatsTotal] = useState(0)
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false)
  const [chatToDelete, setChatToDelete] = useState<string | null>(null)
  const [historySearch, setHistorySearch] = useState('')
  const [debouncedHistorySearch, setDebouncedHistorySearch] = useState('')
  const [historyTagFilter, setHistoryTagFilter] = useState<string | null>(null)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [feedbackMap, setFeedbackMap] = useState<
    Record<string, 'good' | 'bad'>
  >({})
  const hasInitializedRef = useRef(false)
  const currentChatIdRef = useRef<string | null>(null)
  const pendingMessagesToSaveRef = useRef<Message[] | null>(null)

  const recentChatsFetcher = useFetcher<ProjectViewActionData>()
  const allChatsFetcher = useFetcher<ProjectViewActionData>()
  const tagsFetcher = useFetcher<ProjectViewActionData>()
  const loadChatFetcher = useFetcher<ProjectViewActionData>()
  const createChatFetcher = useFetcher<ProjectViewActionData>()
  const updateChatFetcher = useFetcher<ProjectViewActionData>()
  const updateMetaFetcher = useFetcher<ProjectViewActionData>()
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
  const streamingToolCallsRef = useRef<MessageToolCall[]>([])
  const streamingPartsRef = useRef<MessagePart[]>([])
  const currentTextPartRef = useRef('')
  const streamingFollowUpsRef = useRef<string[] | null>(null)

  const generateMessageId = () =>
    `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const loadRecentChats = useCallback(() => {
    if (recentChatsFetcher.state !== 'idle') return

    const formData = new FormData()
    formData.append('intent', 'list-ai-chats')
    formData.append('take', '3')
    formData.append('orderByPinned', 'false')

    recentChatsFetcher.submit(formData, { method: 'POST' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentChatsFetcher.submit])

  useEffect(() => {
    if (recentChatsFetcher.state === 'idle' && recentChatsFetcher.data) {
      if (recentChatsFetcher.data.success && recentChatsFetcher.data.data) {
        const payload = recentChatsFetcher.data.data as
          | AIChatSummary[]
          | { chats: AIChatSummary[]; total: number }
        const list = Array.isArray(payload) ? payload : payload.chats
        setRecentChats(list)
      }
    }
  }, [recentChatsFetcher.state, recentChatsFetcher.data])

  const loadAvailableTags = useCallback(() => {
    if (tagsFetcher.state !== 'idle') return

    const formData = new FormData()
    formData.append('intent', 'list-ai-chat-tags')
    tagsFetcher.submit(formData, { method: 'POST' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagsFetcher.submit])

  useEffect(() => {
    if (tagsFetcher.state === 'idle' && tagsFetcher.data) {
      if (tagsFetcher.data.success && tagsFetcher.data.data) {
        const payload = tagsFetcher.data.data as { tags?: string[] }
        setAvailableTags(payload.tags || [])
      }
    }
  }, [tagsFetcher.state, tagsFetcher.data])

  const loadAllChats = useCallback(
    (skip: number = 0, opts: { search?: string; tag?: string | null } = {}) => {
      if (allChatsFetcher.state !== 'idle') return

      const formData = new FormData()
      formData.append('intent', 'list-ai-chats')
      formData.append('skip', skip.toString())
      formData.append('take', '20')
      if (opts.search && opts.search.trim().length >= 2) {
        formData.append('search', opts.search.trim())
      }
      if (opts.tag) {
        formData.append('tag', opts.tag)
      }

      allChatsFetcher.submit(formData, { method: 'POST' })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allChatsFetcher.submit],
  )

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
        if (pendingAllChatsSkip === 0 || pendingAllChatsSkip === null) {
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
    (skip: number, opts: { search?: string; tag?: string | null } = {}) => {
      if (allChatsFetcher.state !== 'idle') return

      setPendingAllChatsSkip(skip)
      loadAllChats(skip, opts)
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
            followUps:
              m.role === 'assistant' &&
              Array.isArray(m.followUps) &&
              m.followUps.length > 0
                ? m.followUps
                : undefined,
            toolCalls:
              m.role === 'assistant' &&
              Array.isArray(m.toolCalls) &&
              m.toolCalls.length > 0
                ? m.toolCalls.map((tc) => ({
                    toolName: tc.toolName,
                    args: tc.args,
                    timestamp: tc.timestamp,
                  }))
                : undefined,
          })),
        )
        setCurrentChatId(chat.id)
        setChatTitle(chat.name)
        setParentChat(chat.parentChat ?? null)
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

  const serialiseMessageForApi = (m: Message) => {
    const base: {
      role: 'user' | 'assistant'
      content: string
      followUps?: string[]
      toolCalls?: Array<{
        toolName: string
        args: unknown
        timestamp?: string
      }>
    } = {
      role: m.role,
      content: m.content,
    }
    if (m.role === 'assistant' && m.followUps && m.followUps.length > 0) {
      base.followUps = m.followUps
    }
    if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
      base.toolCalls = m.toolCalls.map((tc) => ({
        toolName: tc.toolName,
        args: tc.args,
        timestamp: tc.timestamp,
      }))
    }
    return base
  }

  const updateChatMessages = useCallback(
    (chatId: string, messagesToSave: Message[]) => {
      const apiMessages = messagesToSave
        .filter((m) => m.content.trim().length > 0)
        .map(serialiseMessageForApi)

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
    (firstMessages: Message[], opts: { parentChatId?: string | null } = {}) => {
      const apiMessages = firstMessages
        .filter((m) => m.content.trim().length > 0)
        .map(serialiseMessageForApi)

      if (apiMessages.length === 0) return

      const formData = new FormData()
      formData.append('intent', 'create-ai-chat')
      formData.append('messages', JSON.stringify(apiMessages))
      if (opts.parentChatId) {
        formData.append('parentChatId', opts.parentChatId)
      }
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
        if (result.parentChat) {
          setParentChat(result.parentChat)
        } else if (!result.parentChatId) {
          setParentChat(null)
        }
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
    setParentChat(null)
    setStreamingMessage(null)
    setFeedbackMap({})
    pendingMessagesToSaveRef.current = null
    setError(null)
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('chat')
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  const handleOpenChat = (chatId: string) => {
    setIsHistoryPanelOpen(false)
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
        loadAvailableTags()
        if (isHistoryPanelOpen) {
          const term = debouncedHistorySearch.trim()
          loadAllChatsWithSkip(0, {
            search: term.length >= 2 ? term : undefined,
            tag: historyTagFilter,
          })
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
    isHistoryPanelOpen,
    debouncedHistorySearch,
    historyTagFilter,
    loadRecentChats,
    loadAvailableTags,
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

  const updateChatMeta = useCallback(
    (
      chatId: string,
      patch: { pinned?: boolean; tags?: string[]; name?: string },
    ) => {
      const formData = new FormData()
      formData.append('intent', 'update-ai-chat-meta')
      formData.append('chatId', chatId)
      if (patch.pinned !== undefined) {
        formData.append('pinned', String(patch.pinned))
      }
      if (patch.tags !== undefined) {
        formData.append('tags', JSON.stringify(patch.tags))
      }
      if (patch.name !== undefined) {
        formData.append('name', patch.name)
      }
      updateMetaFetcher.submit(formData, { method: 'POST' })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateMetaFetcher.submit],
  )

  const applyMetaToList = (
    list: AIChatSummary[],
    chatId: string,
    patch: { pinned?: boolean; tags?: string[]; name?: string },
  ): AIChatSummary[] =>
    list.map((c) =>
      c.id === chatId
        ? {
            ...c,
            ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
            ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
            ...(patch.name !== undefined ? { name: patch.name } : {}),
          }
        : c,
    )

  const handleTogglePin = useCallback(
    (chat: AIChatSummary) => {
      const nextPinned = !chat.pinned
      setRecentChats((prev) =>
        applyMetaToList(prev, chat.id, { pinned: nextPinned }),
      )
      setAllChats((prev) =>
        applyMetaToList(prev, chat.id, { pinned: nextPinned }),
      )
      updateChatMeta(chat.id, { pinned: nextPinned })
    },
    [updateChatMeta],
  )

  const handleSaveTags = useCallback(
    (chatId: string, nextTags: string[]) => {
      const sanitised = sanitiseTagsClient(nextTags)
      setRecentChats((prev) =>
        applyMetaToList(prev, chatId, { tags: sanitised }),
      )
      setAllChats((prev) => applyMetaToList(prev, chatId, { tags: sanitised }))
      updateChatMeta(chatId, { tags: sanitised })
    },
    [updateChatMeta],
  )

  const handleRenameChat = useCallback(
    (chatId: string, name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      setRecentChats((prev) => applyMetaToList(prev, chatId, { name: trimmed }))
      setAllChats((prev) => applyMetaToList(prev, chatId, { name: trimmed }))
      if (chatId === currentChatIdRef.current) setChatTitle(trimmed)
      updateChatMeta(chatId, { name: trimmed })
    },
    [updateChatMeta],
  )

  useEffect(() => {
    if (updateMetaFetcher.state === 'idle' && updateMetaFetcher.data) {
      if (updateMetaFetcher.data.success) {
        loadRecentChats()
        loadAvailableTags()
      } else if (updateMetaFetcher.data.error) {
        toast.error(t('project.askAi.error'))
      }
    }
  }, [
    updateMetaFetcher.state,
    updateMetaFetcher.data,
    loadRecentChats,
    loadAvailableTags,
    t,
  ])

  // Debounce history search input (250ms)
  useEffect(() => {
    if (!isHistoryPanelOpen) return
    const handle = window.setTimeout(() => {
      setDebouncedHistorySearch(historySearch)
    }, 250)
    return () => window.clearTimeout(handle)
  }, [historySearch, isHistoryPanelOpen])

  useEffect(() => {
    if (!isHistoryPanelOpen) return
    const term = debouncedHistorySearch.trim()
    if (term.length === 1) return // wait for >=2 chars
    loadAllChatsWithSkip(0, {
      search: term.length >= 2 ? term : undefined,
      tag: historyTagFilter,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedHistorySearch, historyTagFilter, isHistoryPanelOpen])

  const openHistoryPanel = useCallback(() => {
    setIsHistoryPanelOpen(true)
    setHistorySearch('')
    setDebouncedHistorySearch('')
    setHistoryTagFilter(null)
    loadAvailableTags()
    loadAllChatsWithSkip(0)
  }, [loadAvailableTags, loadAllChatsWithSkip])

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
      streamingFollowUpsRef.current = null

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
              streamingToolCallsRef.current.push({
                toolName,
                args,
                timestamp: new Date().toISOString(),
              })

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
            onFollowUps: (suggestions) => {
              streamingFollowUpsRef.current = suggestions
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
                const followUps = streamingFollowUpsRef.current
                const assistantMessage: Message = {
                  id: generateMessageId(),
                  role: 'assistant',
                  content: finalContent,
                  reasoning: streamingReasoningRef.current,
                  toolCalls: streamingToolCallsRef.current,
                  parts: streamingPartsRef.current,
                  followUps:
                    followUps && followUps.length > 0 ? followUps : undefined,
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

  useEffect(() => {
    if (!speechTranscript) return
    setInput(`${baseInputRef.current}${speechTranscript}`)
  }, [speechTranscript])

  useEffect(() => {
    if (!speechError) return
    if (
      speechError === 'not-allowed' ||
      speechError === 'service-not-allowed'
    ) {
      toast.error(t('project.askAi.voicePermissionDenied'))
      setVoiceDisabled(true)
    }
  }, [speechError, t])

  const handleStartVoice = useCallback(() => {
    if (isLoading) return
    baseInputRef.current = input ? `${input.replace(/\s+$/, '')} ` : ''
    startSpeech()
  }, [input, isLoading, startSpeech])

  const handleStopVoice = useCallback(() => {
    stopSpeech()
  }, [stopSpeech])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    if (isListening) {
      stopSpeech()
    }

    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: input.trim(),
    }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    baseInputRef.current = ''

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

  const performBranch = useCallback(
    async (index: number) => {
      if (isLoading) return
      if (index < 0 || index >= messages.length) return
      if (messages[index]?.role !== 'user') return

      const truncated = messages.slice(0, index + 1)
      const sourceChatId = currentChatIdRef.current

      setMessages(truncated)
      setCurrentChatId(null)
      currentChatIdRef.current = null
      setChatTitle(null)
      setFeedbackMap({})
      pendingMessagesToSaveRef.current = null
      setStreamingMessage(null)
      setError(null)

      const newParams = new URLSearchParams(searchParams)
      newParams.delete('chat')
      setSearchParams(newParams, { replace: true })

      createChatWithMessage(truncated, {
        parentChatId: sourceChatId ?? null,
      })
      await runChatTurn(truncated)
    },
    [
      createChatWithMessage,
      isLoading,
      messages,
      runChatTurn,
      searchParams,
      setSearchParams,
    ],
  )

  const handleBranch = useCallback(
    (index: number) => {
      if (isLoading) return
      if (index < 0 || index >= messages.length) return
      if (messages[index]?.role !== 'user') return

      const hasMessagesAfter = index < messages.length - 1
      if (hasMessagesAfter) {
        setPendingBranchIndex(index)
        return
      }
      void performBranch(index)
    },
    [isLoading, messages, performBranch],
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

  const handleFollowUpClick = useCallback(
    async (prompt: string) => {
      if (isLoading) return
      const trimmed = prompt.trim()
      if (!trimmed) return

      const userMessage: Message = {
        id: generateMessageId(),
        role: 'user',
        content: trimmed,
      }
      const newMessages = [...messages, userMessage]
      setMessages(newMessages)
      setInput('')

      if (!currentChatIdRef.current) {
        createChatWithMessage(newMessages)
      }

      await runChatTurn(newMessages)
    },
    [createChatWithMessage, isLoading, messages, runChatTurn],
  )

  const handleCopyLink = () => {
    const baseUrl = window.location.origin + window.location.pathname
    const chatParam = currentChatId ? `&chat=${currentChatId}` : ''
    const link = `${baseUrl}?tab=ai${chatParam}`
    navigator.clipboard.writeText(link)
    toast.success(t('project.askAi.linkCopied'))
  }

  const exportableMessages = useMemo<ExportMessage[]>(() => {
    const list: ExportMessage[] = messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      parts: m.parts,
      toolCalls: m.toolCalls,
    }))
    if (streamingMessage) {
      list.push({
        id: streamingMessage.id,
        role: streamingMessage.role,
        content: streamingMessage.content,
        parts: streamingMessage.parts,
        toolCalls: streamingMessage.toolCalls,
      })
    }
    return list
  }, [messages, streamingMessage])

  const isExportDisabled = useMemo(() => {
    return exportableMessages.every(
      (m) =>
        !(m.content && m.content.trim()) &&
        !(m.parts && m.parts.length > 0) &&
        !(m.toolCalls && m.toolCalls.length > 0),
    )
  }, [exportableMessages])

  const handleCopyConversation = useCallback(() => {
    if (isExportDisabled) return
    const md = chatToMarkdown(exportableMessages, chatTitle, projectId, t)
    navigator.clipboard
      .writeText(md)
      .then(() => toast.success(t('project.askAi.conversationCopied')))
      .catch(() => toast.error(t('project.askAi.error')))
  }, [chatTitle, exportableMessages, isExportDisabled, projectId, t])

  const handleDownloadMarkdown = useCallback(() => {
    if (isExportDisabled) return
    const md = chatToMarkdown(exportableMessages, chatTitle, projectId, t)
    const filename = getChatExportFilename(chatTitle, currentChatId)
    downloadMarkdown(md, filename)
  }, [
    chatTitle,
    currentChatId,
    exportableMessages,
    isExportDisabled,
    projectId,
    t,
  ])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const isEmpty = _isEmpty(messages) && !streamingMessage
  const isChatActive = !isEmpty

  const formatRelativeTime = useCallback(
    (dateStr: string) => {
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
    },
    [t],
  )

  const chatRowActions = useMemo<ChatRowActions>(
    () => ({
      onOpen: handleOpenChat,
      onDelete: (chatId) => setChatToDelete(chatId),
      onTogglePin: handleTogglePin,
      onSaveTags: handleSaveTags,
      onRename: handleRenameChat,
      formatRelative: formatRelativeTime,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleTogglePin, handleSaveTags, handleRenameChat, formatRelativeTime],
  )

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
              <div className='flex min-w-0 flex-col'>
                <h2
                  className='truncate text-sm font-semibold text-gray-800 dark:text-gray-100'
                  title={chatTitle ?? undefined}
                >
                  {chatTitle ||
                    (currentChatId
                      ? t('project.askAi.untitledChat')
                      : t('project.askAi.newChat'))}
                </h2>
                {parentChat ? (
                  <button
                    type='button'
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams)
                      newParams.set('chat', parentChat.id)
                      setSearchParams(newParams)
                      loadChatById(parentChat.id)
                    }}
                    className='flex max-w-full items-center gap-1 truncate text-left text-xs text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                    title={parentChat.name ?? t('project.askAi.untitledChat')}
                  >
                    <GitBranchIcon className='h-3 w-3 shrink-0' />
                    <span className='truncate'>
                      {t('project.askAi.branchedFrom', {
                        name:
                          parentChat.name ?? t('project.askAi.untitledChat'),
                      })}
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
            <div className='flex shrink-0 items-center gap-2'>
              <button
                type='button'
                onClick={handleCopyLink}
                className='flex shrink-0 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800'
              >
                <LinkIcon className='h-4 w-4' />
                <span>{t('project.askAi.copyLink')}</span>
              </button>
              <Menu as='div' className='relative'>
                <MenuButton
                  disabled={isExportDisabled}
                  className='flex shrink-0 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800'
                  aria-label={t('project.askAi.export')}
                >
                  <ExportIcon className='h-4 w-4' />
                  <span>{t('project.askAi.export')}</span>
                  <CaretDownIcon className='h-3.5 w-3.5' />
                </MenuButton>
                <MenuItems
                  anchor={{ to: 'bottom end', offset: 8 }}
                  modal={false}
                  transition
                  className='z-50 w-56 min-w-max origin-top-right rounded-md bg-white p-1 ring-1 ring-gray-200 transition duration-100 ease-out focus:outline-hidden data-closed:scale-95 data-closed:opacity-0 dark:bg-slate-900 dark:ring-slate-800'
                >
                  <MenuItem>
                    <button
                      type='button'
                      onClick={handleCopyConversation}
                      className='flex w-full items-center gap-2 rounded-md p-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-50 dark:hover:bg-slate-800'
                    >
                      <CopyIcon className='h-4 w-4' />
                      {t('project.askAi.copyConversation')}
                    </button>
                  </MenuItem>
                  <MenuItem>
                    <button
                      type='button'
                      onClick={handleDownloadMarkdown}
                      className='flex w-full items-center gap-2 rounded-md p-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-50 dark:hover:bg-slate-800'
                    >
                      <DownloadSimpleIcon className='h-4 w-4' />
                      {t('project.askAi.downloadMarkdown')}
                    </button>
                  </MenuItem>
                </MenuItems>
              </Menu>
            </div>
          </div>
          <hr className='mt-3 border-gray-200 dark:border-slate-800' />
        </>
      ) : null}

      {error ? (
        <div className='mx-auto w-full max-w-3xl px-4 pt-4'>
          <div className='flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20'>
            <WarningCircleIcon className='h-5 w-5 shrink-0 text-red-500' />
            <Text
              as='p'
              size='sm'
              className='flex-1 text-red-700 dark:text-red-400'
            >
              {error}
            </Text>
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
                          <div className='flex items-center gap-1.5'>
                            {showVoice ? (
                              <VoiceInputButton
                                isListening={isListening}
                                isLoading={isLoading}
                                onStart={handleStartVoice}
                                onStop={handleStopVoice}
                              />
                            ) : null}
                            <button
                              type='submit'
                              disabled={!input.trim() || isLoading}
                              className='flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900'
                            >
                              <ArrowUpIcon className='h-3.5 w-3.5' />
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                    <p
                      className={cn(
                        'mt-2 text-center text-xs',
                        isListening
                          ? 'text-red-500 dark:text-red-400'
                          : 'text-gray-400 dark:text-gray-500',
                      )}
                    >
                      {isListening
                        ? t('project.askAi.listening')
                        : t('project.askAi.disclaimer')}
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
                          onBranch={() => handleBranch(idx)}
                        />
                      )
                    }
                    const isLastAssistant = idx === lastAssistantIdx
                    return (
                      <AssistantMessage
                        key={msg.id}
                        message={msg}
                        projectId={projectId}
                        onRegenerate={() => handleRegenerate(idx)}
                        onFeedback={(rating) =>
                          handleFeedback(idx, msg.id, rating)
                        }
                        feedback={feedbackMap[msg.id] ?? null}
                        canRegenerate={isLastAssistant && !isLoading}
                        followUps={
                          isLastAssistant &&
                          !isLoading &&
                          !streamingMessage &&
                          !isWaitingForResponse
                            ? msg.followUps
                            : undefined
                        }
                        onFollowUpClick={
                          isLastAssistant ? handleFollowUpClick : undefined
                        }
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
                  <AssistantMessage
                    message={streamingMessage}
                    isStreaming
                    projectId={projectId}
                  />
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
                  <div className='flex items-center gap-1.5'>
                    {showVoice && !isLoading ? (
                      <VoiceInputButton
                        isListening={isListening}
                        isLoading={isLoading}
                        onStart={handleStartVoice}
                        onStop={handleStopVoice}
                      />
                    ) : null}
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
            <p
              className={cn(
                'mt-2 text-center text-xs',
                isListening
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-gray-400 dark:text-gray-500',
              )}
            >
              {isListening
                ? t('project.askAi.listening')
                : t('project.askAi.disclaimer')}
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
              onClick={openHistoryPanel}
              className='text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            >
              {t('project.askAi.viewAll')}
            </button>
          </div>
          <ul className='mt-3 divide-y divide-gray-200/70 dark:divide-slate-800/60'>
            {_map(recentChats.slice(0, 3), (chat) => (
              <li key={chat.id}>
                <ChatRow
                  chat={chat}
                  variant='compact'
                  actions={chatRowActions}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ChatHistoryPanel
        isOpen={isHistoryPanelOpen}
        onClose={() => setIsHistoryPanelOpen(false)}
        search={historySearch}
        onSearchChange={setHistorySearch}
        tagFilter={historyTagFilter}
        onTagFilterChange={setHistoryTagFilter}
        availableTags={availableTags}
        chats={allChats}
        total={allChatsTotal}
        isLoading={isLoadingChats && allChats.length === 0}
        isFetchingMore={isLoadingChats && allChats.length > 0}
        actions={chatRowActions}
        onLoadMore={() => {
          const term = debouncedHistorySearch.trim()
          loadAllChatsWithSkip(allChats.length, {
            search: term.length >= 2 ? term : undefined,
            tag: historyTagFilter,
          })
        }}
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

      <Modal
        isOpened={pendingBranchIndex !== null}
        onClose={() => setPendingBranchIndex(null)}
        onSubmit={() => {
          if (pendingBranchIndex !== null) {
            const idx = pendingBranchIndex
            setPendingBranchIndex(null)
            void performBranch(idx)
          }
        }}
        title={t('project.askAi.branchOff')}
        message={t('project.askAi.branchOffConfirm')}
        submitText={t('project.askAi.branchOff')}
        closeText={t('common.cancel')}
      />
    </div>
  )
}

export default AskAIView
