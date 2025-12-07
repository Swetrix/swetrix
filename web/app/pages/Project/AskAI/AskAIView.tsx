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
  BarChart3Icon,
  TargetIcon,
  GitBranchIcon,
  InfoIcon,
  CheckIcon,
} from 'lucide-react'
import { marked } from 'marked'
import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import sanitizeHtml from 'sanitize-html'
import { useStickToBottom } from 'use-stick-to-bottom'

import { askAI } from '~/api'
import SwetrixLogo from '~/ui/icons/SwetrixLogo'

import AIChart from './AIChart'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  toolCalls?: Array<{ toolName: string; args: unknown; completed?: boolean }>
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

// Tool name to human-readable description
const getToolInfo = (toolName: string): { label: string; icon: React.ComponentType<{ className?: string }> } => {
  const toolMap: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    getProjectInfo: { label: 'Fetched project info', icon: InfoIcon },
    getData: { label: 'Queried analytics', icon: BarChart3Icon },
    getGoalStats: { label: 'Fetched goals', icon: TargetIcon },
    getFunnelData: { label: 'Loaded funnel', icon: GitBranchIcon },
  }
  return toolMap[toolName] || { label: toolName, icon: InfoIcon }
}

// Available tools for display
const AVAILABLE_TOOLS = [
  { id: 'getData', label: 'Query data', icon: BarChart3Icon },
  { id: 'getGoalStats', label: 'Goal stats', icon: TargetIcon },
  { id: 'getFunnelData', label: 'Funnel data', icon: GitBranchIcon },
]

