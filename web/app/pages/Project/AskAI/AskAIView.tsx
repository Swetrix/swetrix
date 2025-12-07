import _filter from 'lodash/filter'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import {
  SendIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Loader2Icon,
  StopCircleIcon,
  AlertCircleIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  RotateCcwIcon,
} from 'lucide-react'
import { marked } from 'marked'
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import sanitizeHtml from 'sanitize-html'

import { askAI } from '~/api'

import AIChart from './AIChart'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  toolCalls?: Array<{ toolName: string; args: unknown }>
}

interface AskAIViewProps {
  projectId: string
}

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
})

// Parse chart JSON from AI response
const parseCharts = (content: string): { text: string; charts: any[] } => {
  const chartRegex = /\{"type":"chart"[^}]+\}/g
  const charts: any[] = []
  let text = content

  const matches = content.match(chartRegex)
  if (matches) {
    for (const match of matches) {
      try {
        const chartData = JSON.parse(match)
        if (chartData.type === 'chart') {
          charts.push(chartData)
          text = text.replace(match, '')
        }
      } catch {
        // Not valid JSON, keep as text
      }
    }
  }

  return { text: text.trim(), charts }
}

// Render markdown safely
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
  })
}

// Thinking messages that rotate
const THINKING_MESSAGES = [
  'Thinking...',
  'Analyzing data...',
  'Processing...',
  'Querying analytics...',
  'Crunching numbers...',
  'Gathering insights...',
]

// Tool name to human-readable description
const getToolDescription = (toolName: string): string => {
  const descriptions: Record<string, string> = {
    getProjectInfo: 'Getting project information',
    getData: 'Querying analytics data',
    getGoalStats: 'Fetching goal statistics',
    getFunnelData: 'Loading funnel data',
  }
  return descriptions[toolName] || `Running ${toolName}`
}

const ThinkingIndicator = () => {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % THINKING_MESSAGES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className='flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
      <Loader2Icon className='h-4 w-4 animate-spin' />
      <span>{THINKING_MESSAGES[messageIndex]}</span>
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
  // Show thinking indicator while streaming and collecting reasoning (before content appears)
  const isActivelyThinking = isStreaming && reasoning && !hasContent

  if (!reasoning) return null

  return (
    <div className='mb-2'>
      <button
        type='button'
        onClick={onToggle}
        className='flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
      >
        {isActivelyThinking ? (
          <>
            <Loader2Icon className='h-3.5 w-3.5 animate-spin' />
            <span>Thinking...</span>
          </>
        ) : (
          <>
            <svg className='h-3.5 w-3.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <circle cx='12' cy='12' r='10' />
              <path d='M12 16v-4M12 8h.01' />
            </svg>
            <span>Thought</span>
            {isExpanded ? <ChevronDownIcon className='h-3.5 w-3.5' /> : <ChevronRightIcon className='h-3.5 w-3.5' />}
          </>
        )}
      </button>
      {isExpanded || isActivelyThinking ? (
        <div className='mt-2 border-l-2 border-gray-200 pl-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400'>
          <div className='whitespace-pre-wrap'>{reasoning}</div>
        </div>
      ) : null}
    </div>
  )
}

