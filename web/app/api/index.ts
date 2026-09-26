interface AIChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AIStreamCallbacks {
  onText: (chunk: string) => void
  onToolCall?: (toolName: string, args: unknown) => void
  onToolResult?: (toolName: string, result: unknown) => void
  onReasoning?: (chunk: string) => void
  onFollowUps?: (suggestions: string[]) => void
  onComplete: () => void
  onError: (error: Error) => void
}

export const askAI = async (
  pid: string,
  messages: AIChatMessage[],
  timezone: string,
  callbacks: AIStreamCallbacks,
  signal?: AbortSignal,
) => {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pid, messages, timezone }),
      signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.message ||
          errorData.error ||
          `HTTP error! status: ${response.status}`,
      )
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (signal?.aborted) return
        if (done) {
          throw new Error('The response was interrupted. Please try again.')
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const parsed = JSON.parse(line.slice(6))
          if (parsed.type === 'text') {
            callbacks.onText(parsed.content)
          } else if (parsed.type === 'tool-call') {
            callbacks.onToolCall?.(parsed.toolName, parsed.args)
          } else if (parsed.type === 'tool-result') {
            callbacks.onToolResult?.(parsed.toolName, parsed.result)
          } else if (parsed.type === 'reasoning') {
            callbacks.onReasoning?.(parsed.content)
          } else if (
            parsed.type === 'followUps' &&
            Array.isArray(parsed.data)
          ) {
            callbacks.onFollowUps?.(
              parsed.data.filter(
                (item: unknown): item is string => typeof item === 'string',
              ),
            )
          } else if (parsed.type === 'error') {
            throw new Error(parsed.content)
          } else if (parsed.type === 'done') {
            callbacks.onComplete()
            return
          }
        }
      }
    } finally {
      await reader.cancel().catch(() => {})
      reader.releaseLock()
    }
  } catch (error) {
    if (signal?.aborted || (error as Error).name === 'AbortError') {
      return
    }
    callbacks.onError(error as Error)
  }
}
