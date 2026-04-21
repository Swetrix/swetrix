import type { TFunction } from 'i18next'

import { parseSegments } from './contentSegments'

export interface ExportMessagePart {
  type: 'text' | 'toolCall'
  text?: string
  toolName?: string
  args?: unknown
}

export interface ExportMessageToolCall {
  toolName: string
  args?: unknown
  timestamp?: string
}

export interface ExportMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  parts?: ExportMessagePart[]
  toolCalls?: ExportMessageToolCall[]
}

const TOOL_LABEL_KEYS: Record<string, string> = {
  getProjectInfo: 'project.askAi.tools.getProjectInfo',
  getData: 'project.askAi.tools.getData',
  getGoalStats: 'project.askAi.tools.getGoalStats',
  getFunnelData: 'project.askAi.tools.getFunnelData',
  getFeatureFlagStats: 'project.askAi.tools.getFeatureFlagStats',
  getExperimentResults: 'project.askAi.tools.getExperimentResults',
  getSessionsList: 'project.askAi.tools.getSessionsList',
  getProfilesOverview: 'project.askAi.tools.getProfilesOverview',
}

const getToolLabel = (toolName: string, t?: TFunction): string => {
  const key = TOOL_LABEL_KEYS[toolName]
  if (!key || !t) return toolName
  return t(key, { defaultValue: toolName })
}

const getChartLabel = (chart: any): string => {
  if (chart && typeof chart === 'object') {
    if (typeof chart.title === 'string' && chart.title.trim()) {
      return chart.title.trim()
    }
    if (typeof chart.chartType === 'string' && chart.chartType.trim()) {
      return chart.chartType.trim()
    }
  }
  return 'chart'
}

const renderTextWithCharts = (text: string): string => {
  const segments = parseSegments(text)
  if (segments.length === 0) return text.trim()

  const out: string[] = []
  for (const segment of segments) {
    if (segment.kind === 'text') {
      const trimmed = segment.text.trim()
      if (trimmed) out.push(trimmed)
    } else if (segment.kind === 'chart') {
      if (segment.chart) {
        const label = getChartLabel(segment.chart)
        const json = JSON.stringify(segment.chart, null, 2)
        out.push(`_[Chart: ${label}]_\n\n\`\`\`json\n${json}\n\`\`\``)
      } else {
        out.push('_[Chart: pending]_')
      }
    }
  }
  return out.join('\n\n')
}

const renderAssistantMessage = (
  message: ExportMessage,
  t?: TFunction,
): string => {
  const blocks: string[] = []

  if (message.parts && message.parts.length > 0) {
    for (const part of message.parts) {
      if (part.type === 'text' && part.text) {
        const rendered = renderTextWithCharts(part.text)
        if (rendered) blocks.push(rendered)
      } else if (part.type === 'toolCall' && part.toolName) {
        blocks.push(`_[Used: ${getToolLabel(part.toolName, t)}]_`)
      }
    }
  } else {
    if (message.content) {
      const rendered = renderTextWithCharts(message.content)
      if (rendered) blocks.push(rendered)
    }
    if (message.toolCalls && message.toolCalls.length > 0) {
      const list = message.toolCalls
        .map((tc) => `- ${getToolLabel(tc.toolName, t)}`)
        .join('\n')
      blocks.push(`**Tools used:**\n${list}`)
    }
  }

  return blocks.join('\n\n')
}

const renderUserMessage = (message: ExportMessage): string => {
  return (message.content || '').trim()
}

export const chatToMarkdown = (
  messages: ExportMessage[],
  chatTitle: string | null,
  projectId: string,
  t?: TFunction,
): string => {
  const title = chatTitle?.trim() || 'Untitled chat'
  const exportedAt = new Date().toISOString()

  const lines: string[] = []
  lines.push(`# ${title}`)
  lines.push(`Project: ${projectId} · Exported: ${exportedAt}`)

  for (const message of messages) {
    const body =
      message.role === 'assistant'
        ? renderAssistantMessage(message, t)
        : renderUserMessage(message)

    if (!body) continue

    lines.push('')
    lines.push('---')
    lines.push('')
    lines.push(message.role === 'user' ? '## You' : '## Assistant')
    lines.push('')
    lines.push(body)
  }

  return `${lines.join('\n')}\n`
}

const slugifyForFilename = (input: string): string =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

export const getChatExportFilename = (
  chatTitle: string | null,
  chatId: string | null,
): string => {
  if (chatTitle) {
    const slug = slugifyForFilename(chatTitle)
    if (slug) return `${slug}.md`
  }
  if (chatId) return `swetrix-chat-${chatId}.md`
  return 'swetrix-chat.md'
}

export const downloadMarkdown = (markdown: string, filename: string) => {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