const ThinkingIndicator = () => {
  return (
    <div className='flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
      <Loader2Icon className='h-4 w-4 animate-spin' />
      <span>Thinking...</span>
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
    <div className='mb-3'>
      <button
        type='button'
        onClick={onToggle}
        className='group flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
      >
        <span className='flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 dark:border-gray-600'>
          {isActivelyThinking ? (
            <Loader2Icon className='h-3 w-3 animate-spin' />
          ) : (
            <svg className='h-3 w-3' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
              <circle cx='12' cy='12' r='10' />
              <path d='M12 16v-4M12 8h.01' />
            </svg>
          )}
        </span>
        <span className='font-medium'>{isActivelyThinking ? 'Thinking...' : 'Thought'}</span>
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

// Compact tool call badge (PostHog style)
const ToolCallBadge = ({ toolName, isLoading = false }: { toolName: string; isLoading?: boolean }) => {
  const { label, icon: Icon } = getToolInfo(toolName)

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
  const { text, charts } = parseCharts(content)

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
      {/* Show tool calls as compact badges (PostHog style) */}
      {message.toolCalls && message.toolCalls.length > 0 ? (
        <div className='mb-3 flex flex-wrap gap-2'>
          {_map(message.toolCalls, (call, idx) => (
            <ToolCallBadge key={idx} toolName={call.toolName} isLoading={Boolean(isStreaming && !hasContent)} />
          ))}
        </div>
      ) : null}
      <MessageContent content={message.content} isStreaming={isStreaming} />
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

// Quick action chip component
const QuickActionChip = ({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
}) => (
  <button
    type='button'
    onClick={onClick}
    className='flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300 dark:hover:border-slate-600 dark:hover:bg-slate-700'
  >
    <Icon className='h-4 w-4' />
    <span>{label}</span>
  </button>
)

const ScrollToBottomButton = ({ isAtBottom, scrollToBottom }: { isAtBottom: boolean; scrollToBottom: () => void }) => {
  if (isAtBottom) return null

  return (
    <button
      type='button'
      onClick={scrollToBottom}
      className='absolute bottom-4 left-1/2 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition-all hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200'
      aria-label='Scroll to bottom'
    >
      <ArrowDownIcon className='h-4 w-4' />
    </button>
  )
}

// Quick actions for empty state
const QUICK_ACTIONS = [
  {
    id: 'traffic',
    label: 'Traffic overview',
    icon: BarChart3Icon,
    prompt: 'Show me traffic overview for the last 7 days',
  },
  { id: 'goals', label: 'Goals', icon: TargetIcon, prompt: 'What are my goal conversion rates?' },
  { id: 'funnels', label: 'Funnels', icon: GitBranchIcon, prompt: 'Show me funnel analysis' },
]

const AskAIView = ({ projectId }: AskAIViewProps) => {
  const { t } = useTranslation('common')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Stick to bottom hook for chat auto-scroll
  const { scrollRef, contentRef, isAtBottom, scrollToBottom } = useStickToBottom({
    resize: 'smooth',
    initial: 'smooth',
  })

  // Refs to track streaming content
  const streamingContentRef = useRef('')
  const streamingReasoningRef = useRef('')
  const streamingToolCallsRef = useRef<Array<{ toolName: string; args: unknown }>>([])

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

  const handleQuickAction = (prompt: string) => {
    setInput(prompt)
    // Focus the input after setting the prompt
    inputRef.current?.focus()
  }

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const suggestions = useMemo(() => [t('askAi.suggestion1'), t('askAi.suggestion2'), t('askAi.suggestion3')], [t])

  const isEmpty = _isEmpty(messages) && !streamingMessage

  return (
    <div className='flex h-[calc(100vh-200px)] min-h-[600px] flex-col bg-stone-50 dark:bg-slate-950'>
      {/* Error Banner */}
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
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {/* Messages Area */}
      <div className='relative flex-1 overflow-hidden'>
        <div ref={scrollRef} className='h-full overflow-y-auto'>
          <div ref={contentRef}>
            {isEmpty ? (
              <div className='flex h-full min-h-[500px] flex-col items-center justify-center px-4'>
                {/* Logo */}
                <div className='mb-6'>
                  <SwetrixLogo />
                </div>

                {/* Headline */}
                <h1 className='mb-2 text-2xl font-semibold text-gray-900 dark:text-white'>{t('askAi.welcomeTitle')}</h1>
                <p className='mb-10 text-gray-500 dark:text-gray-400'>{t('askAi.welcomeSubtitle')}</p>

                {/* Input Area (centered for empty state) */}
                <div className='w-full max-w-2xl'>
                  <div className='rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900'>
                    <form onSubmit={handleSubmit} className='relative'>
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('askAi.placeholder')}
                        disabled={isLoading}
                        rows={1}
                        className='w-full resize-none border-0 bg-transparent px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:ring-0 focus:outline-none dark:text-white dark:placeholder-gray-400'
                      />
                      <div className='flex items-center justify-between border-t border-gray-100 px-3 py-2 dark:border-slate-800'>
                        {/* Tools indicator */}
                        <div className='flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400'>
                          <span className='font-medium'>Tools:</span>
                          {_map(AVAILABLE_TOOLS, (tool) => (
                            <span key={tool.id} className='flex items-center gap-1'>
                              <tool.icon className='h-3 w-3' />
                              <span>{tool.label}</span>
                            </span>
                          ))}
                        </div>
                        {/* Submit button */}
                        <button
                          type='submit'
                          disabled={!input.trim() || isLoading}
                          className='flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700'
                        >
                          <SendIcon className='h-3.5 w-3.5' />
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className='mt-8 text-center'>
                  <p className='mb-3 text-xs font-medium text-gray-500 dark:text-gray-400'>Try Swetrix AI for...</p>
                  <div className='flex flex-wrap justify-center gap-2'>
                    {_map(QUICK_ACTIONS, (action) => (
                      <QuickActionChip
                        key={action.id}
                        label={action.label}
                        icon={action.icon}
                        onClick={() => handleQuickAction(action.prompt)}
                      />
                    ))}
                    {_map(suggestions, (suggestion, idx) => (
                      <button
                        key={idx}
                        type='button'
                        onClick={() => handleQuickAction(suggestion)}
                        className='rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300 dark:hover:border-slate-600 dark:hover:bg-slate-700'
                      >
                        {suggestion}
                      </button>
                    ))}
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

      {/* Input Area (only shown when chat has messages) */}
      {!isEmpty ? (
        <div className='border-t border-gray-200 bg-stone-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950'>
          <div className='mx-auto max-w-3xl'>
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900'>
              <form onSubmit={handleSubmit} className='relative'>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('askAi.followUpPlaceholder')}
                  disabled={isLoading}
                  rows={1}
                  className='w-full resize-none border-0 bg-transparent px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:ring-0 focus:outline-none dark:text-white dark:placeholder-gray-400'
                />
                <div className='flex items-center justify-between border-t border-gray-100 px-3 py-2 dark:border-slate-800'>
                  {/* Tools indicator */}
                  <div className='flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400'>
                    <span className='font-medium'>Tools:</span>
                    {_map(AVAILABLE_TOOLS, (tool) => (
                      <span key={tool.id} className='flex items-center gap-1'>
                        <tool.icon className='h-3 w-3' />
                        <span>{tool.label}</span>
                      </span>
                    ))}
                  </div>
                  {/* Action buttons */}
                  <div className='flex items-center gap-2'>
                    {isLoading ? (
                      <button
                        type='button'
                        onClick={handleStop}
                        className='flex h-7 items-center gap-1.5 rounded-lg bg-red-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-red-700'
                      >
                        <StopCircleIcon className='h-3.5 w-3.5' />
                        <span>Stop</span>
                      </button>
                    ) : (
                      <button
                        type='submit'
                        disabled={!input.trim()}
                        className='flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700'
                      >
                        <SendIcon className='h-3.5 w-3.5' />
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
            <p className='mt-2 text-center text-xs text-gray-400 dark:text-gray-500'>{t('askAi.disclaimer')}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AskAIView