const ToolCallMessage = ({ toolName, args }: { toolName: string; args: unknown }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className='my-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50'>
      <button
        type='button'
        onClick={() => setIsExpanded(!isExpanded)}
        className='flex w-full items-center gap-2 text-left text-sm text-gray-600 dark:text-gray-400'
      >
        <span className='flex h-5 w-5 items-center justify-center rounded bg-indigo-100 text-xs dark:bg-indigo-900/50'>
          🔧
        </span>
        <span className='font-medium'>{getToolDescription(toolName)}</span>
        {isExpanded ? (
          <ChevronDownIcon className='ml-auto h-4 w-4' />
        ) : (
          <ChevronRightIcon className='ml-auto h-4 w-4' />
        )}
      </button>
      {isExpanded && args ? (
        <div className='mt-2 overflow-x-auto rounded bg-gray-100 p-2 text-xs dark:bg-slate-900'>
          <pre className='text-gray-600 dark:text-gray-400'>{JSON.stringify(args, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  )
}

const MessageContent = ({ content, isStreaming }: { content: string; isStreaming?: boolean }) => {
  const { text, charts } = parseCharts(content)

  return (
    <>
      {text ? (
        <div
          className='prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ol:my-2 prose-ul:my-2 prose-li:my-0.5 prose-table:text-sm'
          dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
        />
      ) : null}
      {isStreaming ? <span className='ml-1 inline-block h-4 w-0.5 animate-pulse bg-gray-400' /> : null}
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

const AssistantMessage = ({
  message,
  isStreaming,
  onRegenerate,
}: {
  message: Message
  isStreaming?: boolean
  onRegenerate?: () => void
}) => {
  // Track if user has manually toggled the thought section
  const [userToggled, setUserToggled] = useState(false)
  const [userExpandedState, setUserExpandedState] = useState(false)
  const hasContent = Boolean(message.content && message.content.trim())

  // Determine if thought should be expanded:
  // - If user has manually toggled, use their preference
  // - Otherwise, auto-expand while actively thinking (streaming + reasoning + no content yet)
  const isActivelyThinking = Boolean(isStreaming && message.reasoning && !hasContent)
  const isThoughtExpanded = userToggled ? userExpandedState : isActivelyThinking

  const handleToggle = () => {
    setUserToggled(true)
    setUserExpandedState(!isThoughtExpanded)
  }

  return (
    <div className='group'>
      {/* Show reasoning/thinking in collapsible section */}
      <ThoughtProcess
        reasoning={message.reasoning}
        isStreaming={isStreaming}
        hasContent={hasContent}
        isExpanded={isThoughtExpanded}
        onToggle={handleToggle}
      />
      {/* Show tool calls as separate styled messages */}
      {message.toolCalls && message.toolCalls.length > 0 ? (
        <div className='mb-3'>
          {_map(message.toolCalls, (call, idx) => (
            <ToolCallMessage key={idx} toolName={call.toolName} args={call.args} />
          ))}
        </div>
      ) : null}
      <MessageContent content={message.content} isStreaming={isStreaming} />
      {!isStreaming && message.content ? (
        <div className='mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100'>
          <button
            type='button'
            className='rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300'
            title='Good response'
          >
            <ThumbsUpIcon className='h-4 w-4' />
          </button>
          <button
            type='button'
            className='rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300'
            title='Bad response'
          >
            <ThumbsDownIcon className='h-4 w-4' />
          </button>
          {onRegenerate ? (
            <button
              type='button'
              onClick={onRegenerate}
              className='rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300'
              title='Regenerate response'
            >
              <RotateCcwIcon className='h-4 w-4' />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const UserMessage = ({ content }: { content: string }) => {
  return (
    <div className='flex justify-end'>
      <div className='max-w-[85%] rounded-2xl bg-indigo-600 px-4 py-2.5 text-white'>
        <p className='text-sm'>{content}</p>
      </div>
    </div>
  )
}

const AskAIView = ({ projectId }: AskAIViewProps) => {
  const { t } = useTranslation('common')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null)
  const [error, setError] = useState<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Refs to track streaming content
  const streamingContentRef = useRef('')
  const streamingReasoningRef = useRef('')
  const streamingToolCallsRef = useRef<Array<{ toolName: string; args: unknown }>>([])

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [])

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const generateMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

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

    // Reset streaming refs
    streamingContentRef.current = ''
    streamingReasoningRef.current = ''
    streamingToolCallsRef.current = []

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      // Filter out messages with empty content and convert to API format
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
            setStreamingMessage({
              id: generateMessageId(),
              role: 'assistant',
              content: streamingContentRef.current,
              reasoning: streamingReasoningRef.current,
              toolCalls: [...streamingToolCallsRef.current],
            })
          },
          onToolCall: (toolName, args) => {
            setIsWaitingForResponse(false)
            streamingToolCallsRef.current.push({ toolName, args })
            setStreamingMessage((prev) =>
              prev
                ? { ...prev, toolCalls: [...streamingToolCallsRef.current] }
                : {
                    id: generateMessageId(),
                    role: 'assistant',
                    content: '',
                    toolCalls: [...streamingToolCallsRef.current],
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
            if (finalContent.trim() || streamingToolCallsRef.current.length > 0) {
              setMessages((prev) => [
                ...prev,
                {
                  id: generateMessageId(),
                  role: 'assistant',
                  content: finalContent,
                  reasoning: streamingReasoningRef.current,
                  toolCalls: streamingToolCallsRef.current,
                },
              ])
            }
            setStreamingMessage(null)
            setIsLoading(false)
            setIsWaitingForResponse(false)
          },
          onError: (err) => {
            console.error('AI chat error:', err)
            setError(err.message || t('askAi.error'))
            setStreamingMessage(null)
            setIsLoading(false)
            setIsWaitingForResponse(false)
          },
        },
        abortControllerRef.current.signal,
      )
    } catch (err) {
      console.error('AI chat error:', err)
      setError((err as Error).message || t('askAi.error'))
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
      if (finalContent.trim()) {
        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId(),
            role: 'assistant',
            content: finalContent,
            reasoning: streamingReasoningRef.current,
            toolCalls: streamingToolCallsRef.current,
          },
        ])
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

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const suggestions = useMemo(() => [t('askAi.suggestion1'), t('askAi.suggestion2'), t('askAi.suggestion3')], [t])

  return (
    <div className='flex h-[calc(100vh-200px)] min-h-[600px] flex-col'>
      {/* Error Banner */}
      {error ? (
        <div className='mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20'>
          <AlertCircleIcon className='h-5 w-5 shrink-0 text-red-500' />
          <p className='flex-1 text-sm text-red-700 dark:text-red-400'>{error}</p>
          <button
            type='button'
            onClick={() => setError(null)}
            className='text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300'
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Messages Area */}
      <div ref={messagesContainerRef} className='flex-1 overflow-y-auto'>
        {_isEmpty(messages) && !streamingMessage ? (
          <div className='flex h-full flex-col items-center justify-center px-4'>
            <div className='mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-violet-500/10 to-purple-600/10'>
              <SparklesIcon className='h-8 w-8 text-violet-600 dark:text-violet-400' />
            </div>
            <h2 className='mb-2 text-xl font-semibold text-gray-900 dark:text-white'>{t('askAi.welcomeTitle')}</h2>
            <p className='mb-8 max-w-lg text-center text-gray-500 dark:text-gray-400'>
              {t('askAi.welcomeDescription')}
            </p>
            <div className='flex flex-wrap justify-center gap-2'>
              {_map(suggestions, (suggestion, idx) => (
                <button
                  key={idx}
                  type='button'
                  onClick={() => setInput(suggestion)}
                  className='rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:shadow dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300 dark:hover:border-slate-600'
                >
                  {suggestion}
                </button>
              ))}
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

      {/* Input Area */}
      <div className='border-t border-gray-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900'>
        <div className='mx-auto max-w-3xl'>
          <form onSubmit={handleSubmit} className='relative'>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('askAi.placeholder')}
              disabled={isLoading}
              rows={1}
              className='w-full resize-none rounded-xl border border-gray-300 bg-white py-3 pr-12 pl-4 text-sm text-gray-900 placeholder-gray-500 shadow-sm transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-400 dark:focus:border-indigo-400 dark:focus:ring-indigo-400'
            />
            <div className='absolute right-2 bottom-2'>
              {isLoading ? (
                <button
                  type='button'
                  onClick={handleStop}
                  className='flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white transition-colors hover:bg-red-700'
                >
                  <StopCircleIcon className='h-4 w-4' />
                </button>
              ) : (
                <button
                  type='submit'
                  disabled={!input.trim()}
                  className='flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  <SendIcon className='h-4 w-4' />
                </button>
              )}
            </div>
          </form>
          <p className='mt-2 text-center text-xs text-gray-400 dark:text-gray-500'>{t('askAi.disclaimer')}</p>
        </div>
      </div>
    </div>
  )
}

export default AskAIView
