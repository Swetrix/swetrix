// Feature Flags API
export interface TargetingRule {
  column: string
  filter: string
  isExclusive: boolean
}

export interface ProjectFeatureFlag {
  id: string
  key: string
  description: string | null
  flagType: 'boolean' | 'rollout'
  rolloutPercentage: number
  targetingRules: TargetingRule[] | null
  enabled: boolean
  pid: string
  created: string
}

// Experiments (A/B Testing) API

type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed'

type ExposureTrigger = 'feature_flag' | 'custom_event'

type MultipleVariantHandling = 'exclude' | 'first_exposure'

type FeatureFlagMode = 'create' | 'link'

interface ExperimentVariant {
  id?: string
  name: string
  key: string
  description?: string | null
  rolloutPercentage: number
  isControl: boolean
}

export interface Experiment {
  id: string
  name: string
  description: string | null
  hypothesis: string | null
  status: ExperimentStatus
  // Exposure criteria
  exposureTrigger: ExposureTrigger
  customEventName: string | null
  multipleVariantHandling: MultipleVariantHandling
  filterInternalUsers: boolean
  // Feature flag configuration
  featureFlagMode: FeatureFlagMode
  featureFlagKey: string | null
  startedAt: string | null
  endedAt: string | null
  pid: string
  goalId: string | null
  featureFlagId: string | null
  variants: ExperimentVariant[]
  created: string
}

export const DEFAULT_EXPERIMENTS_TAKE = 20

// AI Chat API with SSE streaming (proxied through /api/ai)
interface AIChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AIStreamCallbacks {
  onText: (chunk: string) => void
  onToolCall?: (toolName: string, args: unknown) => void
  onToolResult?: (toolName: string, result: unknown) => void
  onReasoning?: (chunk: string) => void
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
      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        callbacks.onComplete()
        break
      }

      buffer += decoder.decode(value, { stream: true })

      // Process SSE events
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'text') {
              callbacks.onText(parsed.content)
            } else if (parsed.type === 'tool-call') {
              callbacks.onToolCall?.(parsed.toolName, parsed.args)
            } else if (parsed.type === 'tool-result') {
              callbacks.onToolResult?.(parsed.toolName, parsed.result)
            } else if (parsed.type === 'reasoning') {
              callbacks.onReasoning?.(parsed.content)
            } else if (parsed.type === 'error') {
              callbacks.onError(new Error(parsed.content))
            } else if (parsed.type === 'done') {
              callbacks.onComplete()
              return
            }
          } catch {
            // Ignore parsing errors for incomplete JSON
          }
        }
      }
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      callbacks.onComplete()
      return
    }
    callbacks.onError(error as Error)
  }
}

// AI Chat History API
export interface AIChatSummary {
  id: string
  name: string | null
  created: string
  updated: string
}
