import _filter from 'lodash/filter'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import {
  SendIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Loader2Icon,
  StopCircleIcon,
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  BarChart3Icon,
  TargetIcon,
  GitBranchIcon,
  InfoIcon,
  CheckIcon,
  MessageSquareIcon,
  TrashIcon,
  XIcon,
  LinkIcon,
} from 'lucide-react'
import { marked } from 'marked'
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import sanitizeHtml from 'sanitize-html'
import { toast } from 'sonner'
import { useStickToBottom } from 'use-stick-to-bottom'

import {
  askAI,
  getRecentAIChats,
  getAllAIChats,
  getAIChat,
  createAIChat,
  updateAIChat,
  deleteAIChat,
  AIChatSummary,
} from '~/api'
import SwetrixLogo from '~/ui/icons/SwetrixLogo'
import Modal from '~/ui/Modal'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { cn } from '~/utils/generic'

import AIChart from './AIChart'

interface MessagePart {
  type: 'text' | 'toolCall'
  text?: string
  toolName?: string
  args?: unknown
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

const parseCharts = (content: string): { text: string; charts: any[] } => {
  const charts: any[] = []
  let text = content

  const chartStartPattern = '{"type":"chart"'
  let searchIndex = 0

  while (searchIndex < text.length) {
    const startIndex = text.indexOf(chartStartPattern, searchIndex)
    if (startIndex === -1) break

    let braceCount = 0
    let endIndex = -1

    for (let i = startIndex; i < text.length; i++) {
      if (text[i] === '{') {
        braceCount++
      } else if (text[i] === '}') {
        braceCount--
        if (braceCount === 0) {
          endIndex = i
          break
        }
      }
    }

    if (endIndex === -1) {
      searchIndex = startIndex + chartStartPattern.length
      continue
    }

    const jsonString = text.substring(startIndex, endIndex + 1)

    try {
      const chartData = JSON.parse(jsonString)
      if (chartData.type === 'chart') {
        charts.push(chartData)
        text = text.substring(0, startIndex) + text.substring(endIndex + 1)
        continue
      }
    } catch {
      // Invalid JSON, skip
    }

    searchIndex = startIndex + chartStartPattern.length
  }

  return { text: text.trim(), charts }
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
  const toolMap: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    getProjectInfo: { label: t('project.askAi.tools.getProjectInfo'), icon: InfoIcon },
    getData: { label: t('project.askAi.tools.getData'), icon: BarChart3Icon },
    getGoalStats: { label: t('project.askAi.tools.getGoalStats'), icon: TargetIcon },
    getFunnelData: { label: t('project.askAi.tools.getFunnelData'), icon: GitBranchIcon },
  }
  return toolMap[toolName] || { label: toolName, icon: InfoIcon }
}

const getAvailableTools = (t: any) => [
  { id: 'getData', label: t('project.askAi.tools.queryData'), icon: BarChart3Icon },
  { id: 'getGoalStats', label: t('project.askAi.tools.goalStats'), icon: TargetIcon },
  { id: 'getFunnelData', label: t('project.askAi.tools.funnelData'), icon: GitBranchIcon },
]

const ToolsTooltip = () => {
  const { t } = useTranslation('common')
  const AVAILABLE_TOOLS = getAvailableTools(t)
  return (
    <div className='space-y-1.5 py-1'>
      {_map(AVAILABLE_TOOLS, (tool) => (
        <div key={tool.id} className='flex items-center gap-2 text-gray-200'>
          <tool.icon className='h-3.5 w-3.5 text-green-400' />
          <span>{tool.label}</span>
        </div>
      ))}
    </div>
  )
}

const ToolsIndicator = () => {
  const { t } = useTranslation('common')
  const AVAILABLE_TOOLS = getAvailableTools(t)
  return (
    <Tooltip
      text={<ToolsTooltip />}
      tooltipNode={
        <span className='flex cursor-help items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-300'>
          {t('project.askAi.tools.count', { count: AVAILABLE_TOOLS.length })}
        </span>
      }
    />
  )
}

const AICapabilitiesTooltip = () => {
  const { t } = useTranslation('common')

  return (
    <div className='max-w-sm space-y-3 py-1 text-left'>
      <div>
        <p className='mb-1.5 font-semibold text-white'>{t('project.askAi.capabilities.title')}</p>
        <ul className='space-y-1 text-gray-300'>
          <li className='flex items-start gap-1.5'>
            <BarChart3Icon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400' />
            <span>
              <strong className='text-white'>{t('project.askAi.capabilities.queryAnalytics')}</strong>
            </span>
          </li>
          <li className='flex items-start gap-1.5'>
            <TargetIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400' />
            <span>
              <strong className='text-white'>{t('project.askAi.capabilities.goalStatistics')}</strong>
            </span>
          </li>
          <li className='flex items-start gap-1.5'>
            <GitBranchIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400' />
            <span>
              <strong className='text-white'>{t('project.askAi.capabilities.funnelAnalysis')}</strong>
            </span>
          </li>
          <li className='flex items-start gap-1.5'>
            <BarChart3Icon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400' />
            <span>
              <strong className='text-white'>{t('project.askAi.capabilities.performanceMetrics')}</strong>
            </span>
          </li>
          <li className='flex items-start gap-1.5'>
            <AlertCircleIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400' />
            <span>
              <strong className='text-white'>{t('project.askAi.capabilities.errorTracking')}</strong>
            </span>
          </li>
          <li className='flex items-start gap-1.5'>
            <InfoIcon className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400' />
            <span>{t('project.askAi.capabilities.trafficPatterns')}</span>
          </li>
        </ul>
      </div>
      <div>
        <p className='mb-1.5 font-semibold text-white'>{t('project.askAi.capabilities.cannotTitle')}</p>
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
      <Loader2Icon className='h-4 w-4 animate-spin' />
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
        <span className='flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 dark:border-gray-600'>
          {isActivelyThinking ? (
            <Loader2Icon className='h-3 w-3 animate-spin' />
          ) : (
            <svg className='h-3 w-3' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
              <circle cx='12' cy='12' r='10' />
              <path d='M12 16v-4M12 8h.01' />
            </svg>
          )}
        </span>
        <span className='font-medium'>
          {isActivelyThinking ? t('project.askAi.thinking') : t('project.askAi.thought')}
        </span>
        {!isActivelyThinking ? (
          isExpanded ? (
            <ChevronDownIcon className='h-3.5 w-3.5' />
          ) : (
            <ChevronRightIcon className='h-3.5 w-3.5' />
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

const ToolCallBadge = ({ toolName, isLoading = false }: { toolName: string; isLoading?: boolean }) => {
  const { t } = useTranslation('common')

  const { label, icon: Icon } = getToolInfo(toolName, t)

  return (
    <span className='inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-slate-800 dark:text-gray-300'>
      <Icon className='h-3.5 w-3.5' />
      <span>{label}</span>
      {isLoading ? (
        <Loader2Icon className='h-3 w-3 animate-spin text-gray-500' />
      ) : (
        <CheckIcon className='h-3 w-3 text-green-600 dark:text-green-400' />
      )}
    </span>
  )
}

const MessageContent = ({ content, isStreaming }: { content: string; isStreaming?: boolean }) => {
  const { text, charts } = useMemo(() => parseCharts(content), [content])

  return (
    <>
      {text ? (
        <div
          className='prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:my-2 prose-ol:my-2 prose-ul:my-2 prose-li:my-0.5 prose-table:text-sm'
          dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
        />
      ) : null}
      {isStreaming && !text ? <span className='ml-1 inline-block h-4 w-0.5 animate-pulse bg-gray-400' /> : null}
      {!_isEmpty(charts) ? (
        <div className='mt-4 space-y-4'>
          {_map(charts, (chart, idx) => (
            <AIChart key={idx} chart={chart} />
          ))}
        </div>
      ) : null}
    </>
  )
}

const AssistantMessage = ({ message, isStreaming }: { message: Message; isStreaming?: boolean }) => {
  const [userToggled, setUserToggled] = useState(false)
  const [userExpandedState, setUserExpandedState] = useState(false)
  const hasContent = Boolean(message.content && message.content.trim())

  const isActivelyThinking = Boolean(isStreaming && message.reasoning && !hasContent)
  const isThoughtExpanded = userToggled ? userExpandedState : isActivelyThinking

  const handleToggle = () => {
    setUserToggled(true)
    setUserExpandedState(!isThoughtExpanded)
  }

  // If we have parts, render them in sequence; otherwise fall back to old behavior
  const hasParts = message.parts && message.parts.length > 0

  // Determine if a tool call is still loading (it's the last part and we're streaming with no content after it)
  const isToolCallLoading = (partIndex: number) => {
    if (!isStreaming || !message.parts) return false
    const isLastPart = partIndex === message.parts.length - 1
    const part = message.parts[partIndex]
    if (part.type !== 'toolCall') return false
    // Check if there's any text content after this tool call
    const hasTextAfter = message.parts.slice(partIndex + 1).some((p) => p.type === 'text' && p.text?.trim())
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
        // Render parts in sequence
        <>
          {_map(message.parts, (part, idx) => {
            if (part.type === 'text' && part.text) {
              const isLastTextPart =
                idx === message.parts!.length - 1 ||
                !message.parts!.slice(idx + 1).some((p) => p.type === 'text' && p.text?.trim())
              return (
                <div key={idx} className='mb-3'>
                  <MessageContent content={part.text} isStreaming={isStreaming ? isLastTextPart : undefined} />
                </div>
              )
            }
            if (part.type === 'toolCall' && part.toolName) {
              return (
                <div key={idx} className='mb-3'>
                  <ToolCallBadge toolName={part.toolName} isLoading={isToolCallLoading(idx)} />
                </div>
              )
            }
            return null
          })}
        </>
      ) : (
        // Fall back to old behavior for messages without parts (e.g., loaded from saved chats)
        <>
          {message.toolCalls && message.toolCalls.length > 0 ? (
            <div className='mb-3 flex flex-wrap gap-2'>
              {_map(message.toolCalls, (call, idx) => (
                <ToolCallBadge key={idx} toolName={call.toolName} isLoading={Boolean(isStreaming && !hasContent)} />
              ))}
            </div>
          ) : null}
          <MessageContent content={message.content} isStreaming={isStreaming} />
        </>
      )}
    </div>
  )
}

const UserMessage = ({ content }: { content: string }) => {
  return (
    <div className='flex justify-end'>
      <div className='max-w-[85%] rounded-2xl bg-gray-900 px-4 py-2.5 text-white dark:bg-gray-700'>
        <p className='text-sm'>{content}</p>
      </div>
    </div>
  )
}

const ScrollToBottomButton = ({ isAtBottom, scrollToBottom }: { isAtBottom: boolean; scrollToBottom: () => void }) => {
  const { t } = useTranslation('common')

  if (isAtBottom) return null

  return (
    <button
      type='button'
      onClick={scrollToBottom}
      className='absolute bottom-4 left-1/2 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-all hover:bg-gray-50 dark:border-slate-800/50 dark:bg-slate-800 dark:text-gray-200 hover:dark:bg-slate-700'
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
  const [recentChats, setRecentChats] = useState<AIChatSummary[]>([])
  const [allChats, setAllChats] = useState<AIChatSummary[]>([])
  const [allChatsTotal, setAllChatsTotal] = useState(0)
  const [isLoadingChats, setIsLoadingChats] = useState(false)
  const [isViewAllModalOpen, setIsViewAllModalOpen] = useState(false)
  const [chatToDelete, setChatToDelete] = useState<string | null>(null)
  const hasInitializedRef = useRef(false)

  const { scrollRef, contentRef, isAtBottom, scrollToBottom } = useStickToBottom({
    resize: 'smooth',
    initial: 'smooth',
  })

  const streamingContentRef = useRef('')
  const streamingReasoningRef = useRef('')
  const streamingToolCallsRef = useRef<Array<{ toolName: string; args: unknown }>>([])
  const streamingPartsRef = useRef<MessagePart[]>([])
  const currentTextPartRef = useRef('')

  const generateMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const loadRecentChats = useCallback(async () => {
    try {
      const chats = await getRecentAIChats(projectId, 3)
      setRecentChats(chats)
    } catch (err) {
      console.error('Failed to load recent chats:', err)
    }
  }, [projectId])

  const loadAllChats = useCallback(
    async (skip: number = 0) => {
      setIsLoadingChats(true)
      try {
        const result = await getAllAIChats(projectId, skip, 20)
        if (skip === 0) {
          setAllChats(result.chats)
        } else {
          setAllChats((prev) => [...prev, ...result.chats])
        }
        setAllChatsTotal(result.total)
      } catch (err) {
        console.error('Failed to load all chats:', err)
      } finally {
        setIsLoadingChats(false)
      }
    },
    [projectId],
  )

  const loadChat = useCallback(
    async (chatId: string) => {
      try {
        const chat = await getAIChat(projectId, chatId)
        setMessages(
          chat.messages.map((m) => ({
            id: generateMessageId(),
            role: m.role,
            content: m.content,
          })),
        )
        setCurrentChatId(chatId)
      } catch (err) {
        console.error('Failed to load chat:', err)
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('chat')
        setSearchParams(newParams)
      }
    },
    [projectId, searchParams, setSearchParams],
  )

  const saveChat = useCallback(
    async (messagesToSave: Message[]) => {
      const apiMessages = messagesToSave
        .filter((m) => m.content.trim().length > 0)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }))

      if (apiMessages.length === 0) return

      try {
        if (currentChatId) {
          const result = await updateAIChat(projectId, currentChatId, { messages: apiMessages })

          // If the chat was branched (user didn't own the original), update to the new chat ID
          if (result.branched) {
            setCurrentChatId(result.id)
            const newParams = new URLSearchParams(searchParams)
            newParams.set('chat', result.id)
            setSearchParams(newParams, { replace: true })
          }
        } else {
          const chat = await createAIChat(projectId, apiMessages)
          setCurrentChatId(chat.id)
          const newParams = new URLSearchParams(searchParams)
          newParams.set('chat', chat.id)
          setSearchParams(newParams, { replace: true })
        }
        loadRecentChats()
      } catch (err) {
        console.error('Failed to save chat:', err)
      }
    },
    [projectId, currentChatId, searchParams, setSearchParams, loadRecentChats],
  )

  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    const chatId = searchParams.get('chat')
    if (chatId) {
      loadChat(chatId)
    }
    loadRecentChats()
  }, [searchParams, loadChat, loadRecentChats])

  const handleNewChat = () => {
    setMessages([])
    setCurrentChatId(null)
    setStreamingMessage(null)
    setError(null)
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('chat')
    setSearchParams(newParams)
  }

  const handleOpenChat = (chatId: string) => {
    setIsViewAllModalOpen(false)
    loadChat(chatId)
    const newParams = new URLSearchParams(searchParams)
    newParams.set('chat', chatId)
    setSearchParams(newParams)
  }

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteAIChat(projectId, chatId)
      toast.success(t('project.askAi.chatDeleted'))

      if (chatId === currentChatId) {
        handleNewChat()
      }

      loadRecentChats()
      if (isViewAllModalOpen) {
        loadAllChats(0)
      }
    } catch (err) {
      console.error('Failed to delete chat:', err)
    } finally {
      setChatToDelete(null)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    setError(null)
    const userMessage: Message = { id: generateMessageId(), role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
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

      const messagesToSend = _filter(newMessages, (msg) => msg.content.trim().length > 0).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      await askAI(
        projectId,
        messagesToSend,
        timezone,
        {
          onText: (chunk) => {
            setIsWaitingForResponse(false)
            streamingContentRef.current += chunk
            currentTextPartRef.current += chunk

            // Build current parts for display: completed parts + current text being streamed
            const displayParts = [...streamingPartsRef.current]
            if (currentTextPartRef.current) {
              displayParts.push({ type: 'text', text: currentTextPartRef.current })
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

            // Save current accumulated text as a part before adding tool call
            if (currentTextPartRef.current.trim()) {
              streamingPartsRef.current.push({ type: 'text', text: currentTextPartRef.current })
              currentTextPartRef.current = ''
            }
            // Add tool call as a part
            streamingPartsRef.current.push({ type: 'toolCall', toolName, args })

            setStreamingMessage((prev) =>
              prev
                ? { ...prev, toolCalls: [...streamingToolCallsRef.current], parts: [...streamingPartsRef.current] }
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

            // Finalize parts: add any remaining text
            if (currentTextPartRef.current.trim()) {
              streamingPartsRef.current.push({ type: 'text', text: currentTextPartRef.current })
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
                saveChat(updatedMessages)
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
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
      setIsWaitingForResponse(false)
      const finalContent = streamingContentRef.current

      // Finalize parts: add any remaining text
      if (currentTextPartRef.current.trim()) {
        streamingPartsRef.current.push({ type: 'text', text: currentTextPartRef.current })
      }

      if (finalContent.trim()) {
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
          saveChat(updatedMessages)
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
    if (diffMins < 60) return t('project.askAi.timeFormat.minutes', { count: diffMins })
    if (diffHours < 24) return t('project.askAi.timeFormat.hours', { count: diffHours })
    if (diffDays < 7) return t('project.askAi.timeFormat.days', { count: diffDays })
    return date.toLocaleDateString()
  }

  return (
    <div className='flex h-[calc(100vh-140px)] min-h-[600px] flex-col bg-gray-50 dark:bg-slate-900'>
      {isChatActive ? (
        <>
          <div className='mx-auto flex w-full max-w-3xl items-center justify-between'>
            <button
              type='button'
              onClick={handleNewChat}
              className='flex items-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-200 hover:bg-white hover:text-gray-900 dark:text-gray-400 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-white'
              aria-label={t('project.askAi.newChat')}
            >
              <ArrowLeftIcon className='h-4 w-4' />
            </button>
            <button
              type='button'
              onClick={handleCopyLink}
              className='flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700'
            >
              <LinkIcon className='h-4 w-4' />
              <span>{t('project.askAi.copyLink')}</span>
            </button>
          </div>
          <hr className='mt-3 border-gray-200 dark:border-gray-600' />
        </>
      ) : null}

      {error ? (
        <div className='mx-auto w-full max-w-3xl px-4 pt-4'>
          <div className='flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20'>
            <AlertCircleIcon className='h-5 w-5 shrink-0 text-red-500' />
            <p className='flex-1 text-sm text-red-700 dark:text-red-400'>{error}</p>
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

                  <Text as='h1' size='2xl' weight='semibold' colour='primary' className='mb-2'>
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
                        className='relative rounded-md border border-gray-200 bg-gray-50 p-2 transition-colors ring-inset hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:border-slate-700/80 dark:bg-slate-900 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
                      >
                        <Text as='span' size='sm'>
                          {prompt}
                        </Text>
                      </button>
                    ))}
                  </div>

                  <div className='w-full max-w-2xl'>
                    <div className='rounded-lg border border-gray-200 bg-white dark:border-slate-800/60 dark:bg-slate-800/25'>
                      <form onSubmit={handleSubmit} className='relative'>
                        <textarea
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={t('project.askAi.placeholder')}
                          disabled={isLoading}
                          rows={1}
                          className='w-full resize-none border-0 bg-transparent px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:ring-0 focus:outline-none dark:text-white dark:placeholder-gray-400'
                        />
                        <div className='flex items-center justify-between border-t border-gray-100 px-3 py-2 dark:border-slate-800'>
                          <div className='flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400'>
                            <Tooltip
                              text={<AICapabilitiesTooltip />}
                              tooltipNode={
                                <InfoIcon className='h-4 w-4 cursor-help text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300' />
                              }
                            />
                            <ToolsIndicator />
                          </div>
                          <button
                            type='submit'
                            disabled={!input.trim() || isLoading}
                            className='flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800/50 dark:bg-slate-800 dark:text-gray-200 hover:dark:bg-slate-700'
                          >
                            <SendIcon className='h-3.5 w-3.5' />
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
              <div className='mx-auto max-w-3xl space-y-6 px-4 py-6'>
                {_map(messages, (msg) =>
                  msg.role === 'user' ? (
                    <UserMessage key={msg.id} content={msg.content} />
                  ) : (
                    <AssistantMessage key={msg.id} message={msg} />
                  ),
                )}
                {isWaitingForResponse ? (
                  <div className='py-2'>
                    <ThinkingIndicator />
                  </div>
                ) : null}
                {streamingMessage ? <AssistantMessage message={streamingMessage} isStreaming /> : null}
              </div>
            )}
          </div>
        </div>
        <ScrollToBottomButton isAtBottom={isAtBottom} scrollToBottom={scrollToBottom} />
      </div>

      {!isEmpty ? (
        <div className='border-t border-gray-200 bg-gray-50 px-4 py-4 dark:border-slate-800/60 dark:bg-slate-900'>
          <div className='mx-auto max-w-3xl'>
            <div className='rounded-lg border border-gray-200 bg-white dark:border-slate-800/60 dark:bg-slate-800/25'>
              <form onSubmit={handleSubmit} className='relative'>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('project.askAi.followUpPlaceholder')}
                  disabled={isLoading}
                  rows={1}
                  className='w-full resize-none border-0 bg-transparent px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:ring-0 focus:outline-none dark:text-white dark:placeholder-gray-400'
                />
                <div className='flex items-center justify-between border-t border-gray-100 px-3 py-2 dark:border-slate-800'>
                  <div className='flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400'>
                    <Tooltip
                      text={<AICapabilitiesTooltip />}
                      tooltipNode={
                        <InfoIcon className='h-4 w-4 cursor-help text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300' />
                      }
                    />
                    <ToolsIndicator />
                  </div>
                  <div className='flex items-center gap-2'>
                    {isLoading ? (
                      <button
                        type='button'
                        onClick={handleStop}
                        className='flex h-7 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-2.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800/50 dark:bg-slate-800 dark:text-red-400 hover:dark:bg-red-900/20'
                      >
                        <StopCircleIcon className='h-3.5 w-3.5' />
                        <span>{t('project.askAi.stop')}</span>
                      </button>
                    ) : (
                      <button
                        type='submit'
                        disabled={!input.trim()}
                        className='flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800/50 dark:bg-slate-800 dark:text-gray-200 hover:dark:bg-slate-700'
                      >
                        <SendIcon className='h-3.5 w-3.5' />
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
            <p className='mt-2 text-center text-xs text-gray-400 dark:text-gray-500'>{t('project.askAi.disclaimer')}</p>
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
                loadAllChats(0)
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
                <Text as='span' size='sm' weight='medium' truncate className='group-hover:underline'>
                  {chat.name || t('project.askAi.newChat')}
                </Text>
                <Text as='span' size='sm' weight='medium' colour='muted' className='ml-4 shrink-0'>
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
              <p className='py-8 text-center text-gray-500 dark:text-gray-400'>{t('project.askAi.noChats')}</p>
            ) : (
              <div className='space-y-2'>
                {_map(allChats, (chat) => (
                  <div
                    key={chat.id}
                    className='flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50 dark:border-slate-800/60 dark:bg-slate-800/25 hover:dark:bg-slate-700'
                  >
                    <button
                      type='button'
                      onClick={() => handleOpenChat(chat.id)}
                      className='flex flex-1 items-center gap-3 overflow-hidden text-left'
                    >
                      <MessageSquareIcon className='h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500' />
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
                    onClick={() => loadAllChats(allChats.length)}
                    disabled={isLoadingChats}
                    className='flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-slate-800/50 dark:bg-slate-800 dark:text-gray-200 hover:dark:bg-slate-700'
                  >
                    {isLoadingChats ? <Loader2Icon className='h-4 w-4 animate-spin' /> : null}
                    {t('project.askAi.loadMore')}
                  </button>
                ) : null}
              </div>
            )}
            {isLoadingChats && _isEmpty(allChats) ? (
              <div className='flex items-center justify-center py-8'>
                <Loader2Icon className='h-6 w-6 animate-spin text-gray-400' />
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
